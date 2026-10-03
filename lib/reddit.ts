/**
 * Reddit search through the official API (app-only OAuth).
 * Reddit blocks anonymous server requests, so this needs REDDIT_CLIENT_ID and
 * REDDIT_CLIENT_SECRET from an app created at https://www.reddit.com/prefs/apps.
 */

export interface RedditThread {
  id: string
  title: string
  subreddit: string
  url: string
  score: number
  numComments: number
  text: string
  topComments: string[]
}

const USER_AGENT = 'web:idea-evaluator:v0.1 (project idea evaluation)'
const TIMEOUT_MS = 8000

let cachedToken: { value: string; expiresAt: number } | null = null

export function isRedditConfigured(): boolean {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const credentials = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Reddit auth failed: ${response.status}`)

  const data = await response.json()
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

async function redditGet(path: string): Promise<any> {
  const token = await getToken()
  const response = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Reddit request failed: ${response.status}`)
  return response.json()
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text)

async function topComments(id: string): Promise<string[]> {
  try {
    const [, comments] = await redditGet(`/comments/${id}?sort=top&limit=6&depth=1&raw_json=1`)
    return (comments?.data?.children || [])
      .filter((c: any) => c.kind === 't1' && c.data?.body && !c.data.stickied && c.data.body !== '[deleted]')
      .slice(0, 3)
      .map((c: any) => clip(c.data.body.trim(), 400))
  } catch {
    return []
  }
}

/** The three most upvoted relevant threads for a query, with their top comments. */
export async function findTopThreads(query: string, count = 3): Promise<RedditThread[]> {
  const search = await redditGet(
    `/search?q=${encodeURIComponent(query)}&sort=relevance&t=all&limit=15&type=link&raw_json=1`
  )
  const posts = (search?.data?.children || [])
    .map((c: any) => c.data)
    .filter((p: any) => p && !p.over_18 && p.num_comments > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, count)

  return Promise.all(
    posts.map(async (p: any) => ({
      id: p.id,
      title: p.title,
      subreddit: p.subreddit,
      url: `https://www.reddit.com${p.permalink}`,
      score: p.score,
      numComments: p.num_comments,
      text: clip((p.selftext || '').trim(), 600),
      topComments: await topComments(p.id),
    }))
  )
}
