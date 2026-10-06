import { NextResponse } from "next/server"
import { getEvaluation } from "@/lib/store"

/**
 * GET → a saved evaluation, for the read-only view at /e/<id>. Anyone with the
 * link can read it; IDs are unguessable. The raw market research stays private.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const evaluation = await getEvaluation(params.id)
    if (!evaluation) return NextResponse.json({ error: "This evaluation doesn't exist or has expired." }, { status: 404 })
    const { research: _research, ...visible } = evaluation
    return NextResponse.json(visible, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[evaluations] Read failed:", error)
    return NextResponse.json({ error: "The evaluation couldn't be loaded right now. Please try again." }, { status: 503 })
  }
}
