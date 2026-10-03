import { z } from 'zod'

/**
 * The Snapshot (stage 1) contract, shared by the API and the page.
 * The overall mark is the average of the six marking-scheme criteria,
 * the same ones the landing page lists, so every score can be explained.
 */

export const CRITERIA = [
  { id: 'realProblem', name: 'A real problem', asks: 'Does it solve a clear problem that someone actually has?' },
  { id: 'worthSolving', name: 'Worth solving', asks: 'Is the pain big enough that people would change what they do today?' },
  { id: 'alreadyDone', name: 'Not already done', asks: 'Is there room, or does a free tool already do this well?' },
  { id: 'somethingNew', name: 'Something new', asks: 'What does it do that the alternatives don’t?' },
  { id: 'withinReach', name: 'Within reach', asks: 'Can this developer build it with their experience and time?' },
  { id: 'someoneWantsIt', name: 'Someone wants it', asks: 'Are there users, and is there demand for it?' },
] as const

export type CriterionId = (typeof CRITERIA)[number]['id']

export const RECOMMENDATIONS = ['Build', 'Narrow it down', 'Rethink', 'Drop'] as const
export type Recommendation = (typeof RECOMMENDATIONS)[number]

const mark = z.object({
  score: z.coerce.number().min(1).max(10),
  reason: z.string().trim().min(1),
})

const text = z.string().trim().min(1)

export const snapshotSchema = z.object({
  rubric: z.object({
    realProblem: mark,
    worthSolving: mark,
    alreadyDone: mark,
    somethingNew: mark,
    withinReach: mark,
    someoneWantsIt: mark,
  }),
  recommendation: z.enum(RECOMMENDATIONS),
  successProbability: z.coerce.number().min(0).max(100),
  difficultyLevel: text,
  detectedDomain: text,
  requiredExperience: text,
  honestAiFeedback: text,
  targetUsersMarketFit: z.object({
    primaryUsers: text,
    marketDemand: text,
    userValidation: text,
  }),
  aiVerdict: text,
  shortTitle: text,
  // Search terms for the Summary stage, so GitHub and Hacker News can start straight away
  searchQueries: z
    .object({ github: z.string().trim().optional(), discussions: z.string().trim().optional() })
    .optional(),
  selfQuestions: z
    .array(z.object({ question: text, why: z.string().trim().default('') }))
    .default([]),
})

export type Snapshot = z.infer<typeof snapshotSchema>

/** The overall mark out of 10: the average of the six criteria, rounded to a whole mark. */
export function overallScore(rubric: Snapshot['rubric']): number {
  const scores = CRITERIA.map((c) => rubric[c.id].score)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
