import { type NextRequest, NextResponse } from "next/server"
import { GitHubError, searchRepos } from "@/lib/github"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    return NextResponse.json({ repositories: await searchRepos(query) })
  } catch (error) {
    // Show GitHub's own message (e.g. a rate limit) rather than a generic one
    if (error instanceof GitHubError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("GitHub API error:", error)
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 })
  }
}
