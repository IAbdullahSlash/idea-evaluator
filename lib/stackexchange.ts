/**
 * Stack Exchange questions and answers through the public API.
 * No key needed (300 requests a day per IP); an optional STACKEXCHANGE_KEY
 * from https://stackapps.com/apps/oauth/register raises that to 10,000.
 */

export interface SeThread {
  id: number
  site: string
  siteName: string
  title: string
  url: string
  score: number
  answerCount: number
  createdAt: string
  question: string
  answers: string[]
}

const API = 'https://api.stackexchange.com/2.3'
const TIMEOUT_MS = 8000

// Where people ask "what already does this?", "how do I do this with an app?",
// and, for the student audience, how university life works.
const SITES: { id: string; name: string }[] = [
  { id: 'softwarerecs', name: 'Software Recommendations' },
  { id: 'webapps', name: 'Web Applications' },
  { id: 'academia', name: 'Academia' },
]

const keyParam = () => (process.env.STACKEXCHANGE_KEY ? `&key=${encodeURIComponent(process.env.STACKEXCHANGE_KEY)}` : '')

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Stack Exchange request failed: ${response.status}`)
  return response.json()
}

const decode = (html: string) =>
  html
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' [code] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text)

async function searchSite(site: { id: string; name: string }, query: string, perSite: number): Promise<SeThread[]> {
  const data = await getJson(
    `${API}/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=${site.id}` +
      `&answers=1&pagesize=${perSite}&filter=withbody${keyParam()}`
  )
  const questions = (data?.items || []).filter((q: any) => q.title && q.score >= 0)
  if (questions.length === 0) return []

  // The top answers for all of this site's questions, in one request
  const ids = questions.map((q: any) => q.question_id).join(';')
  const answers = await getJson(
    `${API}/questions/${ids}/answers?order=desc&sort=votes&site=${site.id}&pagesize=30&filter=withbody${keyParam()}`
  ).catch(() => ({ items: [] }))

  return questions.map((q: any) => ({
    id: q.question_id,
    site: site.id,
    siteName: site.name,
    title: decode(q.title),
    url: q.link,
    score: q.score ?? 0,
    answerCount: q.answer_count ?? 0,
    createdAt: q.creation_date ? new Date(q.creation_date * 1000).toISOString() : '',
    question: clip(decode(q.body || ''), 300),
    answers: (answers?.items || [])
      .filter((a: any) => a.question_id === q.question_id && a.body)
      .slice(0, 2)
      .map((a: any) => clip(decode(a.body), 400)),
  }))
}

/** Answered questions about the query, from each site in parallel. A failing site is skipped. */
export async function searchQuestions(query: string, perSite = 3): Promise<SeThread[]> {
  const results = await Promise.allSettled(SITES.map((site) => searchSite(site, query, perSite)))
  const found = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  if (found.length === 0 && results.every((r) => r.status === 'rejected')) {
    throw new Error('Stack Exchange could not be reached')
  }
  return found
}
