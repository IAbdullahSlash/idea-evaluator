import { redirect } from "next/navigation"

// Short links to a saved evaluation (e.g. from the MCP tools) open it read-only on the analysis page
export default function EvaluationLink({ params }: { params: { id: string } }) {
  redirect(`/analysis?e=${encodeURIComponent(params.id)}`)
}
