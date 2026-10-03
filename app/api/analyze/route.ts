import { type NextRequest, NextResponse } from 'next/server'
import { validateIdea } from '@/lib/validation'
import { generateJson } from '@/lib/gemini'
import { overallScore, snapshotSchema } from '@/lib/schemas/snapshot'

// Intent validation is shared via lib/validation.ts (see validateIdea).

// 🚀 STAGE-SPECIFIC PROMPTS
const stagePrompts: Record<string, string> = {
  stage1: `You are a senior technical consultant providing an honest reality check for a project idea.

PROJECT TO ANALYZE: "{idea}"
{clarifications}
CONTEXT PROVIDED BY DEVELOPER:
- Domain: {domain}
- Project Type: {projectType}
- Experience Level: {experience}
- Expected Timeline: {timeline}

Use the above context to sharpen your assessment. If no context was provided, analyze the idea generically.

You must provide a concise but comprehensive assessment focusing on three key areas:

1. HONEST REALITY CHECK:
- Is this idea actually feasible with current technology?
- What are the real-world challenges and obstacles?
- How complex is this really to build and maintain?

2. MARKING SCHEME (mark each criterion 1-10, where 10 is best):
- realProblem: Does it solve a clear problem that someone actually has?
- worthSolving: Is the pain big enough that people would change what they do today?
- alreadyDone: Is there room? 10 means nothing does this well yet; 1 means a free tool already does it well
- somethingNew: What does it do that the alternatives don't?
- withinReach: Can THIS developer build it with their stated experience and time?
- someoneWantsIt: Are there users, and is there demand for it?

3. VERDICT:
- A recommendation: "Build", "Narrow it down", "Rethink", or "Drop"
- The chance of success as a percentage
- Key next steps
The recommendation and success chance must agree with the marks above.

IMPORTANT:
- Be brutally honest and realistic
- Focus on practical implementation challenges
- Consider market realities and competition
- Keep the prose fields under 250 words in total
- Use clear, direct language without fluff

{clarityRule}

Otherwise, respond with ONLY valid JSON:
{
  "shortTitle": "A 2-6 word name for the idea",
  "rubric": {
    "realProblem": { "score": number (1-10), "reason": "One short sentence" },
    "worthSolving": { "score": number (1-10), "reason": "One short sentence" },
    "alreadyDone": { "score": number (1-10), "reason": "One short sentence" },
    "somethingNew": { "score": number (1-10), "reason": "One short sentence" },
    "withinReach": { "score": number (1-10), "reason": "One short sentence" },
    "someoneWantsIt": { "score": number (1-10), "reason": "One short sentence" }
  },
  "recommendation": "Build" | "Narrow it down" | "Rethink" | "Drop",
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "successProbability": number (5-95),
  "detectedDomain": "domain category",
  "requiredExperience": "Beginner" | "Intermediate" | "Advanced",
  "honestAiFeedback": "Direct assessment of feasibility and real challenges",
  "targetUsersMarketFit": {
    "primaryUsers": "Analyze the specific user demographics, professions, or groups who would find this idea valuable",
    "marketDemand": "Assess the current market demand for this solution",
    "userValidation": "Describe how users would validate this idea"
  },
  "aiVerdict": "Overall recommendation with clear next steps",
  "selfQuestions": [
    {
      "question": "A question the developer must answer for themselves to make THIS idea clearer (about its users, scope, core feature, data, or constraints). Specific to this idea, never generic.",
      "why": "One short sentence on what the answer decides"
    }
  ]
}

Give 4 to 5 selfQuestions.`,

  stage2: `You are a senior technical consultant providing detailed executive analysis for a validated project idea.

PROJECT TO ANALYZE: "{idea}"
{clarifications}

Give a detailed but scannable assessment. Prefer short, specific points over long paragraphs.

IMPORTANT:
- Be honest and specific to this idea; avoid generic advice
- Pros and cons are short points (one sentence each)
- Cons are downsides of the idea itself (effort, cost, competition, adoption) and must not repeat the risks
- The executive summary is 3-4 sentences: the overall verdict, the main reason, and the recommended next step
- Avoid special characters that could break JSON

Respond with ONLY valid JSON:
{
  "feasibilityScore": number (1-10),
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "estimatedTimeframe": "conservative estimate with buffer",
  "successProbability": number (10-95),
  "detectedDomain": "detailed domain classification",
  "requiredExperience": "Beginner" | "Intermediate" | "Advanced",
  "executiveSummary": "3-4 sentences: overall verdict, the main reason, and the recommended next step",
  "pros": ["3-4 short points on what is good about this idea"],
  "cons": ["3-4 short points on the downsides of this idea that are not covered by the risks"],
  "redditQuery": "A 3-6 word search query that would find Reddit discussions about the problem this idea solves (the problem, not the product name)",
  "potentialChallenges": {
    "technicalRisks": "Identify specific technical challenges and development risks",
    "usabilityIssues": "Analyze security vulnerabilities and privacy considerations",
    "marketRisks": "Assess competition threats and market acquisition challenges"
  },
  "techStack": {
    "frontend": ["recommended frontend technologies"],
    "backend": ["scalable backend solutions"],
    "database": ["appropriate database choice"],
    "tools": ["essential development tools"]
  },
  "requirementsScope": {
    "mustHaveFeatures": ["List 3-5 essential features for MVP"],
    "niceToHaveFeatures": ["List 3-5 valuable but not critical features"],
    "constraints": ["List 3-5 constraints like budget, time, technical limitations"]
  },
  "recommendations": ["List 3-5 actionable recommendations for next steps"],
  "similarProjects": ["List 2-3 existing projects or companies with similar ideas"]
}`
}

