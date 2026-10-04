/**
 * Recent news coverage through the public Google News RSS search feed.
 * No key needed. Google offers these feeds for personal, non-commercial use;
 * a commercial product would switch to a licensed news API.
 */

export interface NewsStory {
  title: string
  url: string
  source: string
  publishedAt: string
}

const TIMEOUT_MS = 8000

const decode = (text: string) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim()

const tag = (item: string, name: string) => item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? ''

export async function searchNews(query: string, limit = 8): Promise<NewsStory[]> {
  const response = await fetch(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IdeaEvaluator/0.1)' } }
  )
  if (!response.ok) throw new Error(`Google News request failed: ${response.status}`)
  const xml = await response.text()

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((m) => {
    const item = m[1]
    const source = decode(tag(item, 'source'))
    // Titles end with " - Source"; drop it since the source is shown separately
    const title = decode(tag(item, 'title')).replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
    return {
      title,
      url: decode(tag(item, 'link')),
      source,
      publishedAt: (() => {
        const d = new Date(decode(tag(item, 'pubDate')))
        return Number.isNaN(d.getTime()) ? '' : d.toISOString()
      })(),
    }
  })
}
