import { type NextRequest, NextResponse } from "next/server"
import { NoModelAvailableError, forget, generateJsonWithMeta } from "@/lib/llm"
import { clip, evaluationContext, list } from "@/lib/evaluation-context"
import { LATER, alignReleases, briefSchema } from "@/lib/schemas/brief"

/**
 * POST { idea, …context, snapshot, summary, plan, existingSolutions } → the
 * product brief: vision, personas, goals, success measures, and a user story
 * map whose releases are the Plan's versions.
 */

const BRIEF_FAILED = "The product vision and story map couldn't be written this time. Please try again."
const AI_BUSY = "The AI models have reached their limits for now. Please try again in a little while."

/** The plan's versions, which become the story map's releases. */
const planReleases = (plan: any): string[] =>
  (Array.isArray(plan?.versionMilestones) ? plan.versionMilestones : [])
    .map((v: any) => clip(v?.version, 30))
    .filter(Boolean)
    .slice(0, 4)

function briefPrompt(body: any): string {
  const releases = planReleases(body.plan)
  const versions = (Array.isArray(body.plan?.versionMilestones) ? body.plan.versionMilestones : [])
    .slice(0, 4)
    .map((v: any) => `- ${clip(v?.version, 30)} (${clip(v?.timeline, 30)}): ${list(v?.features).join("; ")}`)
    .join("\n")
  const alternatives = (Array.isArray(body.existingSolutions) ? body.existingSolutions : [])
    .slice(0, 5)
    .map((s: any) => clip(s?.name, 60))
    .filter(Boolean)

  return `You are a product manager writing the product brief for the project below: its vision and a user story map. It is for the developer building it and anyone reviewing the project.

${evaluationContext(body)}${versions ? `\nPlanned versions:\n${versions}\n` : ""}${list(body.plan?.scopeCuts).length ? `Left out of the plan: ${list(body.plan.scopeCuts).join("; ")}\n` : ""}${alternatives.length ? `Existing alternatives: ${alternatives.join(", ")}\n` : ""}
Respond with ONLY valid JSON in exactly this shape:
{
  "vision": {
    "targetUsers": "who it is for (the 'For …' part)",
    "need": "their need or problem (the 'who …' part)",
    "productName": "a short name for the product",
    "category": "the kind of product, e.g. 'web app for gym owners'",
    "benefit": "the key benefit",
    "alternative": "the main alternative people use today",
    "difference": "how this product is different from that alternative"
  },
  "problem": "2-3 sentences: the problem, who has it, and what it costs them today",
  "personas": [ { "name": "a role, e.g. 'Gym owner'", "description": "one sentence", "goals": ["what they want from the product"] } ],
  "goals": ["a product goal"],
  "nonGoals": ["something this product deliberately won't do"],
  "successMeasures": [ { "measure": "what to measure", "target": "the number that means success, e.g. '20 gyms in 3 months'" } ],
  "activities": [
    { "name": "a user activity, e.g. 'Check members in'", "tasks": [
      { "name": "a task within it, e.g. 'Scan a member's code'", "stories": [
        { "title": "As a <persona>, I want <something> so that <benefit>", "release": ${[...releases, LATER].map((r) => `"${r}"`).join(" | ")} }
      ] }
    ] }
  ]
}

Rules:
- The vision fields must read as one sentence: "For <targetUsers> who <need>, <productName> is a <category> that <benefit>. Unlike <alternative>, it <difference>."
- Personas: 2 or 3, the people who use the product.
- Goals: 3 to 5. Non-goals: 2 to 4, including what the plan leaves out. Success measures: 3 or 4, each with a number.
- Story map: 3 to 5 activities in the order a user goes through them, each with 1 to 3 tasks, each with 1 to 3 stories. No more than 10 tasks and 24 stories in all.
- Release: the planned version that delivers the story${releases.length ? ` (one of ${releases.join(", ")})` : ""}, or "${LATER}" for stories no version includes, such as features the plan leaves out. Every must-have feature appears in the first release.
- Base everything on the information above. Don't invent features the evaluation doesn't support.`
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

  const prompt = briefPrompt(body)
  const tried: string[] = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: unknown
    try {
      const reply = await generateJsonWithMeta<unknown>(prompt, { tier: "quality", exclude: tried, cache: attempt === 1 && !body.fresh })
      raw = reply.data
      tried.push(reply.model.replace(" (cached)", ""))
    } catch (error) {
      console.error("[brief] Model call failed:", error instanceof Error ? error.message : error)
      const busy = error instanceof NoModelAvailableError
      return NextResponse.json({ error: busy ? AI_BUSY : BRIEF_FAILED }, { status: busy ? 503 : 502 })
    }

    const parsed = briefSchema.safeParse(raw)
    if (parsed.success) return NextResponse.json(alignReleases(parsed.data, planReleases(body.plan)))
    console.warn(`[brief] Incomplete brief (attempt ${attempt}):`, parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", "))
    forget(prompt, "quality")
  }
  return NextResponse.json({ error: BRIEF_FAILED }, { status: 502 })
}
