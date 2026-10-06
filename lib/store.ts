import { randomBytes } from 'node:crypto'
import { Redis } from '@upstash/redis'

/**
 * Saved evaluations, in Upstash Redis (added to the Vercel project from the
 * Marketplace, which sets KV_REST_API_URL and KV_REST_API_TOKEN).
 *
 * An evaluation is stored in the same shape the analysis page keeps in the
 * browser, so the page can show one made anywhere (on the website or through
 * the MCP tools in someone's own AI) without converting it.
 */

const TTL_SECONDS = 90 * 24 * 60 * 60
const key = (id: string) => `evaluation:${id}`

let client: Redis | null = null
function redis(): Redis {
  if (client) return client
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Evaluation storage is not configured (KV_REST_API_URL / KV_REST_API_TOKEN).')
  client = new Redis({ url, token })
  return client
}

export interface StoredEvaluation {
  id: string
  createdAt: string
  updatedAt: string
  /** Where it was made: on the website, or in someone's AI through the MCP tools. */
  source: 'mcp' | 'web'
  formData: { idea: string; projectType: string; domain: string; experience: string; timeline: string }
  clarifications: { question: string; answer: string }[]
  /** The Snapshot (stage 1), as the page keeps it. */
  analysis?: Record<string, unknown>
  /** Summary (stage2), Plan (stage3/stage4), Hand-off documents (stage5). */
  stageData: Record<string, unknown>
  /** Raw market search results, so a Summary can only cite real sources. Not shown. */
  research?: unknown
  /** SRS parts saved so far over MCP, until all three are in. Not shown. */
  srsDraft?: unknown
}

/** An unguessable 12-character ID: anyone with the link can view, nobody can find one by guessing. */
export const newEvaluationId = () => randomBytes(9).toString('base64url')

export async function saveEvaluation(evaluation: StoredEvaluation): Promise<void> {
  await redis().set(key(evaluation.id), { ...evaluation, updatedAt: new Date().toISOString() }, { ex: TTL_SECONDS })
}

export async function getEvaluation(id: string): Promise<StoredEvaluation | null> {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null
  return (await redis().get<StoredEvaluation>(key(id))) ?? null
}

/** Read, change, and save an evaluation. Returns null if it doesn't exist (or has expired). */
export async function updateEvaluation(
  id: string,
  change: (e: StoredEvaluation) => StoredEvaluation | Promise<StoredEvaluation>
): Promise<StoredEvaluation | null> {
  const current = await getEvaluation(id)
  if (!current) return null
  const next = await change(current)
  await saveEvaluation(next)
  return next
}
