import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/store'

/**
 * Limits on the public MCP endpoint, per IP address, kept in the same Upstash
 * Redis as the evaluations. The tools need no account, so these stop one
 * client from filling storage or spending the shared search quotas (Stack
 * Exchange allows 300 requests a day without a key).
 *
 * If Redis can't be reached, requests are let through rather than blocked.
 */

// Large enough for a full SRS part or a set of wireframes; far below anything abusive
const MAX_BODY_BYTES = 300_000

interface Limit {
  limiter: Ratelimit
  /** What the user is told when they hit it. */
  message: string
}

let limits: { all: Limit; tools: Record<string, Limit> } | null = null
function getLimits() {
  if (limits) return limits
  const make = (prefix: string, tokens: number, window: `${number} ${'m' | 'h' | 'd'}`) =>
    new Ratelimit({ redis: redis(), prefix: `ratelimit:mcp:${prefix}`, limiter: Ratelimit.slidingWindow(tokens, window), analytics: false })
  limits = {
    all: { limiter: make('all', 150, '10 m'), message: 'Too many requests to the Idea Evaluator. Please wait a few minutes and try again.' },
    tools: {
      start_evaluation: { limiter: make('start', 15, '1 h'), message: 'You have started a lot of evaluations this hour. Please wait a while before starting another.' },
      research_market: { limiter: make('research', 25, '1 h'), message: 'Market research is limited to 25 searches an hour. Please wait a while and try again.' },
    },
  }
  return limits
}

/** The caller's IP, as Vercel reports it. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

/** A JSON-RPC error reply, which MCP clients show to the user. */
function rpcError(id: unknown, status: number, message: string, retryAfterSeconds?: number): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code: -32000, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...(retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {}) },
  })
}

async function exceeded(limit: Limit, ip: string): Promise<number | null> {
  try {
    const { success, reset } = await limit.limiter.limit(ip)
    return success ? null : Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  } catch (error) {
    // Storage trouble shouldn't take the tools down with it
    console.warn('[rate-limit] Check failed; allowing the request:', error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Check an MCP request before it is handled. Returns a reply to send instead
 * (too large, or over a limit), or null to go ahead.
 */
export async function checkMcpRequest(request: Request): Promise<Response | null> {
  if (request.method !== 'POST') return null
  const text = await request.clone().text()
  if (text.length > MAX_BODY_BYTES) return rpcError(null, 413, 'That request is too large for the Idea Evaluator.')

  let messages: { id?: unknown; method?: string; params?: { name?: string } }[] = []
  try {
    const parsed = JSON.parse(text)
    messages = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return null // not JSON: the MCP handler answers that itself
  }
  const id = messages[0]?.id
  const ip = clientIp(request)
  const { all, tools } = getLimits()

  const wait = await exceeded(all, ip)
  if (wait !== null) return rpcError(id, 429, all.message, wait)

  for (const m of messages) {
    const limit = m.method === 'tools/call' && m.params?.name ? tools[m.params.name] : undefined
    if (!limit) continue
    const toolWait = await exceeded(limit, ip)
    if (toolWait !== null) return rpcError(m.id, 429, `${limit.message} (Try again in about ${Math.ceil(toolWait / 60)} minutes.)`, toolWait)
  }
  return null
}
