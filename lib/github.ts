/**
 * Similar open-source projects: a GitHub repository search sorted by stars.
 * No key needed; an optional GITHUB_TOKEN raises the search rate limit.
 */

export interface Repo {
  name: string
  description: string
  stars: number
  forks: number
  language: string
  url: string
  owner: string
}

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function searchRepos(query: string, perPage = 6): Promise<Repo[]> {
  const response = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Idea-Evaluator-App',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new GitHubError(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`, response.status)
  }
  const data = await response.json()
  return (data.items ?? []).map((repo: any) => ({
    name: repo.name,
    description: repo.description || 'No description available',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language || 'Not specified',
    url: repo.html_url,
    owner: repo.owner.login,
  }))
}
