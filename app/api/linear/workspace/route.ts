import { type NextRequest, NextResponse } from "next/server"
import { COOKIE, LinearError, linearConfig, workspace } from "@/lib/linear/client"

/**
 * GET → whether Linear can be used here, and if the person is connected,
 * their workspace and teams:
 *   { available: false } · { available: true, connected: false } ·
 *   { available: true, connected: true, workspace, teams }
 */

// Answered per person (their cookie), never built once at deploy time
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!linearConfig()) return NextResponse.json({ available: false })
  const token = request.cookies.get(COOKIE.token)?.value
  if (!token) return NextResponse.json({ available: true, connected: false })
  try {
    const { name, teams } = await workspace(token)
    return NextResponse.json({ available: true, connected: true, workspace: name, teams }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof LinearError && error.status === 401) {
      const response = NextResponse.json({ available: true, connected: false })
      response.cookies.set(COOKIE.token, "", { path: "/api/linear", maxAge: 0 })
      return response
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn’t reach Linear." }, { status: 502 })
  }
}
