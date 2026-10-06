import { z } from 'zod'
import { CONTEXT_QUESTIONS } from '@/lib/schemas/context'
import { RECOMMENDATIONS } from '@/lib/schemas/snapshot'
import { TIMELINE_FIT } from '@/lib/schemas/plan'

/**
 * What the user's AI sends to each MCP tool. These are strict on purpose and
 * every field is described: MCP clients show them to the model as the tool's
 * input schema, so they are how it learns the exact shape of each stage. The
 * server then runs the same lenient schemas and finishing steps the website
 * uses, so both produce identical evaluations.
 */

const id = z.string().min(8).max(32).describe('The evaluationId returned by start_evaluation.')
const sentence = (what: string) => z.string().min(1).describe(what)
const level = z.enum(['Beginner', 'Intermediate', 'Advanced'])
const severity = z.enum(['low', 'medium', 'high'])
const answerOf = (qid: (typeof CONTEXT_QUESTIONS)[number]['id']) => {
  const q = CONTEXT_QUESTIONS.find((c) => c.id === qid)!
  return z.enum(q.options.map((o) => o.value) as [string, ...string[]]).describe(`${q.label} Ask the user if they haven't said.`)
}

// ── start ───────────────────────────────────────────────────────────────

export const startInput = z.object({
  idea: z.string().min(15).max(2000).describe('The project idea in the user’s own words: what it does, who it is for, anything technical they know.'),
  projectType: answerOf('projectType'),
  domain: answerOf('domain'),
  experience: answerOf('experience'),
  timeline: answerOf('timeline'),
  clarifications: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .max(3)
    .optional()
    .describe('Only if the idea was too vague to mark: up to 3 short questions you asked the user and their answers.'),
})

// ── stage 1: Snapshot ───────────────────────────────────────────────────

const mark = z.object({
  score: z.number().int().min(1).max(10).describe('1-10, 10 is best.'),
  reason: sentence('2-3 sentences: the reasoning for this mark, and the evidence or assumption behind it.'),
})

export const snapshotInput = z.object({
  evaluationId: id,
  shortTitle: sentence('A 2-6 word name for the idea.'),
  rubric: z
    .object({
      realProblem: mark.describe('Does it solve a clear problem that someone actually has?'),
      worthSolving: mark.describe('Is the pain big enough that people would change what they do today?'),
      alreadyDone: mark.describe('Is there room? 10 = nothing does this well yet; 1 = a free tool already does it well.'),
      somethingNew: mark.describe('What does it do that the alternatives don’t?'),
      withinReach: mark.describe('Can THIS developer build it with their stated experience and time?'),
      someoneWantsIt: mark.describe('Are there users, and is there demand for it?'),
    })
    .describe('The six criteria. The overall mark is their average, computed by the server.'),
  recommendation: z.enum(RECOMMENDATIONS).describe('Must agree with the marks.'),
  difficultyLevel: level,
  successProbability: z.number().int().min(5).max(95).describe('Chance of success in percent; must agree with the marks.'),
  detectedDomain: sentence('Domain category.'),
  requiredExperience: level,
  honestAiFeedback: sentence('A full, honest paragraph (5-8 sentences): is it feasible with current technology, what are the real obstacles, and how hard is it to build and maintain?'),
  targetUsersMarketFit: z.object({
    primaryUsers: sentence('2-3 sentences: the specific people or groups who would find this valuable, and what they do today instead.'),
    marketDemand: sentence('2-3 sentences: how much demand there is today, and the signs of it.'),
    userValidation: sentence('2-3 sentences: concrete ways to check that users want it before building much.'),
  }),
  aiVerdict: sentence('2-4 sentences: the overall recommendation and clear next steps.'),
  searchQueries: z.object({
    github: sentence('2-4 keywords to find similar open-source projects on GitHub.'),
    discussions: sentence('2-3 everyday words naming the problem or kind of product, as an ordinary user would say it. Never technical terms.'),
  }),
  selfQuestions: z
    .array(z.object({ question: sentence('A question the developer must answer to make THIS idea clearer.'), why: sentence('1-2 sentences: what the answer decides.') }))
    .min(3)
    .max(5),
})

// ── research ────────────────────────────────────────────────────────────

export const researchInput = z.object({
  evaluationId: id,
  query: sentence('The Snapshot’s searchQueries.discussions: everyday words for the problem.'),
  alternativeQuery: z.string().optional().describe('A second phrasing, e.g. the idea’s short title.'),
  githubQuery: sentence('The Snapshot’s searchQueries.github.'),
})

// ── stage 2: Summary ────────────────────────────────────────────────────

