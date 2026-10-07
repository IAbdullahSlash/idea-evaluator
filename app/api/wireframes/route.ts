import { type NextRequest, NextResponse } from "next/server"
import { failureMessage, generateChecked } from "@/lib/llm-checked"
import { clip, evaluationContext, list } from "@/lib/evaluation-context"
import { tidyWireframes, wireframesSchema } from "@/lib/schemas/wireframes"

/**
 * POST { idea, …context, snapshot, summary, plan, stories } → wireframes:
 * the key screens, each a stack of standard parts the SRS draws as
 * low-fidelity grey boxes. Screens cite the story map's IDs (US-n).
 */

const WIREFRAMES_FAILED = "The wireframes couldn't be drawn this time. Please try again."

// Vercel stops a function at this many seconds; every AI request is budgeted to finish inside it
export const maxDuration = 60

interface StoryIn {
  id: string
  title: string
  release: string
}

const storiesFrom = (value: unknown): StoryIn[] =>
  (Array.isArray(value) ? value : [])
    .slice(0, 30)
    .map((s: any) => ({ id: clip(s?.id, 10), title: clip(s?.title, 200), release: clip(s?.release, 30) }))
    .filter((s) => /^US-\d+$/.test(s.id) && s.title)

function wireframesPrompt(body: any, stories: StoryIn[]): string {
  const first = stories[0]?.release
  return `You are a UX designer sketching low-fidelity wireframes for the project below: the key screens a user needs, described as stacks of standard parts that will be drawn as grey boxes.

${evaluationContext(body)}${stories.length ? `\nUser stories (from the story map):\n${stories.map((s) => `- ${s.id} [${s.release}]: ${s.title}`).join("\n")}\n` : ""}${list(body.plan?.scopeCuts).length ? `Left out of the plan: ${list(body.plan.scopeCuts).join("; ")}\n` : ""}
Respond with ONLY valid JSON in exactly this shape:
{
  "screens": [
    {
      "name": "short screen name, e.g. 'Dashboard'",
      "purpose": "one sentence: what the user does here",
      "device": "desktop" | "mobile",
      "stories": ["US-1"],
      "sidebar": ["navigation item"],
      "elements": [ PART, … ],
      "leadsTo": ["name of another screen in this list"],
      "notes": ["a short design note, e.g. 'Scanning confirms in under 2 seconds'"]
    }
  ]
}

PART is one of:
  { "kind": "header", "title": "app or page name", "items": ["nav link"] }
  { "kind": "heading", "text": "page or section title" }
  { "kind": "text", "lines": 1-4 }                       (a paragraph of body text)
  { "kind": "button", "label": "Save", "primary": true }
  { "kind": "input" | "select" | "search" | "checkbox", "label": "Email" }
  { "kind": "list", "items": ["row label"] }              (up to 6 rows)
  { "kind": "table", "columns": ["Name", "Last visit"], "rows": 1-6 }
  { "kind": "cards", "items": ["card title"] }            (up to 6 cards in a grid)
  { "kind": "chart", "label": "Weekly check-ins", "type": "bar" | "line" | "pie" }
  { "kind": "stats", "items": ["Members today"] }          (2-4 number tiles)
  { "kind": "tabs", "items": ["Tab"] }
  { "kind": "image" | "camera" | "map" | "video", "label": "what it shows" }
  { "kind": "row", "children": [PART, PART] }             (2-3 parts side by side; no rows inside rows)

Rules:
- 4 to 7 screens: the ones needed for the ${first ? `first release (${first}) stories` : "must-have features"}, in the order a user meets them, starting with sign-in or the first screen they see if the product has one.
- Use real labels from this product (field names, button text, column names), not placeholders.
- device: "mobile" for screens used on a phone (for example by staff on the move, or when the project is a mobile app); otherwise "desktop". sidebar only on desktop screens that need app navigation; otherwise [].
- 3 to 10 parts per screen. A screen starts with a "header" part unless it is a full-screen view like a camera scanner.
- stories: the IDs this screen serves${stories.length ? "" : " (leave empty: there is no story map)"}. leadsTo: screen names from this list only.
- Base everything on the information above. Don't add screens for features the plan leaves out.`
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  if (typeof body?.idea !== "string" || !body.idea.trim()) {
    return NextResponse.json({ error: "The idea is required" }, { status: 400 })
  }

  const stories = storiesFrom(body.stories)
  const result = await generateChecked(wireframesPrompt(body, stories), wireframesSchema, { label: "wireframes", fresh: Boolean(body.fresh) })
  if (!result.ok) return NextResponse.json({ error: failureMessage(result, WIREFRAMES_FAILED) }, { status: result.busy ? 503 : 502 })
  return NextResponse.json(tidyWireframes(result.data, stories.map((s) => s.id)))
}
