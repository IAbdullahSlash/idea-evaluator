import { type NextRequest, NextResponse } from "next/server"
import { AUTHORIZE_URL, COOKIE, codeChallenge, linearConfig, randomToken } from "@/lib/linear/client"

/**
 * GET ?returnTo=/analysis?e=… → Linear's consent screen. The state and the
 * PKCE verifier wait in short-lived cookies for the callback, which then
 * returns the person to the page they came from.
 */

const TEN_MINUTES = 10 * 60

// Only a path on this site, so the sign-in can't be used to send people elsewhere
const safeReturn = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/analysis")

export async function GET(request: NextRequest) {
  const config = linearConfig()
  const returnTo = safeReturn(request.nextUrl.searchParams.get("returnTo"))
  if (!config) return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}linear=unavailable`, request.url))

  const state = randomToken()
  const verifier = randomToken()
  const authorize = new URL(AUTHORIZE_URL)
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: new URL("/api/linear/callback", request.url).toString(),
    response_type: "code",
    scope: "read,write",
    state,
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: "S256",
    actor: "user",
  }).toString()

  const response = NextResponse.redirect(authorize)
  const cookie = { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax" as const, path: "/api/linear", maxAge: TEN_MINUTES }
  response.cookies.set(COOKIE.state, state, cookie)
  response.cookies.set(COOKIE.verifier, verifier, cookie)
  response.cookies.set(COOKIE.returnTo, returnTo, cookie)
  return response
}
