import type { z } from 'zod'
import { DEFAULT_BUDGET_MS, NoModelAvailableError, forget, generateJsonWithMeta, type Tier } from '@/lib/llm'

/**
 * Ask for JSON, check it against a schema, and retry once on a different model
 * if the reply is incomplete (the same model tends to repeat itself). Both
 * attempts share one deadline, so the whole thing fits in a Vercel function.
 */

export type Checked<T> = { ok: true; data: T } | { ok: false; busy: boolean; outOfTime: boolean }

export const AI_BUSY = 'The AI models have reached their limits for now. Please try again in a little while.'
export const AI_SLOW = 'The AI took too long to answer this time. Please try again; it is usually quicker the second time.'

/** The message for a failed Checked, or `fallback` when the reply was just unusable. */
export const failureMessage = (result: { busy: boolean; outOfTime: boolean }, fallback: string) =>
  result.outOfTime ? AI_SLOW : result.busy ? AI_BUSY : fallback

export async function generateChecked<S extends z.ZodTypeAny>(
  prompt: string,
  schema: S,
  {
    label,
    fresh = false,
    tier = 'quality',
    deadline = Date.now() + DEFAULT_BUDGET_MS,
  }: { label: string; fresh?: boolean; tier?: Tier; deadline?: number }
): Promise<Checked<z.infer<S>>> {
  const tried: string[] = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: unknown
    try {
      // "Write it again" skips the cached reply
      const reply = await generateJsonWithMeta<unknown>(prompt, { tier, exclude: tried, cache: attempt === 1 && !fresh, deadline })
      raw = reply.data
      tried.push(reply.model.replace(' (cached)', ''))
    } catch (error) {
      console.error(`[${label}] Model call failed:`, error instanceof Error ? error.message : error)
      const busy = error instanceof NoModelAvailableError
      return { ok: false, busy, outOfTime: busy && error.outOfTime }
    }
    const parsed = schema.safeParse(raw)
    if (parsed.success) return { ok: true, data: parsed.data }
    console.warn(`[${label}] Incomplete reply (attempt ${attempt}):`, parsed.error.issues.map((i) => i.path.join('.') || i.message).join(', '))
    forget(prompt, tier)
  }
  return { ok: false, busy: false, outOfTime: false }
}
