import { failureMessage, generateChecked } from "@/lib/llm-checked"
import { planSchema, TIMELINE_FIT } from "@/lib/schemas/plan"
import { checkTimeline } from "@/lib/evaluation/plan"
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

// Vercel stops a function at this many seconds; every AI request is budgeted to finish inside it
export const maxDuration = 60

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

  // "Make a new plan" skips the cached reply
  const result = await generateChecked(planPrompt(body), planSchema, { label: "plan", fresh: Boolean(body.fresh) })
  if (!result.ok) return NextResponse.json({ error: failureMessage(result, PLAN_FAILED) }, { status: result.busy ? 503 : 502 })
  return NextResponse.json(checkTimeline(result.data, body.timeline))
}
