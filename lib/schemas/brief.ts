import { z } from 'zod'

/**
 * The product brief: the Report's product vision and user story map.
 *
 * The vision statement follows Geoffrey Moore's template ("For … who …, the …
 * is a … that …. Unlike …, it …"). The story map follows Jeff Patton's: a
 * backbone of user activities, the tasks under each, and stories under each
 * task, sliced into releases that match the Plan's versions.
 *
 * Story IDs (US-1, US-2, …) are numbered here, in map order, so the SRS can
 * trace its requirements back to them.
 */

const text = z.string().trim().min(1)
const optionalText = z.string().trim().catch('')
const texts = z
  .array(z.unknown())
  .catch([])
  .transform((items) => items.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim()))
const listOf = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) => items.flatMap((raw) => {
      const parsed = item.safeParse(raw)
      return parsed.success ? [parsed.data as z.infer<T>] : []
    }))

/** Stories the plan doesn't schedule go in this release. */
export const LATER = 'Later'

const story = z.object({ title: text, release: optionalText })
const task = z.object({ name: text, stories: listOf(story).refine((l) => l.length > 0) })
const activity = z.object({ name: text, tasks: listOf(task).refine((l) => l.length > 0) })

export const briefSchema = z.object({
  vision: z.object({
    targetUsers: text,
    need: text,
    productName: text,
    category: text,
    benefit: text,
    alternative: text,
    difference: text,
  }),
  problem: text,
  personas: listOf(z.object({ name: text, description: text, goals: texts })),
  goals: texts.refine((l) => l.length > 0, 'No goals'),
  nonGoals: texts,
  successMeasures: listOf(z.object({ measure: text, target: optionalText })),
  activities: listOf(activity).refine((l) => l.length > 0, 'No story map'),
})

export type Brief = z.infer<typeof briefSchema>

export interface MappedStory {
  id: string
  title: string
  release: string
  activity: string
  task: string
}

/** Every story with its ID, in map order: activity by activity, task by task. */
export function numberStories(brief: Brief): MappedStory[] {
  let n = 0
  return brief.activities.flatMap((a) =>
    a.tasks.flatMap((t) => t.stories.map((s) => ({ id: `US-${++n}`, title: s.title, release: s.release || LATER, activity: a.name, task: t.name })))
  )
}

/**
 * Put every story in one of the plan's releases. A release the model named
 * that the plan doesn't have becomes "Later", so the map's slices always
 * match the Plan's versions.
 */
export function alignReleases(brief: Brief, releases: string[]): Brief {
  const known = new Map(releases.map((r) => [r.toLowerCase(), r]))
  const fit = (release: string) => {
    const key = release.toLowerCase()
    // "v0.1 (MVP)" matches the plan's "v0.1", and the other way round
    for (const [k, original] of known) if (key === k || key.startsWith(`${k} `) || k.startsWith(`${key} `)) return original
    return LATER
  }
  return {
    ...brief,
    activities: brief.activities.map((a) => ({
      ...a,
      tasks: a.tasks.map((t) => ({ ...t, stories: t.stories.map((s) => ({ ...s, release: fit(s.release) })) })),
    })),
  }
}

/** The releases in map order: the plan's versions, then "Later" if anything landed there. */
export function releaseOrder(brief: Brief, planReleases: string[]): string[] {
  const used = new Set(numberStories(brief).map((s) => s.release))
  return [...planReleases.filter((r) => used.has(r)), ...(used.has(LATER) ? [LATER] : [])]
}
