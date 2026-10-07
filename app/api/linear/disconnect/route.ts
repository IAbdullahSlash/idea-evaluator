import { type NextRequest, NextResponse } from "next/server"
import { COOKIE, revokeToken } from "@/lib/linear/client"

/** POST → revokes the Linear token and forgets it. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE.token)?.value
  if (token) await revokeToken(token)
  const response = NextResponse.json({ connected: false })
  response.cookies.set(COOKIE.token, "", { path: "/api/linear", maxAge: 0 })
  return response
}
