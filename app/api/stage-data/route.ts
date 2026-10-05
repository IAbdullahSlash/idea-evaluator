import { NoModelAvailableError, forget, generateJsonWithMeta } from "@/lib/llm"
import { planSchema, TIMELINE_FIT, type Plan } from "@/lib/schemas/plan"
import { availableWeeks, formatWeeks, totalWeeks } from "@/lib/plan-math"
import { evaluationContext } from "@/lib/evaluation-context"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  switch (body?.stage) {
    case 3:
      return makePlan(body)
    default:
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
  }
}

// ── Plan (stage 3) ──────────────────────────────────────────────────────

const PLAN_FAILED = "The plan couldn't be written this time. Please try again."
const AI_BUSY = "The AI models have reached their limits for now. Please try again in a little while."

function planPrompt(body: any): string {
  return `You are a senior engineer helping a developer plan a project they will build themselves, usually alone or in a small student team. Plan for that person, not for a funded company.

${evaluationContext(body)}
Write the plan as JSON with exactly this shape:
{
  "timelineFit": { "verdict": ${TIMELINE_FIT.map((v) => `"${v}"`).join(" | ")}, "note": "one sentence: does the must-have scope fit the time the builder has, and if not, what to cut" },
  "scopeCuts": ["a feature from the must-have or nice-to-have list that this plan leaves out, copied word for word"],
  "projectMilestones": [ { "phase": "short name", "duration": "in days or weeks, e.g. 1.5 weeks", "deliverables": ["a concrete thing that exists at the end"], "dependencies": ["name of an earlier phase"] } ],
  "teamRoles": [ { "role": "string", "fteEstimate": 0.5, "skills": ["string"], "description": "what this role does on this project" } ],
  "sdlcMapping": "how to work, in 2-4 sentences",
  "qaApproach": "how to test and release, in 2-4 sentences",
  "techRoadmap": [ { "category": "Infrastructure | Dev Stack | Integrations | Testing | Scalability", "technologies": ["string"], "timeline": "when in the plan", "trl": 9 } ],
  "versionMilestones": [ { "version": "v0.1", "timeline": "string", "description": "string", "features": ["string"] } ],
  "securityConsiderations": [ { "area": "string", "requirements": ["string"], "compliance": ["string"] } ],
  "costEstimates": [ { "category": "string", "items": [ { "name": "string", "cost": "$12/year", "justification": "string" } ], "total": "string" } ]
}

Rules:
- Phases: 3 to 5, named for what gets built (not "Project Initiation"), with 2 to 5 concrete deliverables each. Each duration is a number of working days (5 a week) or weeks. Together they must add up to no more than the time the builder has. If the scope can't fit, plan the part that does and say so in timelineFit.
- scopeCuts: every listed feature this plan does not build, copied exactly as written above. Empty if everything is built.
- Team: the roles the work needs. fteEstimate is the share of one full-time person; the total should be what this builder or a small team can realistically give. No managers or stakeholder roles for a solo or student project.
- Way of working and testing: lightweight, specific to this project, and suited to the builder's experience.
- Technology: use the agreed stack where one is given and only add what the plan needs. trl (1-9) is how proven each technology is in production; 9 is proven.
- Versions: 2 or 3. The first is the smallest thing users can try and matches the must-have features.
- Security: only areas that apply to this project. Compliance only for standards that really apply; otherwise an empty list.
- Costs: money the builder actually pays (hosting, domain, paid APIs, app store fees, tools). The builder does the work, so no salaries. Prefer free tiers. Write each cost as "$<amount>/month", "$<amount>/year" or "$<amount> once" ("$0/month" when free) and put when a paid tier starts in the justification.
- Be specific to this idea. Don't invent facts about the builder.

Respond with ONLY valid JSON.`
}

/** Ask for the plan, check it, and retry once on a different model if it comes back incomplete. */
async function makePlan(body: any) {
  if (typeof body?.idea !== "string" || !body.idea.trim()) {
    return NextResponse.json({ error: "The idea is required" }, { status: 400 })
  }

  const prompt = planPrompt(body)
  const tried: string[] = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: unknown
    try {
      // "Make a new plan" skips the cached reply
      const reply = await generateJsonWithMeta<unknown>(prompt, { tier: "quality", exclude: tried, cache: attempt === 1 && !body.fresh })
      raw = reply.data
      tried.push(reply.model.replace(" (cached)", ""))
    } catch (error) {
      console.error("[plan] Model call failed:", error instanceof Error ? error.message : error)
      const busy = error instanceof NoModelAvailableError
      return NextResponse.json({ error: busy ? AI_BUSY : PLAN_FAILED }, { status: busy ? 503 : 502 })
    }

    const parsed = planSchema.safeParse(raw)
    if (parsed.success) return NextResponse.json(checkTimeline(parsed.data, body.timeline))
    console.warn(
      `[plan] Incomplete plan (attempt ${attempt}):`,
      parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", ")
    )
    forget(prompt, "quality")
  }
  return NextResponse.json({ error: PLAN_FAILED }, { status: 502 })
}

/**
 * The model's "fits" is checked against the phases' own durations: a plan
 * whose phases add up to more than the time the builder has doesn't fit.
 */
function checkTimeline(plan: Plan, timeline: unknown): Plan {
  const needed = totalWeeks(plan.projectMilestones.map((m) => m.duration))
  const available = availableWeeks(typeof timeline === "string" ? timeline : undefined)
  if (needed === null || available === null || needed <= available) return plan
  console.warn(`[plan] Phases need ${needed.toFixed(1)} weeks; the builder has ${available.toFixed(1)}`)
  return {
    ...plan,
    timelineFit: {
      verdict: "too much",
      note: `The phases add up to ${formatWeeks(needed)}, more than the ${timeline} you have. Cut scope or allow more time.`,
    },
  }
}
