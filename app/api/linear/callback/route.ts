import { type NextRequest, NextResponse } from "next/server"
import { COOKIE, exchangeCode } from "@/lib/linear/client"

/**
 * GET ?code&state from Linear → the access token, kept in an httpOnly cookie
 * for its lifetime (24 hours), then back to the page the person came from
 * with ?linear=connected (or =denied / =error).
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const returnTo = request.cookies.get(COOKIE.returnTo)?.value ?? "/analysis"
  const back = (outcome: string) => new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}linear=${outcome}`, request.url)
  const secure = request.nextUrl.protocol === "https:"

  const finish = (response: NextResponse) => {
    for (const name of [COOKIE.state, COOKIE.verifier, COOKIE.returnTo]) response.cookies.set(name, "", { path: "/api/linear", maxAge: 0 })
    return response
  }

  if (params.get("error")) return finish(NextResponse.redirect(back("denied")))
  const code = params.get("code")
  const state = params.get("state")
  const verifier = request.cookies.get(COOKIE.verifier)?.value
  if (!code || !state || !verifier || state !== request.cookies.get(COOKIE.state)?.value) {
    return finish(NextResponse.redirect(back("error")))
  }

  try {
    const { accessToken, expiresIn } = await exchangeCode(code, verifier, new URL("/api/linear/callback", request.url).toString())
    const response = finish(NextResponse.redirect(back("connected")))
    response.cookies.set(COOKIE.token, accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/api/linear", maxAge: Math.max(60, expiresIn - 60) })
    return response
  } catch (error) {
    console.error("[linear] Token exchange failed:", error instanceof Error ? error.message : error)
    return finish(NextResponse.redirect(back("error")))
  }
}
