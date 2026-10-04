import { createHash } from 'node:crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * One router for every model call.
 *
 * Calls go to a tier ("quality" for the stage write-ups, "light" for small jobs).
 * Each tier is a chain of models; each Gemini model is tried with every key
 * before moving on, and Groq is the last resort. Google counts free quota per
 * project and per model, so walking the chain spreads load across allowances.
 *
 * When a slot (model + key) is rate-limited or overloaded it is parked until
 * the time Google asks for, so later requests skip it instead of failing on it.
 * Successful replies are cached for a day, so the same prompt never pays twice.
 */

export type Tier = 'quality' | 'light'

interface Slot {
  id: string
  provider: 'gemini' | 'groq'
  model: string
  key: string
  keyIndex: number
}

// Gemini models in order of preference, then the Groq model used as the last resort.
// Groq's free tier allows 1,000 requests a day but only 8,000 tokens a minute.
const CHAINS: Record<Tier, { gemini: string[]; groq: string }> = {
  // gemini-2.5-flash was removed: it now answers 404 (retired) on these keys
  quality: { gemini: ['gemini-3.5-flash', 'gemini-3.8-flash'], groq: 'openai/gpt-oss-120b' },
  light: { gemini: ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'], groq: 'openai/gpt-oss-20b' },
}
const TEMPERATURE: Record<Tier, number> = { quality: 0.4, light: 0.2 }
const TIMEOUT_MS = 45_000
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX = 200

// ── keys ────────────────────────────────────────────────────────────────

/** Every Gemini key: GEMINI_API_KEY, GEMINI_API_KEY_2, _3, … and a GEMINI_API_KEYS list. */
function geminiKeys(): string[] {
  const numbered = Object.keys(process.env)
    .map((name) => ({ name, n: name === 'GEMINI_API_KEY' ? 1 : Number(name.match(/^GEMINI_API_KEY_(\d+)$/)?.[1]) }))
    .filter((k) => Number.isFinite(k.n))
    .sort((a, b) => a.n - b.n)
    .map((k) => process.env[k.name])
  const listed = (process.env.GEMINI_API_KEYS || '').split(',')
  return Array.from(new Set([...numbered, ...listed].map((k) => (k || '').trim()).filter(Boolean)))
}

function slotsFor(tier: Tier): Slot[] {
  const keys = geminiKeys()
  const slots: Slot[] = []
  for (const model of CHAINS[tier].gemini) {
    keys.forEach((key, keyIndex) =>
      slots.push({ id: `gemini:${model}:${keyIndex}`, provider: 'gemini', model, key, keyIndex })
    )
  }
  const groq = process.env.GROQ_API_KEY?.trim()
  const groqModel = CHAINS[tier].groq
  if (groq) slots.push({ id: `groq:${groqModel}:0`, provider: 'groq', model: groqModel, key: groq, keyIndex: 0 })
  return slots
}

// ── cooldowns ───────────────────────────────────────────────────────────

// Keyed by slot id, or by model (`model:<provider>:<model>`) when the problem is
// the model itself and every key would hit it too.
const parkedUntil = new Map<string, { until: number; reason: string }>()
const modelId = (slot: Slot) => `model:${slot.provider}:${slot.model}`

function parkedEntry(id: string) {
  const p = parkedUntil.get(id)
  if (p && p.until <= Date.now()) {
    parkedUntil.delete(id)
    return undefined
  }
  return p
}

const parkedFor = (slot: Slot) => parkedEntry(modelId(slot)) ?? parkedEntry(slot.id)
const isParked = (slot: Slot) => Boolean(parkedFor(slot))

/** Decide how long to skip a slot from the error it returned. */
function park(slot: Slot, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  const status = Number((message.match(/\[(\d{3})/) || message.match(/status (\d{3})/) || [])[1])
  const retrySeconds = Number((message.match(/retry in ([\d.]+)s/i) || message.match(/"retryDelay":"(\d+)s"/) || [])[1])

  let ms: number
  let reason: string
  // Quotas and rejected keys belong to one key; overload and a missing model
  // affect the model on every key, so the other keys are skipped too.
  let wholeModel = false
  if (status === 429 || /quota|rate limit/i.test(message)) {
    const daily = /PerDay/i.test(message)
    ms = Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : daily ? 60 * 60 * 1000 : 60 * 1000
    reason = daily ? 'daily quota used' : 'rate limited'
  } else if (status === 503 || /overloaded|high demand|unavailable/i.test(message)) {
    ms = 30 * 1000
    reason = 'overloaded'
    wholeModel = true
  } else if (status === 404 || /not found|is not supported/i.test(message)) {
    ms = 60 * 60 * 1000
    reason = 'model not available'
    wholeModel = true
  } else if (/timeout|aborted/i.test(message)) {
    ms = 15 * 1000
    reason = 'timed out'
    wholeModel = true
  } else if (status === 401 || status === 403 || /API key not valid|permission/i.test(message)) {
    ms = 60 * 60 * 1000
    reason = 'key rejected'
  } else {
    return // a bad prompt or reply: not the slot's fault
  }
  parkedUntil.set(wholeModel ? modelId(slot) : slot.id, { until: Date.now() + ms, reason })
}

// ── providers ───────────────────────────────────────────────────────────

async function callGemini(slot: Slot, prompt: string, temperature: number): Promise<string> {
  const model = new GoogleGenerativeAI(slot.key).getGenerativeModel(
    { model: slot.model, generationConfig: { responseMimeType: 'application/json', temperature } },
    { timeout: TIMEOUT_MS }
  )
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function callGroq(slot: Slot, prompt: string, temperature: number): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${slot.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: slot.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Groq request failed: status ${response.status} ${body.slice(0, 300)}`)
  }
  const data = await response.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

// ── cache ───────────────────────────────────────────────────────────────

const cache = new Map<string, { value: unknown; model: string; expires: number }>()
const cacheKey = (tier: Tier, prompt: string) => createHash('sha256').update(`${tier}\n${prompt}`).digest('hex')

function remember(key: string, value: unknown, model: string): void {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, { value, model, expires: Date.now() + CACHE_TTL_MS })
}

/** Drop a cached reply, e.g. one that failed validation. */
export function forget(prompt: string, tier: Tier): void {
  cache.delete(cacheKey(tier, prompt))
}

// ── public API ──────────────────────────────────────────────────────────

export interface GenerateOptions {
  tier?: Tier
  /** Models to skip, e.g. the one whose reply just failed validation. */
  exclude?: string[]
  /** Set false to always ask a model (retries after a bad reply). */
  cache?: boolean
}

export class NoModelAvailableError extends Error {
  constructor(public readonly reasons: string[]) {
    super('No AI model is available right now. Please try again later.')
  }
}

/** Ask the tier's models for JSON, walking the chain until one answers. */
export async function generateJsonWithMeta<T = unknown>(
  prompt: string,
  { tier = 'quality', exclude = [], cache: useCache = true }: GenerateOptions = {}
): Promise<{ data: T; model: string }> {
  const key = cacheKey(tier, prompt)
  const cached = useCache ? cache.get(key) : undefined
  if (cached && cached.expires > Date.now()) return { data: cached.value as T, model: `${cached.model} (cached)` }

  const reasons: string[] = []
  for (const slot of slotsFor(tier)) {
    if (exclude.includes(slot.model)) continue
    if (isParked(slot)) continue
    try {
      const text =
        slot.provider === 'gemini'
          ? await callGemini(slot, prompt, TEMPERATURE[tier])
          : await callGroq(slot, prompt, TEMPERATURE[tier])
      const data = JSON.parse(text) as T
      console.info(`[llm] ${tier} answered by ${slot.model} (key ${slot.keyIndex + 1})`)
      remember(key, data, slot.model)
      return { data, model: slot.model }
    } catch (error) {
      park(slot, error)
      const why = error instanceof Error ? error.message.split('\n')[0].slice(0, 160) : String(error)
      reasons.push(`${slot.id}: ${why}`)
      console.warn(`[llm] ${slot.id} failed: ${why}`)
    }
  }
  throw new NoModelAvailableError(reasons)
}

export async function generateJson<T = unknown>(prompt: string, options?: GenerateOptions): Promise<T> {
  return (await generateJsonWithMeta<T>(prompt, options)).data
}

/** For the dev status page: which slots are available or parked, never the keys. */
export function routerStatus() {
  const geminiKeyNames = Object.keys(process.env).filter((n) => /^GEMINI_API_KEY(_\d+)?$|^GEMINI_API_KEYS$/.test(n))
  return {
    geminiKeys: geminiKeys().length,
    geminiKeyVariables: geminiKeyNames.sort(),
    groqKey: Boolean(process.env.GROQ_API_KEY?.trim()),
    tiers: tierStatus(),
  }
}

function tierStatus() {
  return (['quality', 'light'] as Tier[]).map((tier) => ({
    tier,
    slots: slotsFor(tier).map((slot) => {
      const parked = parkedFor(slot)
      return {
        slot: slot.id,
        status: parked ? 'parked' : 'available',
        reason: parked?.reason,
        until: parked ? new Date(parked.until).toISOString() : undefined,
      }
    }),
  }))
}
