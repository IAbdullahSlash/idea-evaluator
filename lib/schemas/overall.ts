import { z } from 'zod'

/**
 * "Idea as an overall": the idea judged against the four questions every
 * software project has to answer before it is worth building.
 *
 *   1 What specific problem does this solve, and who actually cares?
 *   2 Can it realistically be built and scaled?
 *   3 Can it be sustainably maintained and lived with?
 *   4 How will success be defined and measured?
 *
 * Each question gets a short answer (Yes, Partly, or No), a reasoned
 * write-up of its two sides, the evidence behind the answer, the
 * assumptions still to check, and what would strengthen it, all drawn from
 * the evaluation, the research, and the plan. The steps to take next close
 * the document.
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

export const ANSWERS = ['Yes', 'Partly', 'No'] as const
export type Answer = (typeof ANSWERS)[number]

// "partly", "Mostly", "not yet" … → one of the three answers, so a near miss isn't thrown away
const answer = z.preprocess((v) => {
  const t = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (t.startsWith('yes')) return 'Yes'
  if (t.startsWith('no')) return 'No'
  return t ? 'Partly' : v
}, z.enum(ANSWERS))

// Every question also carries the evidence behind its answer, the assumptions still to check, and
// what would strengthen it. They may be missing from an overall saved by an earlier version.
const backing = {
  evidence: texts,
  assumptions: listOf(z.object({ assumption: text, check: optionalText })),
  improve: texts,
}

export const overallSchema = z.object({
  /** The idea as a whole: worth building or not, and the main reasons. */
  verdict: text,
  problem: z.object({
    answer,
    summary: text,
    painPoint: text,
    whoCares: text,
    urgency: text,
    differentiation: text,
    ...backing,
  }),
  build: z.object({
    answer,
    summary: text,
    architecture: text,
    resources: text,
    gaps: texts,
    ...backing,
  }),
  sustain: z.object({
    answer,
    summary: text,
    operations: text,
    dependencies: listOf(z.object({ name: text, usedFor: optionalText, risk: optionalText, exit: optionalText })),
    ...backing,
  }),
  success: z.object({
    answer,
    summary: text,
    businessMetrics: listOf(z.object({ metric: text, target: optionalText })).refine((l) => l.length > 0, 'No business measures'),
    userValue: text,
    warningSigns: texts,
    ...backing,
  }),
  /** What to do next, in order. */
  nextSteps: listOf(z.object({ step: text, why: optionalText, effort: optionalText })),
})

export type Overall = z.infer<typeof overallSchema>

/** The four questions, in order, as the page and the document ask them. */
export const QUESTIONS = [
  { id: 'problem', question: 'What specific problem does this solve, and who actually cares?' },
  { id: 'build', question: 'Can it realistically be built and scaled?' },
  { id: 'sustain', question: 'Can it be sustainably maintained and lived with?' },
  { id: 'success', question: 'How will success be defined and measured?' },
] as const satisfies readonly { id: keyof Omit<Overall, 'verdict'>; question: string }[]
