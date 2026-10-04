import { z } from 'zod'

/**
 * The Plan (stage 3) contract, shared by the API and the page.
 *
 * Lists are lenient: an item the model got wrong is dropped instead of failing
 * the whole plan, and a missing list becomes empty. Only the parts the page
 * can't do without (phases, technology layers, versions) must be present.
 */

const text = z.string().trim().min(1)
const optionalText = z.string().trim().catch('')
const texts = z
  .array(z.unknown())
  .catch([])
  .transform((items) => items.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim()))

/** A list whose invalid items are dropped rather than failing the list. */
const listOf = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) => items.flatMap((raw) => {
      const parsed = item.safeParse(raw)
      return parsed.success ? [parsed.data as z.infer<T>] : []
    }))

export const TIMELINE_FIT = ['fits', 'tight', 'too much'] as const

const milestone = z.object({
  phase: text,
  duration: text,
  deliverables: texts,
  dependencies: texts,
})

const teamRole = z.object({
  role: text,
  fteEstimate: z.coerce.number().min(0).max(10).catch(0),
  skills: texts,
  description: optionalText,
})

const techLayer = z.object({
  category: text,
  technologies: texts,
  timeline: optionalText,
  trl: z.coerce.number().int().min(1).max(9).catch(9),
})

const version = z.object({
  version: text,
  timeline: optionalText,
  description: optionalText,
  features: texts,
})

const security = z.object({
  area: text,
  requirements: texts,
  compliance: texts,
})

const cost = z.object({
  category: text,
  items: listOf(z.object({ name: text, cost: text, justification: optionalText })),
  total: text,
})

export const planSchema = z.object({
  timelineFit: z
    .object({ verdict: z.enum(TIMELINE_FIT), note: optionalText })
    .optional()
    .catch(undefined),
  projectMilestones: listOf(milestone).refine((l) => l.length > 0, 'No phases'),
  teamRoles: listOf(teamRole),
  sdlcMapping: optionalText,
  qaApproach: optionalText,
  techRoadmap: listOf(techLayer).refine((l) => l.length > 0, 'No technology layers'),
  versionMilestones: listOf(version).refine((l) => l.length > 0, 'No versions'),
  securityConsiderations: listOf(security),
  costEstimates: listOf(cost),
})

export type Plan = z.infer<typeof planSchema>
