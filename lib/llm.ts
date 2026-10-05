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
 *
 * Every request has a deadline (by default 50 s, inside Vercel's 60 s function
 * limit) that all its attempts share. Within it, a momentary overload gets one
 * quick retry on the same model, and a per-minute rate limit is waited out when
 * the provider asks for only a few seconds, instead of falling down the chain.
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
  // gemini-2.5-flash-lite was removed: it now answers 404 (retired) on these keys
  light: { gemini: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'], groq: 'openai/gpt-oss-20b' },
}
const TEMPERATURE: Record<Tier, number> = { quality: 0.4, light: 0.2 }
const TIMEOUT_MS = 45_000
// The whole request, all attempts included; routes run on Vercel with maxDuration = 60
export const DEFAULT_BUDGET_MS = 50_000
// Not worth starting an attempt with less time than this left
const MIN_ATTEMPT_MS = 6_000
// A 503 "high demand" usually clears in a moment: one retry on the same model after this
const OVERLOAD_RETRY_MS = 1_500
// A per-minute rate limit asking us to wait at most this long is waited out (if the deadline allows)
const MAX_RATE_WAIT_MS = 30_000
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

type FailureReason = 'daily quota used' | 'rate limited' | 'overloaded' | 'model not available' | 'timed out' | 'key rejected' | 'bad reply'

interface Failure {
  reason: FailureReason
  /** How long to skip the slot (0: not the slot's fault). */
  parkMs: number
  /** Overload, a missing model, and timeouts affect the model on every key. */
  wholeModel: boolean
  /** How long the provider asked us to wait, when it said. */
  retryAfterMs?: number
}

