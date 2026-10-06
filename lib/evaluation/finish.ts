import { overallScore, type Snapshot } from '@/lib/schemas/snapshot'

/**
 * Turning a model's raw answer into the data the pages show. Shared by the
 * website's AI routes and the MCP tools (where the user's own AI writes the
 * answer), so an evaluation looks the same whichever way it was made.
 */

export function cleanQuestions(raw: unknown, max: number): { question: string; why: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((q) => q && typeof q.question === 'string' && q.question.trim())
    .slice(0, max)
    .map((q) => ({ question: q.question.trim(), why: typeof q.why === 'string' ? q.why.trim() : '' }))
}

export function cleanPoints(raw: unknown, max = 5): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).slice(0, max).map((p) => p.trim())
}

export function cleanQuickWins(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((w) => w && typeof w.title === 'string' && w.title.trim())
    .slice(0, 3)
    .map((w) => ({
      title: w.title.trim(),
      description: typeof w.description === 'string' ? w.description.trim() : '',
      timeEstimate: typeof w.timeEstimate === 'string' ? w.timeEstimate.trim() : '',
    }))
}

/**
 * Existing solutions come from the model's knowledge, not a live search, so
 * every link is checked: one that doesn't open is dropped (the name stays).
 */
export async function checkSolutionLinks(raw: unknown) {
  if (!Array.isArray(raw)) return []
  const solutions = raw
    .filter((s) => s && typeof s.name === 'string' && s.name.trim())
    .slice(0, 4)
    .map((s) => ({
      name: s.name.trim(),
      url: typeof s.url === 'string' ? s.url.trim() : '',
      description: typeof s.description === 'string' ? s.description.trim() : '',
      difference: typeof s.difference === 'string' ? s.difference.trim() : '',
    }))

  return Promise.all(solutions.map(async (s) => ({ ...s, url: (await linkOpens(s.url)) ? s.url : '' })))
}

async function linkOpens(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IdeaEvaluator/0.1)' },
      signal: AbortSignal.timeout(6000),
    })
    // Some sites block bots with 403 but do exist; treat only "not found" style answers as dead.
    return response.status < 400 || response.status === 403
  } catch {
    return false
  }
}

/**
 * The Snapshot as the pages show it. The overall mark is always computed here
 * from the six criteria, never taken from the model.
 */
export function finishSnapshot(snapshot: Snapshot) {
  return {
    ...snapshot,
    feasibilityScore: overallScore(snapshot.rubric),
    successProbability: Math.round(Math.min(95, Math.max(5, snapshot.successProbability))),
    honestRealityCheck: snapshot.honestAiFeedback,
    selfQuestions: cleanQuestions(snapshot.selfQuestions, 5),
  }
}

/** The Summary as the pages show it: lists trimmed, missing parts made empty, solution links checked. */
export async function finishSummary(analysis: any) {
  const score = Number(analysis?.feasibilityScore)
  return {
    ...analysis,
    feasibilityScore: Number.isFinite(score) ? Math.round(Math.min(10, Math.max(1, score))) : undefined,
    potentialChallenges: analysis.potentialChallenges || {},
    requirementsScope: analysis.requirementsScope || { mustHaveFeatures: [], niceToHaveFeatures: [], constraints: [] },
    techStack: analysis.techStack || { frontend: [], backend: [], database: [], tools: [] },
    recommendations: analysis.recommendations || [],
    pros: cleanPoints(analysis.pros),
    cons: cleanPoints(analysis.cons),
    scoreChange: typeof analysis.scoreChange === 'string' ? analysis.scoreChange.trim() : '',
    riskSeverity: analysis.riskSeverity || {},
    quickWins: cleanQuickWins(analysis.quickWins),
    existingSolutions: await checkSolutionLinks(analysis.existingSolutions),
  }
}
