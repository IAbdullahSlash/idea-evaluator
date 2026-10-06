import { searchStories, threadComments } from '@/lib/hackernews'
import { searchQuestions } from '@/lib/stackexchange'
import { searchNews, type NewsStory } from '@/lib/news'

/**
 * What people are saying about an idea's problem: Hacker News and Stack
 * Exchange discussions and Google News stories, searched together so one
 * source fills in when another has nothing. No AI here: every item is real,
 * and whoever reads them (the website's model, or the user's own AI over MCP)
 * picks the relevant ones.
 */

const HN_CANDIDATES = 5

export interface Candidate {
  /** "hn-123" or "se-<site>-<id>": how a reviewer refers to it. */
  id: string
  source: 'Hacker News' | 'Stack Exchange'
  where: string
  title: string
  url: string
  points: number
  replies: number
  createdAt: string
  /** The question and top replies, as "Comment: …" / "Question: …" / "Answer: …" lines. */
  material: string[]
}

export interface Market {
  /** False when none of the sources could be reached. */
  reachable: boolean
  candidates: Candidate[]
  stories: NewsStory[]
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Search every source in parallel; one failing doesn't stop the others. */
export async function gatherMarket(query: string, altQuery = ''): Promise<Market> {
  const queries = Array.from(new Set([query, altQuery].map((q) => q.trim()).filter(Boolean)))
  const [hn, se, news] = await Promise.allSettled([
    Promise.all(queries.map((q) => searchStories(q, HN_CANDIDATES)))
      .then((lists) => uniqueBy(lists.flat(), (s) => s.id).slice(0, HN_CANDIDATES + 2))
      .then((stories) => Promise.all(stories.map(async (s) => ({ ...s, comments: await threadComments(s.id) })))),
    // Stack Exchange has a daily limit without a key, so it gets only the main query
    searchQuestions(query),
    Promise.all(queries.map((q) => searchNews(q))).then((lists) => uniqueBy(lists.flat(), (s) => s.title.toLowerCase()).slice(0, 10)),
  ])
  for (const [name, result] of [['Hacker News', hn], ['Stack Exchange', se], ['Google News', news]] as const) {
    if (result.status === 'rejected') console.warn(`[market] ${name} failed:`, result.reason?.message ?? result.reason)
  }

  const candidates: Candidate[] = [
    ...(hn.status === 'fulfilled' ? hn.value : []).map((t) => ({
      id: `hn-${t.id}`,
      source: 'Hacker News' as const,
      where: 'Hacker News',
      title: t.title,
      url: t.url,
      points: t.points,
      replies: t.numComments,
      createdAt: t.createdAt,
      material: t.comments.map((c) => `Comment: ${c}`),
    })),
    ...(se.status === 'fulfilled' ? se.value : []).map((q) => ({
      id: `se-${q.site}-${q.id}`,
      source: 'Stack Exchange' as const,
      where: q.siteName,
      title: q.title,
      url: q.url,
      points: q.score,
      replies: q.answerCount,
      createdAt: q.createdAt,
      material: [q.question && `Question: ${q.question}`, ...q.answers.map((a) => `Answer: ${a}`)].filter(Boolean) as string[],
    })),
  ]
  return {
    reachable: !(hn.status === 'rejected' && se.status === 'rejected' && news.status === 'rejected'),
    candidates,
    stories: news.status === 'fulfilled' ? news.value : [],
  }
}

/** A discussion as the Summary page shows it, with the reviewer's note on what people said. */
export function threadFrom(c: Candidate, says: string | null) {
  return {
    source: c.source,
    where: c.where,
    title: c.title,
    url: c.url,
    points: c.points,
    replies: c.replies,
    year: c.createdAt ? new Date(c.createdAt).getFullYear() : null,
    says: says && says.trim() ? says.trim() : null,
    // Without a summary, quote the first reply instead.
    topComment: c.material.find((m) => !m.startsWith('Question:'))?.replace(/^(Comment|Answer): /, '') || null,
  }
}
