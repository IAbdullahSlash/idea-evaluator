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

/**
 * Stories with real discussion that match the query. Algolia requires every
 * word to match, so if nothing comes back the last word is dropped and the
 * search tried again (down to two words).
 */
export async function searchStories(query: string, limit = 10): Promise<Omit<HnThread, 'comments'>[]> {
  let words = query.trim().split(/\s+/).filter(Boolean).slice(0, 5)
  while (words.length > 0) {
    const data = await getJson(
      `${API}/search?query=${encodeURIComponent(words.join(' '))}&tags=story&numericFilters=num_comments%3E3&hitsPerPage=${limit}`
    )
    const hits = (data?.hits || []).filter((h: any) => h.title)
    if (hits.length > 0 || words.length <= 2) {
      return hits.map((h: any) => ({
        id: String(h.objectID),
        title: h.title,
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        points: h.points ?? 0,
        numComments: h.num_comments ?? 0,
        createdAt: h.created_at ?? '',
      }))
    }
    words = words.slice(0, -1)
  }
  return []
}

/** The first few top-level comments of a thread, as plain text. */
export async function threadComments(id: string, count = 3): Promise<string[]> {
  try {
    const item = await getJson(`${API}/items/${encodeURIComponent(id)}`)
    return (item?.children || [])
      .filter((c: any) => c?.text && c.author)
      .slice(0, count)
      .map((c: any) => clip(decode(c.text), 400))
  } catch {
    return []
  }
}
