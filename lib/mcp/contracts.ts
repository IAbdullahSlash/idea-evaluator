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
  reason: sentence('One short sentence explaining the mark.'),
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
  honestAiFeedback: sentence('A direct, honest assessment of feasibility and the real challenges (2-4 sentences).'),
  targetUsersMarketFit: z.object({
    primaryUsers: sentence('The specific people or groups who would find this valuable.'),
    marketDemand: sentence('How much demand there is today.'),
    userValidation: sentence('How to check that users want it.'),
  }),
  aiVerdict: sentence('The overall recommendation with clear next steps (1-2 sentences).'),
  searchQueries: z.object({
    github: sentence('2-4 keywords to find similar open-source projects on GitHub.'),
    discussions: sentence('2-3 everyday words naming the problem or kind of product, as an ordinary user would say it. Never technical terms.'),
  }),
  selfQuestions: z
    .array(z.object({ question: sentence('A question the developer must answer to make THIS idea clearer.'), why: sentence('What the answer decides.') }))
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
  executiveSummary: sentence('3-4 sentences: the overall verdict, the main reason, and the recommended next step.'),
  pros: z.array(z.string()).min(3).max(4).describe('Short points on what is good about the idea.'),
  cons: z.array(z.string()).min(3).max(4).describe('Downsides of the idea itself (effort, cost, competition, adoption), not repeating the risks.'),
  potentialChallenges: z.object({
    technicalRisks: sentence('Specific technical challenges and development risks.'),
    usabilityIssues: sentence('Usability, security, and privacy problems users would hit.'),
    marketRisks: sentence('Competition and market risks.'),
  }),
  riskSeverity: z
    .object({ technical: severity, usability: severity, market: severity })
    .describe('"high" only when the risk could stop the project on its own.'),
  quickWins: z
    .array(z.object({ title: sentence('A short action.'), description: sentence('What to do and why.'), timeEstimate: sentence('e.g. "2 days".') }))
    .min(2)
    .max(3)
    .describe('Concrete things this developer can do in the next week or two.'),
  existingSolutions: z
    .array(
      z.object({
        name: sentence('A real product, app, or open-source project. Never invent one.'),
        url: z.string().describe('Its official homepage if you are sure of it, otherwise "". Links are checked.'),
        description: sentence('What it does.'),
        difference: sentence('How this idea differs from it.'),
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
  recommendations: z.array(z.string()).max(5),
  market: z
    .object({
      discussions: z
        .array(z.object({ id: sentence('A discussion id from research_market, e.g. "hn-123".'), says: sentence('1-2 sentences on what people said that matters for this idea.') }))
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
    note: sentence('Does the must-have scope fit the time the builder has, and if not, what to cut.'),
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
        description: z.string(),
      })
    )
    .describe('The roles the work needs; the total should be what this builder or a small team can give. No managers for a solo or student project.'),
  sdlcMapping: sentence('How to work, in 2-4 sentences, lightweight and specific.'),
  qaApproach: sentence('How to test and release, in 2-4 sentences.'),
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
    .array(z.object({ version: z.string(), timeline: z.string(), description: z.string(), features: z.array(z.string()) }))
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
