/**
 * Hacker News discussions through the public Algolia search API.
 * No key, account, or approval needed: https://hn.algolia.com/api
 */

export interface HnThread {
  id: string
  title: string
  url: string
  points: number
  numComments: number
  createdAt: string
  comments: string[]
}

const API = 'https://hn.algolia.com/api/v1'
const TIMEOUT_MS = 8000

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Hacker News request failed: ${response.status}`)
  return response.json()
}

const decode = (html: string) =>
  html
    .replace(/<p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, '/')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim()

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text)

// Words that only add noise to a title search
const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'for', 'of', 'to', 'in', 'on', 'with', 'by', 'my', 'your', 'that', 'app', 'tool'])

/**
 * Stories with real discussion that match the query. Only titles are searched,
 * without typo or prefix matching (otherwise "planner" also finds "planets").
 * Every word is optional, so titles matching the most words rank first and a
 * long query still finds something.
 */
export async function searchStories(query: string, limit = 10): Promise<Omit<HnThread, 'comments'>[]> {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.-]+/u)
    .filter((w) => w && !STOP_WORDS.has(w))
    .slice(0, 5)
  if (words.length === 0) return []
  const q = encodeURIComponent(words.join(' '))
  const data = await getJson(
    `${API}/search?query=${q}&optionalWords=${q}&tags=story&restrictSearchableAttributes=title` +
      `&typoTolerance=false&queryType=prefixNone&numericFilters=num_comments%3E3&hitsPerPage=${limit}`
  )
  return (data?.hits || [])
    .filter((h: any) => h.title)
    .map((h: any) => ({
      id: String(h.objectID),
      title: h.title,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      points: h.points ?? 0,
      numComments: h.num_comments ?? 0,
      createdAt: h.created_at ?? '',
    }))
}

const FIREBASE = 'https://hacker-news.firebaseio.com/v0'

/**
 * The top few comments of a thread, as plain text. Uses the official HN API,
 * which returns comment ids in ranked order, so only those comments are fetched
 * instead of the whole (sometimes huge) thread.
 */
export async function threadComments(id: string, count = 3): Promise<string[]> {
  try {
    const story = await getJson(`${FIREBASE}/item/${encodeURIComponent(id)}.json`)
    const kids: number[] = (story?.kids || []).slice(0, count + 2)
    const comments = await Promise.all(
      kids.map((kid) => getJson(`${FIREBASE}/item/${kid}.json`).catch(() => null))
    )
    return comments
      .filter((c: any) => c?.text && !c.deleted && !c.dead)
      .slice(0, count)
      .map((c: any) => clip(decode(c.text), 400))
  } catch {
    return []
  }
}