/** What went wrong, from the error a slot returned. */
function classify(error: unknown): Failure {
  const message = error instanceof Error ? error.message : String(error)
  const status = Number((message.match(/\[(\d{3})/) || message.match(/status (\d{3})/) || [])[1])
  // Gemini: "retry in 12.3s" / "retryDelay":"12s"; Groq: "Please try again in 2.5s" or "in 1m3.2s"
  const groqWait = message.match(/try again in (?:(\d+)m)?([\d.]+)s/i)
  const retrySeconds = groqWait
    ? Number(groqWait[1] ?? 0) * 60 + Number(groqWait[2])
    : Number((message.match(/retry in ([\d.]+)s/i) || message.match(/"retryDelay":"(\d+)s"/) || [])[1])
  const retryAfterMs = Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : undefined

  if (status === 429 || /quota|rate limit/i.test(message)) {
    const daily = /PerDay|per day|RPD|TPD/i.test(message)
    return {
      reason: daily ? 'daily quota used' : 'rate limited',
      parkMs: retryAfterMs ?? (daily ? 60 * 60 * 1000 : 60 * 1000),
      wholeModel: false,
      retryAfterMs: daily ? undefined : retryAfterMs,
    }
  }
  // Short: a request's whole budget is 50 s, and overload usually passes quickly
  if (status === 503 || /overloaded|high demand|unavailable/i.test(message)) return { reason: 'overloaded', parkMs: 15_000, wholeModel: true }
  if (status === 404 || /not found|is not supported/i.test(message)) return { reason: 'model not available', parkMs: 60 * 60 * 1000, wholeModel: true }
  if (/timeout|aborted/i.test(message)) return { reason: 'timed out', parkMs: 15_000, wholeModel: true }
  if (status === 401 || status === 403 || /API key not valid|permission/i.test(message)) return { reason: 'key rejected', parkMs: 60 * 60 * 1000, wholeModel: false }
  return { reason: 'bad reply', parkMs: 0, wholeModel: false } // a bad prompt or reply: not the slot's fault
}

function park(slot: Slot, failure: Failure): void {
  if (failure.parkMs <= 0) return
  parkedUntil.set(failure.wholeModel ? modelId(slot) : slot.id, { until: Date.now() + failure.parkMs, reason: failure.reason })
}

// ── stats (per server instance, for /api/llm-status) ─────────────────────

interface SlotStats {
  attempts: number
  ok: number
  failures: Partial<Record<FailureReason, number>>
  totalMs: number
}
const stats = new Map<string, SlotStats>()

function record(slot: Slot, ms: number, failure?: Failure): void {
  const s = stats.get(slot.id) ?? { attempts: 0, ok: 0, failures: {}, totalMs: 0 }
  s.attempts++
  s.totalMs += ms
  if (failure) s.failures[failure.reason] = (s.failures[failure.reason] ?? 0) + 1
  else s.ok++
  stats.set(slot.id, s)
}

// ── replies ─────────────────────────────────────────────────────────────

/**
 * Parse a JSON reply. Models sometimes add a stray character or a second
 * object after the answer; rather than throw the whole answer away, the
 * first complete JSON object is used.
 */
export function parseReply(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    const start = text.indexOf('{')
    if (start < 0) throw error
    let depth = 0
    let inString = false
    for (let i = start; i < text.length; i++) {
      const c = text[i]
      if (inString) {
        if (c === '\\') i++
        else if (c === '"') inString = false
      } else if (c === '"') inString = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
    throw error
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── providers ───────────────────────────────────────────────────────────

async function callGemini(slot: Slot, prompt: string, temperature: number, timeoutMs: number, think: boolean): Promise<string> {
  // Gemini Flash "thinks" before answering by default: ~900 extra tokens and a few seconds per call.
  // Structured writing doesn't need it; judging an idea does, so callers opt in. Flash-Lite doesn't
  // think by default and rejects thinkingBudget, so it gets no setting at all.
  const thinkingOff = !think && !slot.model.includes('lite')
  const generationConfig = { responseMimeType: 'application/json', temperature, ...(thinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}) }
  const model = new GoogleGenerativeAI(slot.key).getGenerativeModel(
    // thinkingConfig is newer than this SDK's types; the API accepts it
    { model: slot.model, generationConfig: generationConfig as never },
    { timeout: timeoutMs }
  )
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function callGroq(slot: Slot, prompt: string, temperature: number, timeoutMs: number): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${slot.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: slot.model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
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
  /** When the request must be done (ms since epoch); attempts share it. Defaults to DEFAULT_BUDGET_MS from now. */
  deadline?: number
  /** Let Gemini think before answering: slower, for judgement rather than writing. */
  think?: boolean
}

export class NoModelAvailableError extends Error {
  constructor(
    public readonly reasons: string[],
    /** True when the request ran out of time rather than out of models. */
    public readonly outOfTime = false
  ) {
    super(outOfTime ? 'The AI took too long to answer. Please try again.' : 'No AI model is available right now. Please try again later.')
  }
}

// Cooldowns that pass within a request (overload, per-minute limits) are worth waiting for; these aren't
const LONG_COOLDOWNS = new Set(['daily quota used', 'key rejected', 'model not available'])

/** When the first of these slots comes off a short cooldown, or Infinity if none will soon. */
function soonestRecovery(slots: Slot[]): number {
  return Math.min(
    ...slots.map((sl) => parkedFor(sl)).flatMap((p) => (p && !LONG_COOLDOWNS.has(p.reason) ? [p.until] : []))
  )
}

/** Ask the tier's models for JSON, walking the chain until one answers or the deadline passes. */
export async function generateJsonWithMeta<T = unknown>(
  prompt: string,
  { tier = 'quality', exclude = [], cache: useCache = true, deadline = Date.now() + DEFAULT_BUDGET_MS, think = false }: GenerateOptions = {}
): Promise<{ data: T; model: string }> {
  const key = cacheKey(tier, prompt)
  const cached = useCache ? cache.get(key) : undefined
  if (cached && cached.expires > Date.now()) return { data: cached.value as T, model: `${cached.model} (cached)` }

  const slots = slotsFor(tier).filter((slot) => !exclude.includes(slot.model))
  const reasons: string[] = []
  const left = () => deadline - Date.now()
  const outOfTime = () => {
    console.warn(`[llm] ${tier}: out of time after ${reasons.length} failed attempts`)
    return new NoModelAvailableError(reasons, true)
  }

  /** One slot, with a second try after a momentary overload or a short per-minute limit. */
  async function trySlot(slot: Slot): Promise<{ data: T } | undefined> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (isParked(slot)) return undefined
      if (left() < MIN_ATTEMPT_MS) throw outOfTime()
      const started = Date.now()
      try {
        const timeoutMs = Math.min(TIMEOUT_MS, left())
        const text =
          slot.provider === 'gemini'
            ? await callGemini(slot, prompt, TEMPERATURE[tier], timeoutMs, think)
            : await callGroq(slot, prompt, TEMPERATURE[tier], timeoutMs)
        const data = parseReply(text) as T
        const ms = Date.now() - started
        record(slot, ms)
        console.info(`[llm] ${tier} answered by ${slot.model} (key ${slot.keyIndex + 1}) in ${(ms / 1000).toFixed(1)}s`)
        return { data }
      } catch (error) {
        const failure = classify(error)
        record(slot, Date.now() - started, failure)
        const why = error instanceof Error ? error.message.split('\n')[0].slice(0, 160) : String(error)
        reasons.push(`${slot.id}: ${why}`)
        console.warn(`[llm] ${slot.id} failed (${failure.reason}): ${why}`)

        // Worth one more try on this slot, if there is time for the wait and the attempt
        const wait =
          failure.reason === 'overloaded'
            ? OVERLOAD_RETRY_MS
            : failure.reason === 'rate limited' && failure.retryAfterMs !== undefined && failure.retryAfterMs <= MAX_RATE_WAIT_MS
              ? failure.retryAfterMs + 250
              : undefined
        if (attempt === 1 && wait !== undefined && left() - wait >= MIN_ATTEMPT_MS * 2) {
          await sleep(wait)
          continue
        }
        park(slot, failure)
        return undefined
      }
    }
    return undefined
  }

  // Walk the chain. If every slot is cooling down, wait for the first to recover, while the deadline allows.
  for (let pass = 1; pass <= 3; pass++) {
    for (const slot of slots) {
      const answer = await trySlot(slot)
      if (answer) {
        remember(key, answer.data, slot.model)
        return { data: answer.data, model: slot.model }
      }
    }
    const wait = soonestRecovery(slots) - Date.now()
    if (!Number.isFinite(wait) || wait + MIN_ATTEMPT_MS > left()) break
    console.info(`[llm] ${tier}: every model is cooling down; waiting ${(Math.max(0, wait) / 1000).toFixed(1)}s for the first to recover`)
    await sleep(Math.max(0, wait) + 100)
  }
  throw left() < MIN_ATTEMPT_MS ? outOfTime() : new NoModelAvailableError(reasons)
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

/** Attempts, successes, failures by reason, and average time per slot, since this server instance started. */
export function routerStats() {
  return Object.fromEntries(
    [...stats.entries()].map(([slot, s]) => [
      slot,
      { attempts: s.attempts, ok: s.ok, failures: s.failures, averageSeconds: Number((s.totalMs / s.attempts / 1000).toFixed(1)) },
    ])
  )
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
