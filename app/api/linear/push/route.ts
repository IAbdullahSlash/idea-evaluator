import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE, LinearError, pushPlan } from "@/lib/linear/client"
import { buildLinearPlan, issueCount, linearPlanInput } from "@/lib/linear/plan"
import { checkLinearPush } from "@/lib/rate-limit"

/**
 * POST { teamId, plan } → builds the plan as a roadmap in the connected Linear
 * workspace: an initiative, a project per version with the phases as
 * milestones, and the deliverables and user stories as issues.
 */

// Vercel stops a function at this many seconds; a roadmap takes a few dozen calls to Linear
export const maxDuration = 60

const body = z.object({ teamId: z.string().min(1).max(100), plan: linearPlanInput })

// Linear's free plan holds 250 issues in all, so one plan shouldn't take more than a fraction of it
const MAX_ISSUES = 120

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE.token)?.value
  if (!token) return NextResponse.json({ error: "Connect Linear first." }, { status: 401 })

  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "The plan couldn’t be read. Reload the page and try again." }, { status: 400 })

  const wait = await checkLinearPush(request)
  if (wait !== null) {
    return NextResponse.json({ error: `You have sent several plans to Linear this hour. Try again in about ${Math.ceil(wait / 60)} minutes.` }, { status: 429 })
  }

  const plan = buildLinearPlan(parsed.data.plan)
  if (issueCount(plan) > MAX_ISSUES) return NextResponse.json({ error: "This plan has too many items to send to Linear at once." }, { status: 400 })

  try {
    return NextResponse.json(await pushPlan(token, parsed.data.teamId, plan))
  } catch (error) {
    const status = error instanceof LinearError ? error.status : 500
    console.error("[linear] Push failed:", error instanceof Error ? error.message : error)
    const response = NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status })
    if (status === 401) response.cookies.set(COOKIE.token, "", { path: "/api/linear", maxAge: 0 })
    return response
  }
}
