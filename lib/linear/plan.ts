import { z } from 'zod'
import { durationWeeks } from '@/lib/plan-math'

/**
 * An evaluation's plan as a Linear roadmap:
 *
 *   initiative      the product, with the verdict and the plan's fit
 *   └ project       one per version (v0.1, v0.2, …), dated on the timeline
 *     ├ milestone   each phase of the plan, in the version it finishes in
 *     │ └ issue     each of the phase's deliverables, due when the phase ends
 *     └ issue       each user story in that release (US-n)
 *   issues          stories the plan leaves for later, in the team's backlog
 *
 * Dates run from the start date the browser sends (the builder's today): the
 * phases one after another, and each version ending at the week its timeline
 * names. This module only builds the structure; ./client sends it.
 */

const text = (max: number) => z.string().trim().max(max)

/** What the browser sends: the parts of a saved evaluation the roadmap is built from. */
export const linearPlanInput = z.object({
  title: text(160).min(1),
  idea: text(2000),
  verdict: text(3000).optional(),
  link: z.string().url().max(300).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phases: z
    .array(z.object({ phase: text(160), duration: text(60), deliverables: z.array(text(300)).max(10) }))
    .min(1)
    .max(10),
  versions: z.array(z.object({ version: text(60), timeline: text(80), description: text(600), features: z.array(text(200)).max(15) })).max(5),
  stories: z.array(z.object({ id: text(10), title: text(400), release: text(60), activity: text(160) })).max(40),
})

export type LinearPlanInput = z.infer<typeof linearPlanInput>

export interface PlannedIssue {
  title: string
  description: string
  dueDate?: string
  kind: 'deliverable' | 'story'
}

export interface PlannedProject {
  name: string
  description: string
  content: string
  startDate: string
  targetDate: string
  milestones: { name: string; description: string; targetDate: string; issues: PlannedIssue[] }[]
  issues: PlannedIssue[]
}

export interface LinearPlan {
  initiative: { name: string; description: string; content: string; targetDate: string }
  projects: PlannedProject[]
  /** Stories no version delivers. */
  later: PlannedIssue[]
}

const DAY = 24 * 60 * 60 * 1000
const addWeeks = (start: string, weeks: number) => new Date(Date.parse(`${start}T00:00:00Z`) + Math.round(weeks * 7) * DAY).toISOString().slice(0, 10)
const short = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t)

/** "Week 5", "Weeks 3-5", "Month 2", "by week 7", or a duration like "5 weeks" → the week it ends. */
export function versionEndWeek(timeline: string): number | null {
  const week = timeline.match(/\b(?:weeks?|wk)\s*(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?/i)
  if (week) return Number(week[2] ?? week[1])
  const month = timeline.match(/\bmonths?\s*(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?/i)
  if (month) return Number(month[2] ?? month[1]) * (52 / 12)
  return durationWeeks(timeline)
}

export function buildLinearPlan(input: LinearPlanInput): LinearPlan {
  const start = input.startDate
  // Each phase ends after the ones before it; a duration that can't be read counts as two weeks
  let elapsed = 0
  const phases = input.phases.map((p) => {
    elapsed += durationWeeks(p.duration) ?? 2
    return { ...p, endWeek: elapsed }
  })
  const totalWeeks = elapsed

  // Versions end at the week their timeline names, in order, never before the one before; the last covers the whole plan
  const named = input.versions.length ? input.versions : [{ version: 'Build', timeline: '', description: `The whole plan for ${input.title}.`, features: [] }]
  let previousEnd = 0
  const versions = named.map((v, i) => {
    const read = versionEndWeek(v.timeline)
    const fallback = (totalWeeks * (i + 1)) / named.length
    const endWeek = i === named.length - 1 ? Math.max(read ?? 0, totalWeeks, previousEnd) : Math.max(read ?? fallback, previousEnd)
    const startWeek = previousEnd
    previousEnd = endWeek
    return { ...v, startWeek, endWeek }
  })

  // A phase belongs to the first version that ends on or after it does
  const versionOf = (endWeek: number) => versions.findIndex((v) => v.endWeek >= endWeek - 1e-9)
  const footer = input.link ? `\n\n---\nFrom [The Idea Evaluator](${input.link}).` : ''

  const projects: PlannedProject[] = versions.map((v, i) => {
    const own = phases.filter((p) => {
      const at = versionOf(p.endWeek)
      return (at === -1 ? versions.length - 1 : at) === i
    })
    const stories = input.stories.filter((s) => s.release === v.version)
    return {
      name: `${input.title} · ${v.version}`,
      description: short(v.description || v.version, 250),
      content:
        `${v.description}\n\n` +
        (v.features.length ? `**Ships:**\n${v.features.map((f) => `- ${f}`).join('\n')}\n\n` : '') +
        (own.length ? `**Phases:** ${own.map((p) => `${p.phase} (${p.duration})`).join(', ')}` : '') +
        footer,
      startDate: addWeeks(start, v.startWeek),
      targetDate: addWeeks(start, v.endWeek),
      milestones: own.map((p) => ({
        name: short(p.phase, 80),
        description: `${p.duration}. ${p.deliverables.length} deliverable${p.deliverables.length === 1 ? '' : 's'}.`,
        targetDate: addWeeks(start, p.endWeek),
        issues: p.deliverables.map((d) => ({
          title: short(d, 250),
          description: `Deliverable of the phase **${p.phase}** (${p.duration}) in ${v.version}.${footer}`,
          dueDate: addWeeks(start, p.endWeek),
          kind: 'deliverable' as const,
        })),
      })),
      issues: stories.map((s) => ({
        title: short(`${s.id} ${s.title}`, 250),
        description: `User story ${s.id}, under the activity **${s.activity}**, planned for ${v.version}.${footer}`,
        dueDate: addWeeks(start, v.endWeek),
        kind: 'story' as const,
      })),
    }
  })

  const known = new Set(versions.map((v) => v.version))
  const later = input.stories
    .filter((s) => !known.has(s.release))
    .map((s) => ({
      title: short(`${s.id} ${s.title}`, 250),
      description: `User story ${s.id}, under the activity **${s.activity}**. No version of the plan delivers it yet.${footer}`,
      kind: 'story' as const,
    }))

  return {
    initiative: {
      name: short(input.title, 80),
      description: short(input.idea, 250),
      content: `${input.verdict ?? input.idea}\n\n**Plan:** ${phases.length} phases over ${Math.round(totalWeeks * 10) / 10} weeks, released as ${versions.map((v) => v.version).join(', ')}.${footer}`,
      targetDate: addWeeks(start, versions[versions.length - 1].endWeek),
    },
    projects,
    later,
  }
}

/** How many issues the roadmap creates, for the free plan's 250-issue limit. */
export const issueCount = (plan: LinearPlan) =>
  plan.later.length + plan.projects.reduce((n, p) => n + p.issues.length + p.milestones.reduce((m, ms) => m + ms.issues.length, 0), 0)
