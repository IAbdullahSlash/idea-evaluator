import { type NextRequest, NextResponse } from 'next/server'
import { generateJsonWithMeta, routerStatus, type Tier } from '@/lib/llm'

/**
 * Development only.
 * GET: which model and key slots are available or cooling down (never the keys).
 * POST { tier, exclude }: send a tiny prompt through the router, skipping the
 * listed models, to check that a fallback answers.
 */
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

export async function GET() {
  if (process.env.NODE_ENV === 'production') return notFound()
  return NextResponse.json(routerStatus())
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return notFound()
  const { tier = 'light', exclude = [] } = await request.json().catch(() => ({}))
  try {
    const { model, data } = await generateJsonWithMeta(
      `Reply with ONLY valid JSON: { "ok": true, "time": "${new Date().toISOString()}" }`,
      { tier: tier as Tier, exclude: Array.isArray(exclude) ? exclude : [], cache: false }
    )
    return NextResponse.json({ answeredBy: model, data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 503 })
  }
}
