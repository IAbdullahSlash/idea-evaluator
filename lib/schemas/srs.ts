import { z } from 'zod'

/**
 * The software requirements specification (SRS) the Hand-off page offers,
 * shaped after IEEE 830. The model fills in the content; the outline and
 * numbering come from the template in lib/documents/srs.ts.
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

export const PRIORITIES = ['Must', 'Should', 'Could'] as const

export const srsSchema = z.object({
  purpose: text,
  productScope: text,
  definitions: listOf(z.object({ term: text, meaning: text })),
  productPerspective: optionalText,
  userClasses: listOf(z.object({ name: text, description: text })).refine((l) => l.length > 0, 'No user classes'),
  operatingEnvironment: optionalText,
  constraints: texts,
  assumptions: texts,
  functionalRequirements: listOf(
    z.object({
      title: text,
      description: text,
      priority: z.enum(PRIORITIES).catch('Should'),
      acceptanceCriteria: texts,
    })
  ).refine((l) => l.length > 0, 'No functional requirements'),
  nonFunctionalRequirements: listOf(z.object({ category: text, requirement: text })),
  externalInterfaces: listOf(z.object({ kind: text, description: text })),
})

export type Srs = z.infer<typeof srsSchema>