type Clarification = { question: string; answer: string }

const MAX_QUESTIONS = 3
const MAX_ANSWER_LENGTH = 500

// Asked only on the first attempt: a vague idea gets questions instead of a mark.
const CLARITY_RULE = `BEFORE MARKING: IS THE IDEA CLEAR ENOUGH?
Only ask for clarification if a fair examiner genuinely cannot judge feasibility because the idea is missing at least one of: what it actually does, who it is for, or what form it takes (app, website, device, model, etc.). If the idea is reasonably clear, do NOT ask; mark it.
If it is not clear enough, respond with ONLY this JSON and nothing else:
{
  "needsClarification": true,
  "questions": [
    { "question": "A short, specific question answerable in one line", "why": "One short sentence on why the answer changes the mark" }
  ]
}
Ask at most ${MAX_QUESTIONS} questions.`

// Once the developer has answered (or skipped), the idea is always marked.
const NO_MORE_QUESTIONS =
  'The idea has already been clarified. Do NOT ask for clarification; mark it now, treating unanswered questions as unknowns.'

function parseClarifications(raw: unknown): Clarification[] | null {
  if (!Array.isArray(raw)) return null
  return raw
    .slice(0, MAX_QUESTIONS)
    .filter((c): c is Clarification => Boolean(c) && typeof c.question === 'string')
    .map((c) => ({
      question: c.question.slice(0, 300),
      answer: typeof c.answer === 'string' ? c.answer.trim().slice(0, MAX_ANSWER_LENGTH) : '',
    }))
}

function clarificationBlock(clarifications: Clarification[] | null): string {
  if (!clarifications || clarifications.length === 0) return ''
  const lines = clarifications.map((c) => `- Q: ${c.question}\n  A: ${c.answer || '(no answer)'}`)
  return `\nCLARIFICATIONS FROM THE DEVELOPER (answers to earlier questions):\n${lines.join('\n')}\n`
}

function cleanQuestions(raw: unknown, max: number): { question: string; why: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((q) => q && typeof q.question === 'string' && q.question.trim())
    .slice(0, max)
    .map((q) => ({ question: q.question.trim(), why: typeof q.why === 'string' ? q.why.trim() : '' }))
}

function cleanPoints(raw: unknown, max = 5): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).slice(0, max).map((p) => p.trim())
}

