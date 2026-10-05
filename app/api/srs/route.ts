import { type NextRequest, NextResponse } from "next/server"
import { NoModelAvailableError, forget, generateJsonWithMeta } from "@/lib/llm"
import { clip, evaluationContext, list } from "@/lib/evaluation-context"
import { PRIORITIES, srsSchema } from "@/lib/schemas/srs"

/**
 * POST { idea, …context, snapshot, summary, plan } → a software requirements
 * specification (IEEE 830 style) as structured JSON. The page turns it into
 * Markdown. It builds on the evaluation and the plan, so the requirements
 * match what the plan says will be built.
 */

const SRS_FAILED = "The requirements document couldn't be written this time. Please try again."
const AI_BUSY = "The AI models have reached their limits for now. Please try again in a little while."

/** What the plan commits to: the first version's features, what's cut, and the security work. */
function planContext(plan: any): string {
  if (!plan) return ""
  const versions = (Array.isArray(plan.versionMilestones) ? plan.versionMilestones : [])
    .slice(0, 3)
    .map((v: any) => `- ${clip(v?.version, 30)}: ${list(v?.features).join("; ")}`)
    .join("\n")
  const security = (Array.isArray(plan.securityConsiderations) ? plan.securityConsiderations : [])
    .slice(0, 5)
    .map((c: any) => `- ${clip(c?.area, 80)}: ${list(c?.requirements, 5).join("; ")}${list(c?.compliance).length ? ` (${list(c?.compliance).join(", ")})` : ""}`)
    .join("\n")
  const stack = (Array.isArray(plan.techRoadmap) ? plan.techRoadmap : [])
    .map((t: any) => list(t?.technologies).join(", "))
    .filter(Boolean)
    .join("; ")
  return (
    (versions ? `\nPlanned versions:\n${versions}\n` : "") +
    (list(plan.scopeCuts).length ? `Left out of this plan: ${list(plan.scopeCuts).join("; ")}\n` : "") +
    (stack ? `Planned technologies: ${stack}\n` : "") +
    (security ? `Security work in the plan:\n${security}\n` : "")
  )
}

function srsPrompt(body: any): string {
  return `You are a requirements engineer. Write a software requirements specification (SRS) in the style of IEEE 830 for the project below. It is for the developer building it and anyone reviewing the project, such as a supervisor.

${evaluationContext(body)}${planContext(body.plan)}
Respond with ONLY valid JSON in exactly this shape:
{
  "purpose": "2-3 sentences: what this document specifies and who it is for",
  "productScope": "2-4 sentences: what the product does, for whom, and the benefit; what is out of scope",
  "definitions": [ { "term": "string", "meaning": "string" } ],
  "productPerspective": "how the product relates to other systems or products (standalone, replaces X, integrates with Y)",
  "userClasses": [ { "name": "string", "description": "who they are and what they need from the product" } ],
  "operatingEnvironment": "platforms, browsers or devices, and hosting",
  "constraints": ["string"],
  "assumptions": ["string"],
  "functionalRequirements": [ { "title": "short name", "description": "The system shall …", "priority": ${PRIORITIES.map((p) => `"${p}"`).join(" | ")}, "acceptanceCriteria": ["a testable condition"] } ],
  "nonFunctionalRequirements": [ { "category": "Performance | Security | Usability | Reliability | Privacy | Accessibility | Maintainability", "requirement": "a measurable statement" } ],
  "externalInterfaces": [ { "kind": "User interface | API | Hardware | Third-party service", "description": "string" } ]
}

Rules:
- Functional requirements: 6 to 12, each a single "The system shall …" statement with 1 to 3 testable acceptance criteria. Must = the must-have features; Should = other features the planned versions include; Could = nice-to-haves and anything the plan leaves out.
- Non-functional requirements: 4 to 8, measurable where possible (numbers, limits, standards). Include the plan's security work.
- Definitions: only terms a reviewer might not know; empty list if none.
- Base everything on the information above. Don't invent features, users, or integrations the evaluation doesn't support.`
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (typeof body?.idea !== "string" || !body.idea.trim()) {
    return NextResponse.json({ error: "The idea is required" }, { status: 400 })
  }

  const prompt = srsPrompt(body)
  const tried: string[] = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: unknown
    try {
      const reply = await generateJsonWithMeta<unknown>(prompt, { tier: "quality", exclude: tried, cache: attempt === 1 })
      raw = reply.data
      tried.push(reply.model.replace(" (cached)", ""))
    } catch (error) {
      console.error("[srs] Model call failed:", error instanceof Error ? error.message : error)
      const busy = error instanceof NoModelAvailableError
      return NextResponse.json({ error: busy ? AI_BUSY : SRS_FAILED }, { status: busy ? 503 : 502 })
    }

    const parsed = srsSchema.safeParse(raw)
    if (parsed.success) return NextResponse.json(parsed.data)
    console.warn(`[srs] Incomplete document (attempt ${attempt}):`, parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", "))
    forget(prompt, "quality")
  }
  return NextResponse.json({ error: SRS_FAILED }, { status: 502 })
}