export const summaryInput = z.object({
  evaluationId: id,
  feasibilityScore: z.number().int().min(1).max(10).describe('The mark re-checked with more detail.'),
  scoreChange: z.string().describe('If the mark differs from the Snapshot’s, one sentence on why; otherwise "".'),
  difficultyLevel: level,
  estimatedTimeframe: sentence('A conservative build-time estimate with buffer.'),
  successProbability: z.number().int().min(10).max(95),
  executiveSummary: sentence('4-6 sentences: the overall verdict, the main reasons for it, the biggest risk, and the recommended next step.'),
  pros: z.array(z.string()).min(3).max(5).describe('What is good about the idea; each 1-2 sentences: the point and why it matters.'),
  cons: z.array(z.string()).min(3).max(5).describe('Downsides of the idea itself (effort, cost, competition, adoption), not repeating the risks; each 1-2 sentences.'),
  potentialChallenges: z.object({
    technicalRisks: sentence('3-5 sentences: the specific technical challenges, why they apply to this idea, and how to reduce them.'),
    usabilityIssues: sentence('3-5 sentences: the usability, security, and privacy problems users would hit, and how to reduce them.'),
    marketRisks: sentence('3-5 sentences: the competition and market risks, why they matter here, and how to reduce them.'),
  }),
  riskSeverity: z
    .object({ technical: severity, usability: severity, market: severity })
    .describe('"high" only when the risk could stop the project on its own.'),
  quickWins: z
    .array(z.object({ title: sentence('A short action.'), description: sentence('2-3 sentences: what to do, how, and what it proves.'), timeEstimate: sentence('e.g. "2 days".') }))
    .min(2)
    .max(3)
    .describe('Concrete things this developer can do in the next week or two.'),
  existingSolutions: z
    .array(
      z.object({
        name: sentence('A real product, app, or open-source project. Never invent one.'),
        url: z.string().describe('Its official homepage if you are sure of it, otherwise "". Links are checked.'),
        description: sentence('1-2 sentences: what it does and who uses it.'),
        difference: sentence('1-2 sentences: how this idea differs, and what to learn from it.'),
      })
    )
    .min(2)
    .max(4),
  techStack: z.object({
    frontend: z.array(z.string()),
    backend: z.array(z.string()),
    database: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  requirementsScope: z.object({
    mustHaveFeatures: z.array(z.string()).min(3).max(5),
    niceToHaveFeatures: z.array(z.string()).max(5),
    constraints: z.array(z.string()).max(5),
  }),
  recommendations: z.array(z.string()).max(5).describe('3-5 actionable next steps, each a full sentence.'),
  market: z
    .object({
      discussions: z
        .array(z.object({ id: sentence('A discussion id from research_market, e.g. "hn-123".'), says: sentence('2-3 sentences on what people said that matters for this idea: pain points, workarounds, tools, doubts.') }))
        .max(3)
        .describe('The relevant discussions only (about the same problem or audience). Empty if none are.'),
      news: z
        .array(z.object({ id: sentence('A news id from research_market, e.g. "news-2".'), note: sentence('One sentence on why it matters.') }))
        .max(4),
      takeaway: z.string().describe('One sentence on what the chosen items mean for the idea; "" if none were relevant.'),
    })
    .describe('Your review of the research_market results. Only ids from those results are accepted.'),
})

// ── stage 3: Plan ───────────────────────────────────────────────────────

const list = (what: string) => z.array(z.string()).describe(what)

export const planInput = z.object({
  evaluationId: id,
  timelineFit: z.object({
    verdict: z.enum(TIMELINE_FIT),
    note: sentence('2-3 sentences: does the must-have scope fit the time the builder has, what makes it tight, and what to cut if needed.'),
  }),
  scopeCuts: list('Every must-have or nice-to-have feature this plan does not build, copied exactly as written in the Summary. Empty if all are built.'),
  projectMilestones: z
    .array(
      z.object({
        phase: sentence('Named for what gets built, not "Project Initiation".'),
        duration: sentence('Working days (5 a week) or weeks, e.g. "1.5 weeks". Together they must fit the builder’s time.'),
        deliverables: list('2-5 concrete things that exist at the end.'),
        dependencies: list('Names of earlier phases.'),
      })
    )
    .min(3)
    .max(5),
  teamRoles: z
    .array(
      z.object({
        role: z.string(),
        fteEstimate: z.number().min(0).max(3).describe('Share of one full-time person.'),
        skills: z.array(z.string()),
        description: z.string().describe('1-2 sentences: what this role does on this project.'),
      })
    )
    .describe('The roles the work needs; the total should be what this builder or a small team can give. No managers for a solo or student project.'),
  sdlcMapping: sentence('How to work, in 4-6 sentences: the rhythm (e.g. weekly cycles), how work is tracked, how feedback from users comes in. Lightweight and specific.'),
  qaApproach: sentence('How to test and release, in 4-6 sentences: what is tested by hand and automatically, with whom, and how releases go out.'),
  techRoadmap: z
    .array(
      z.object({
        category: z.enum(['Infrastructure', 'Dev Stack', 'Integrations', 'Testing', 'Scalability']),
        technologies: z.array(z.string()).describe('Use the Summary’s stack; only add what the plan needs.'),
        timeline: sentence('When in the plan.'),
        trl: z.number().int().min(1).max(9).describe('How proven in production; 9 is proven.'),
      })
    )
    .min(1),
  versionMilestones: z
    .array(z.object({ version: z.string(), timeline: z.string(), description: z.string().describe('1-2 sentences: who it is for and what it proves.'), features: z.array(z.string()) }))
    .min(2)
    .max(3)
    .describe('The first is the smallest thing users can try, matching the must-have features.'),
  securityConsiderations: z
    .array(z.object({ area: z.string(), requirements: z.array(z.string()), compliance: z.array(z.string()).describe('Only standards that really apply.') }))
    .describe('Only areas that apply to this project.'),
  costEstimates: z
    .array(
      z.object({
        category: z.string(),
        items: z.array(
          z.object({
            name: z.string(),
            cost: sentence('"$<amount>/month", "$<amount>/year", or "$<amount> once" ("$0/month" when free).'),
            justification: z.string().describe('Include when a paid tier starts.'),
          })
        ),
        total: z.string(),
      })
    )
    .describe('Money the builder actually pays (hosting, domain, paid APIs, store fees). No salaries. Prefer free tiers.'),
})
