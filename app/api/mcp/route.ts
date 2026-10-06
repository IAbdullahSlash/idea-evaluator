import { createMcpHandler } from "mcp-handler"
import { registerTools } from "@/lib/mcp/tools"
import { SERVER_INSTRUCTIONS } from "@/lib/mcp/guide"
import { checkMcpRequest } from "@/lib/rate-limit"

/**
 * The Idea Evaluator's MCP server, for ChatGPT, Claude, Gemini, and other AI
 * clients that support remote MCP servers (custom connectors). Users add this
 * route's URL, e.g. https://idea-evaluator-slash.vercel.app/api/mcp, and their
 * own AI evaluates ideas with these tools. No AI runs on this server.
 */

export const maxDuration = 60

// Links in tool replies point back at the site the client connected to (production, a preview, or localhost)
const handlers = new Map<string, (request: Request) => Promise<Response>>()
function handlerFor(origin: string) {
  let handler = handlers.get(origin)
  if (!handler) {
    handler = createMcpHandler((server) => registerTools(server, origin), {
      serverInfo: { name: "idea-evaluator", version: "0.1.0" },
      instructions: SERVER_INSTRUCTIONS,
    })
    handlers.set(origin, handler)
  }
  return handler
}

// Size and per-IP rate limits come first: the tools are public and need no account
async function handle(request: Request) {
  const refused = await checkMcpRequest(request)
  if (refused) return refused
  return handlerFor(new URL(request.url).origin)(request)
}

export { handle as GET, handle as POST, handle as DELETE }
