import type { Plan } from '@/lib/schemas/plan'
import { availableWeeks, formatWeeks, totalWeeks } from '@/lib/plan-math'

/**
 * The model's "fits" is checked against the phases' own durations: a plan
 * whose phases add up to more than the time the builder has doesn't fit.
 */
export function checkTimeline(plan: Plan, timeline: unknown): Plan {
  const needed = totalWeeks(plan.projectMilestones.map((m) => m.duration))
  const available = availableWeeks(typeof timeline === 'string' ? timeline : undefined)
  if (needed === null || available === null || needed <= available) return plan
  console.warn(`[plan] Phases need ${needed.toFixed(1)} weeks; the builder has ${available.toFixed(1)}`)
  return {
    ...plan,
    timelineFit: {
      verdict: 'too much',
      note: `The phases add up to ${formatWeeks(needed)}, more than the ${timeline} you have. Cut scope or allow more time.`,
    },
  }
}

/** The plan's two halves, as the Plan page keeps them: the roadmap (phases, team, process) and the tech plan. */
export const splitPlan = (plan: Plan) => ({
  stage3: {
    timelineFit: plan.timelineFit,
    scopeCuts: plan.scopeCuts,
    projectMilestones: plan.projectMilestones,
    teamRoles: plan.teamRoles,
    sdlcMapping: plan.sdlcMapping,
    qaApproach: plan.qaApproach,
  },
  stage4: {
    techRoadmap: plan.techRoadmap,
    versionMilestones: plan.versionMilestones,
    securityConsiderations: plan.securityConsiderations,
    costEstimates: plan.costEstimates,
  },
})