export async function POST(request: NextRequest) {
  try {
    const { idea, stage = 'stage1', domain, projectType, experience, timeline, clarifications: rawClarifications } =
      await request.json()
    const clarifications = parseClarifications(rawClarifications)

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    // 🛡️ SERVER-SIDE INTENT GUARDRAILS
    const guardrailError = validateIdea(idea)
    if (guardrailError) {
      return NextResponse.json({ error: guardrailError }, { status: 422 })
    }

    // 🚀 Select the prompt and fill in the idea, its context, and any clarifications
    const selectedPrompt = stagePrompts[stage] || stagePrompts.stage1
    const prompt = selectedPrompt
      .replace('{idea}', idea)
      .replace('{domain}', domain || 'Not specified')
      .replace('{projectType}', projectType || 'Not specified')
      .replace('{experience}', experience || 'Not specified')
      .replace('{timeline}', timeline || 'Not specified')
      .replace('{clarifications}', clarificationBlock(clarifications))
      .replace('{clarityRule}', clarifications ? NO_MORE_QUESTIONS : CLARITY_RULE)

    if (stage === 'stage1') return markSnapshot(prompt, clarifications)
    return summarise(prompt)
  } catch (error) {
    console.error('[analyze] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong while marking your idea. Please try again.' }, { status: 500 })
  }
}

const AI_FAILED = 'The marking service did not respond properly. Please try again.'

/**
 * Stage 1: ask, validate against the schema, and retry once if the reply is
 * incomplete. A vague idea may come back with follow-up questions instead.
 */
async function markSnapshot(prompt: string, clarifications: Clarification[] | null) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: any
    try {
      raw = await generateJson(prompt)
    } catch (error) {
      console.error('[analyze] Gemini failed:', error instanceof Error ? error.message : error)
      return NextResponse.json({ error: AI_FAILED }, { status: 502 })
    }

    if (raw?.needsClarification) {
      const questions = cleanQuestions(raw.questions, MAX_QUESTIONS)
      if (!clarifications && questions.length > 0) {
        return NextResponse.json({ needsClarification: true, questions })
      }
      console.warn('[analyze] Asked for clarification after the idea was clarified; retrying')
      continue
    }

    const parsed = snapshotSchema.safeParse(raw)
    if (!parsed.success) {
      console.warn(`[analyze] Incomplete snapshot (attempt ${attempt}):`, parsed.error.issues.map((i) => i.path.join('.')).join(', '))
      continue
    }

    const snapshot = parsed.data
    return NextResponse.json({
      ...snapshot,
      feasibilityScore: overallScore(snapshot.rubric),
      successProbability: Math.round(Math.min(95, Math.max(5, snapshot.successProbability))),
      honestRealityCheck: snapshot.honestAiFeedback,
      selfQuestions: cleanQuestions(snapshot.selfQuestions, 5),
    })
  }
  return NextResponse.json({ error: AI_FAILED }, { status: 502 })
}

/** Stage 2: the detailed summary. Missing fields fall back to empty values the page hides. */
async function summarise(prompt: string) {
  let analysis: any
  try {
    analysis = await generateJson(prompt)
  } catch (error) {
    console.error('[analyze] Gemini failed:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: AI_FAILED }, { status: 502 })
  }

  const score = Number(analysis?.feasibilityScore)
  return NextResponse.json({
    ...analysis,
    feasibilityScore: Number.isFinite(score) ? Math.round(Math.min(10, Math.max(1, score))) : undefined,
    potentialChallenges: analysis.potentialChallenges || {},
    requirementsScope: analysis.requirementsScope || { mustHaveFeatures: [], niceToHaveFeatures: [], constraints: [] },
    techStack: analysis.techStack || { frontend: [], backend: [], database: [], tools: [] },
    recommendations: analysis.recommendations || [],
    pros: cleanPoints(analysis.pros),
    cons: cleanPoints(analysis.cons),
    similarProjects: analysis.similarProjects || [],
  })
}
