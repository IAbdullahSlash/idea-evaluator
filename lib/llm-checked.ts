import type { z } from 'zod'
import { NoModelAvailableError, forget, generateJsonWithMeta, type Tier } from '@/lib/llm'

/**
 * Ask for JSON, check it against a schema, and retry once on a different model
 * if the reply is incomplete (the same model tends to repeat itself).
 */

export type Checked<T> = { ok: true; data: T } | { ok: false; busy: boolean }

export async function generateChecked<S extends z.ZodTypeAny>(
  prompt: string,
  schema: S,
  { label, fresh = false, tier = 'quality' }: { label: string; fresh?: boolean; tier?: Tier }
): Promise<Checked<z.infer<S>>> {
  const tried: string[] = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: unknown
    try {
      // "Write it again" skips the cached reply
      const reply = await generateJsonWithMeta<unknown>(prompt, { tier, exclude: tried, cache: attempt === 1 && !fresh })
      raw = reply.data
      tried.push(reply.model.replace(' (cached)', ''))
    } catch (error) {
      console.error(`[${label}] Model call failed:`, error instanceof Error ? error.message : error)
      return { ok: false, busy: error instanceof NoModelAvailableError }
    }
    const parsed = schema.safeParse(raw)
    if (parsed.success) return { ok: true, data: parsed.data }
    console.warn(`[${label}] Incomplete reply (attempt ${attempt}):`, parsed.error.issues.map((i) => i.path.join('.') || i.message).join(', '))
    forget(prompt, tier)
  }
  return { ok: false, busy: false }
}
