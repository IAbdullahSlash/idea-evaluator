import { getEvaluation, saveEvaluation, type StoredEvaluation } from '@/lib/store'

/** Small helpers shared by the MCP stage and document tools. */

export const ok = (text: string) => ({ content: [{ type: 'text' as const, text }] })
export const fail = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: true })
export type Failure = ReturnType<typeof fail>

const NOT_FOUND = 'That evaluationId is unknown or has expired. Call start_evaluation to begin again.'

export const clip = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t)

/** Load an evaluation for a tool, or the reply explaining why it can't continue. */
export async function load(id: string): Promise<StoredEvaluation | Failure> {
  try {
    return (await getEvaluation(id)) ?? fail(NOT_FOUND)
  } catch (error) {
    console.error('[mcp] Storage failed:', error)
    return fail('The Idea Evaluator could not reach its storage. Please try again in a moment.')
  }
}

export const isFail = (x: unknown): x is Failure => Boolean(x && typeof x === 'object' && 'isError' in x)

/** Save an evaluation; null on success, or the reply explaining the failure. */
export async function store(e: StoredEvaluation): Promise<Failure | null> {
  try {
    await saveEvaluation(e)
    return null
  } catch (error) {
    console.error('[mcp] Storage failed:', error)
    return fail('The Idea Evaluator could not save this. Please call the tool again in a moment.')
  }
}

/** The list of problems from a schema check, for the model to fix. */
export const issues = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
  error.issues.map((i) => (i.path.length ? i.path.join('.') : i.message)).join(', ')
