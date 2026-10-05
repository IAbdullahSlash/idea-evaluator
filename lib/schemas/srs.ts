import { z } from 'zod'

/**
 * The software requirements specification (SRS) the Hand-off page offers, on
 * the IEEE 830 / ISO/IEC/IEEE 29148 outline. The model writes it in three
 * parts at once (overview, features, quality and data); the outline,
 * requirement numbering (FR-n, NFR-n), and traceability are done here and in
 * lib/documents/srs.ts, so they can't drift from what the model cited.
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

// ── part 1: introduction, overall description, interfaces ──────────────

export const srsOverviewSchema = z.object({
  purpose: text,
  inScope: texts.refine((l) => l.length > 0, 'No scope'),
  outOfScope: texts,
  definitions: listOf(z.object({ term: text, meaning: text })),
  productPerspective: text,
  productFunctions: texts,
  userClasses: listOf(
    z.object({ name: text, description: text, frequency: optionalText, expertise: optionalText })
  ).refine((l) => l.length > 0, 'No user classes'),
  operatingEnvironment: text,
  designConstraints: texts,
  userDocumentation: texts,
  assumptions: texts,
  dependencies: texts,
  uiPrinciples: texts,
  hardwareInterfaces: texts,
  softwareInterfaces: listOf(z.object({ name: text, purpose: text })),
  communicationsInterfaces: texts,
})

// ── part 2: system features and functional requirements ────────────────

export const srsFeaturesSchema = z.object({
  features: listOf(
    z.object({
      name: text,
      description: text,
      priority: z.enum(PRIORITIES).catch('Should'),
      stimulusResponse: listOf(z.object({ stimulus: text, response: text })),
      requirements: listOf(
        z.object({
          statement: text,
          acceptance: texts,
          stories: texts,
          screens: texts,
        })
      ).refine((l) => l.length > 0, 'A feature without requirements'),
    })
  ).refine((l) => l.length > 0, 'No features'),
})

// ── part 3: non-functional requirements, data, open questions ──────────

export const NFR_GROUPS = ['performance', 'safety', 'security', 'quality', 'businessRules'] as const
const nfr = listOf(z.object({ statement: text, measure: optionalText, attribute: optionalText }))

export const srsQualitySchema = z.object({
  performance: nfr,
  safety: nfr,
  security: nfr,
  quality: nfr,
  businessRules: nfr,
  entities: listOf(
    z.object({
      name: text,
      description: optionalText,
      fields: listOf(z.object({ name: text, type: optionalText, notes: optionalText })),
      relations: texts,
    })
  ),
  retention: texts,
  openQuestions: listOf(z.object({ question: text, why: optionalText })),
})

export const srsSchema = z.object({
  overview: srsOverviewSchema,
  features: srsFeaturesSchema.shape.features,
  quality: srsQualitySchema,
})

export type Srs = z.infer<typeof srsSchema>

export interface NumberedRequirement {
  id: string
  feature: string
  priority: (typeof PRIORITIES)[number]
  statement: string
  acceptance: string[]
  stories: string[]
  screens: string[]
}

/** Every functional requirement with its ID (FR-1, FR-2, …), feature by feature. */
export function numberRequirements(srs: Srs): NumberedRequirement[] {
  let n = 0
  return srs.features.flatMap((f) =>
    f.requirements.map((r) => ({ id: `FR-${++n}`, feature: f.name, priority: f.priority, ...r }))
  )
}

/**
 * Keep only story IDs that exist in the story map and screen names that exist
 * in the wireframes, so the traceability table only points at real things.
 */
export function tidySrs(srs: Srs, storyIds: string[], screenNames: string[]): Srs {
  const stories = new Set(storyIds)
  const screens = new Map(screenNames.map((n) => [n.toLowerCase(), n]))
  return {
    ...srs,
    features: srs.features.map((f) => ({
      ...f,
      requirements: f.requirements.map((r) => ({
        ...r,
        stories: r.stories.filter((id) => stories.has(id)),
        screens: r.screens.flatMap((n) => {
          const name = screens.get(n.toLowerCase())
          return name ? [name] : []
        }),
      })),
    })),
  }
}
