import { type NextRequest, NextResponse } from "next/server"
import { failureMessage, generateChecked } from "@/lib/llm-checked"
import { clip, evaluationContext, list } from "@/lib/evaluation-context"
import { overallSchema } from "@/lib/schemas/overall"

/**
 * POST { idea, …context, snapshot, summary, plan, existingSolutions, takeaway }
 * → "Idea as an overall": the idea judged against four questions (the problem
 * and who cares, building and scaling it, living with it, measuring success).
 */

const OVERALL_FAILED = "The overall view of the idea couldn't be written this time. Please try again."

// Vercel stops a function at this many seconds; every AI request is budgeted to finish inside it
export const maxDuration = 60

/** What the plan decided, as prompt text: time, team, stack, versions, and running costs. */
function planContext(plan: any): string {
  if (!plan) return ""
  const rows = (value: unknown, max: number) => (Array.isArray(value) ? value : []).slice(0, max)
  const phases = rows(plan.projectMilestones, 8).map((m: any) => `${clip(m?.phase, 60)} (${clip(m?.duration, 30)})`)
  const team = rows(plan.teamRoles, 6).map((r: any) => `${clip(r?.role, 60)} (${clip(r?.fteEstimate, 20)}): ${list(r?.skills, 6).join(", ")}`)
  const stack = rows(plan.techRoadmap, 8).map((t: any) => `${clip(t?.category, 40)}: ${list(t?.technologies, 6).join(", ")}`)
  const costs = rows(plan.costEstimates, 6).flatMap((c: any) => rows(c?.items, 6).map((i: any) => `${clip(i?.name, 60)} ${clip(i?.cost, 30)}`))
  const versions = rows(plan.versionMilestones, 4).map((v: any) => `${clip(v?.version, 30)} (${clip(v?.timeline, 30)})`)
  return (
    `\nThe plan:\n` +
    (plan.timelineFit ? `Fit with the time available: ${clip(plan.timelineFit.verdict, 20)}. ${clip(plan.timelineFit.note, 300)}\n` : "") +
    (phases.length ? `Phases: ${phases.join("; ")}\n` : "") +
    (team.length ? `Team: ${team.join("; ")}\n` : "") +
    (stack.length ? `Stack: ${stack.join("; ")}\n` : "") +
    (versions.length ? `Versions: ${versions.join("; ")}\n` : "") +
    (costs.length ? `Running costs: ${costs.join("; ")}\n` : "") +
    (list(plan.scopeCuts).length ? `Left out of the plan: ${list(plan.scopeCuts).join("; ")}\n` : "")
  )
}

function overallPrompt(body: any): string {
  const alternatives = (Array.isArray(body.existingSolutions) ? body.existingSolutions : [])
    .slice(0, 5)
    .map((s: any) => `- ${clip(s?.name, 60)}: ${clip(s?.description, 200)}${clip(s?.difference, 200) ? ` (this idea differs: ${clip(s.difference, 200)})` : ""}`)
    .join("\n")

  return `You are a senior software consultant writing "Idea as an overall": a frank judgement of the project idea below against the four questions every software project has to answer before it is worth building. It is for the developer and anyone deciding whether the project goes ahead.

${evaluationContext(body)}${planContext(body.plan)}${alternatives ? `\nExisting alternatives:\n${alternatives}\n` : ""}${clip(body.takeaway, 600) ? `What people are saying online: ${clip(body.takeaway, 600)}\n` : ""}
The four questions:
1. What specific problem does this solve, and who actually cares? Many projects fail because they build a technically perfect solution to a problem nobody has. State the pain point explicitly instead of assuming it: is it urgent, frequent, or expensive enough that people are already looking for workarounds? And how does it differ from the alternatives: is it a 10x improvement, or does it have an advantage others can't easily copy? If not, adoption will stall.
2. Can it realistically be built and scaled? Architecture: can this builder deliver the availability, data security, and long-term maintainability it needs? Resources: do they have, or can they get, the skills, framework expertise, and development environment to finish within the time available, with some margin?
3. Can it be sustainably maintained and lived with? Software is never done at launch, and running it often costs more than building it. Operations: can the builder support the infrastructure, keep performance up as usage grows, and manage technical debt? Dependencies: for each third-party service or library it leans on, what happens if that provider cuts support, changes its pricing, or changes direction, and what is the way out?
4. How will success be defined and measured? Business measures: the hard numbers that show it is paying off (efficiency, growth, cost saved, users won). User value: what success means for the people using it, and the signs that they are struggling or giving up.

Respond with ONLY valid JSON in exactly this shape:
{
  "verdict": "one paragraph: the idea as a whole, whether it is worth building, and the main reason",
  "problem": {
    "answer": "Yes" | "Partly" | "No",
    "summary": "2-3 sentences answering the question directly",
    "painPoint": "the specific pain, stated explicitly: what goes wrong today, for whom, and what it costs them",
    "whoCares": "who has this problem, who would pay or switch, and the evidence for it",
    "urgency": "how urgent, frequent, or expensive the problem is, and the workarounds people use today",
    "differentiation": "how this differs from the alternatives, whether that is a 10x improvement or a lasting advantage, and what happens to adoption if not"
  },
  "build": {
    "answer": "Yes" | "Partly" | "No",
    "summary": "2-3 sentences answering the question directly",
    "architecture": "whether the planned architecture gives the availability, data security, and maintainability this product needs, and where it is weakest",
    "resources": "whether the builder has or can get the skills, framework expertise, and environment, and whether the timeline has margin",
    "gaps": ["a specific gap to close before or during the build, and how"]
  },
  "sustain": {
    "answer": "Yes" | "Partly" | "No",
    "summary": "2-3 sentences answering the question directly",
    "operations": "the infrastructure to run, how performance holds up as usage grows, where technical debt will build up, and the ongoing cost and effort",
    "dependencies": [ { "name": "a third-party service, API, or framework it relies on", "usedFor": "what it does here", "risk": "what happens if support is cut, prices rise, or the roadmap changes", "exit": "the way out: an alternative, or how to keep it replaceable" } ]
  },
  "success": {
    "answer": "Yes" | "Partly" | "No",
    "summary": "2-3 sentences answering the question directly",
    "businessMetrics": [ { "metric": "a hard measure of return", "target": "the number that means success, and by when" } ],
    "userValue": "what success looks like for the people using it: the workflows they complete, how quickly, and with how little friction",
    "warningSigns": ["a measurable sign users are struggling or abandoning it"]
  }
}

Rules:
- "answer" is the honest short answer to each question: "Yes", "Partly", or "No". Don't soften a weak idea.
- Each text field is 2 to 4 sentences, specific to this idea, with numbers wherever the information above gives them.
- gaps: 2 to 4. dependencies: 2 to 5, the ones the plan's stack and costs actually rely on. businessMetrics: 3 or 4, each with a number. warningSigns: 2 or 3.
- Base everything on the information above. Where something is unknown, say what would need to be found out instead of inventing it.`
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

  const result = await generateChecked(overallPrompt(body), overallSchema, { label: "overall", fresh: Boolean(body.fresh) })
  if (!result.ok) return NextResponse.json({ error: failureMessage(result, OVERALL_FAILED) }, { status: result.busy ? 503 : 502 })
  return NextResponse.json(result.data)
}
