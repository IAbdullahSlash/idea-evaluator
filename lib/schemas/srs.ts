import { z } from 'zod'

/**
 * The software requirements specification (SRS) the Hand-off page offers,
 * shaped after IEEE 830. The model fills in the content; the numbering and
 * the Markdown layout are done here so every document looks the same.
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

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n')

/** The SRS as a Markdown document. Requirement IDs are numbered here: FR-1…, NFR-1…. */
export function srsToMarkdown(srs: Srs, title: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  const out: string[] = [
    `# Software Requirements Specification: ${title}`,
    '',
    `Version 0.1 · ${day} · Drafted by The Idea Evaluator from the evaluation; review and edit before use.`,
    '',
    '## 1. Introduction',
    '',
    '### 1.1 Purpose',
    '',
    srs.purpose,
    '',
    '### 1.2 Product scope',
    '',
    srs.productScope,
  ]
  if (srs.definitions.length) {
    out.push('', '### 1.3 Definitions', '', '| Term | Meaning |', '| --- | --- |')
    for (const d of srs.definitions) out.push(`| ${cell(d.term)} | ${cell(d.meaning)} |`)
  }

  out.push('', '## 2. Overall description')
  if (srs.productPerspective) out.push('', '### 2.1 Product perspective', '', srs.productPerspective)
  out.push('', '### 2.2 User classes', '')
  for (const u of srs.userClasses) out.push(`- **${u.name}:** ${u.description}`)
  if (srs.operatingEnvironment) out.push('', '### 2.3 Operating environment', '', srs.operatingEnvironment)
  if (srs.constraints.length) out.push('', '### 2.4 Constraints', '', bullets(srs.constraints))
  if (srs.assumptions.length) out.push('', '### 2.5 Assumptions and dependencies', '', bullets(srs.assumptions))

  out.push('', '## 3. Functional requirements')
  srs.functionalRequirements.forEach((r, i) => {
    out.push('', `### FR-${i + 1}: ${r.title}`, '', `**Priority:** ${r.priority}`, '', r.description)
    if (r.acceptanceCriteria.length) out.push('', '**Acceptance criteria:**', '', bullets(r.acceptanceCriteria))
  })

  if (srs.nonFunctionalRequirements.length) {
    out.push('', '## 4. Non-functional requirements', '', '| ID | Category | Requirement |', '| --- | --- | --- |')
    srs.nonFunctionalRequirements.forEach((r, i) => out.push(`| NFR-${i + 1} | ${cell(r.category)} | ${cell(r.requirement)} |`))
  }
  if (srs.externalInterfaces.length) {
    out.push('', `## ${srs.nonFunctionalRequirements.length ? 5 : 4}. External interfaces`, '')
    for (const x of srs.externalInterfaces) out.push(`- **${x.kind}:** ${x.description}`)
  }
  return out.join('\n') + '\n'
}

// A table cell can't contain a pipe or a line break
const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')
