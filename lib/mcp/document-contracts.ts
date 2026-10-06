import { z } from 'zod'

/**
 * What the user's AI sends for the Hand-off documents: the product brief
 * (vision and user story map), the wireframes, and the SRS in three parts.
 * Strict and described, like the stage contracts in ./contracts.ts; the
 * server then runs the website's own schemas, numbering, and checks.
 */

const id = z.string().min(8).max(32).describe('The evaluationId returned by start_evaluation.')
const sentence = (what: string) => z.string().min(1).describe(what)

// ── product brief: vision and user story map ───────────────────────────

export const briefInput = z.object({
  evaluationId: id,
  vision: z
    .object({
      targetUsers: sentence('Who it is for (the "For …" part).'),
      need: sentence('Their need or problem (the "who …" part).'),
      productName: sentence('A short name for the product.'),
      category: sentence('The kind of product, e.g. "web app for bakery owners".'),
      benefit: sentence('The key benefit.'),
      alternative: sentence('The main alternative people use today.'),
      difference: sentence('How this product is different from that alternative.'),
    })
    .describe('Must read as one sentence: "For <targetUsers> who <need>, <productName> is a <category> that <benefit>. Unlike <alternative>, it <difference>."'),
  problem: sentence('3-4 sentences: the problem, who has it, and what it costs them today.'),
  personas: z
    .array(z.object({ name: sentence('A role, e.g. "Bakery owner".'), description: sentence('1-2 sentences.'), goals: z.array(z.string()).min(2).max(4) }))
    .min(2)
    .max(3),
  goals: z.array(z.string()).min(3).max(5).describe('Product goals.'),
  nonGoals: z.array(z.string()).min(2).max(4).describe('What it deliberately will not do, including what the plan cuts.'),
  successMeasures: z
    .array(z.object({ measure: z.string(), target: sentence('A number that means success, e.g. "20 bakeries in 3 months".') }))
    .min(3)
    .max(4),
  activities: z
    .array(
      z.object({
        name: sentence('A user activity, e.g. "Plan tomorrow’s baking".'),
        tasks: z
          .array(
            z.object({
              name: sentence('A task within it.'),
              stories: z
                .array(
                  z.object({
                    title: sentence('"As a <persona>, I want <something> so that <benefit>".'),
                    release: sentence('The plan version that delivers it (e.g. "v0.1"), or "Later" for stories no version includes.'),
                  })
                )
                .min(1)
                .max(3),
            })
          )
          .min(1)
          .max(3),
      })
    )
    .min(3)
    .max(5)
    .describe('The user story map: activities in the order a user goes through them, at most 10 tasks and 24 stories in all. The server numbers the stories US-1, US-2, … in this order.'),
})

// ── wireframes ──────────────────────────────────────────────────────────

const label = (what: string) => z.string().describe(what)
const leaf = z.union([
  z.object({ kind: z.literal('header'), title: label('App or page name.'), items: z.array(z.string()).max(5).describe('Nav links.') }),
  z.object({ kind: z.literal('heading'), text: label('Page or section title.') }),
  z.object({ kind: z.literal('text'), lines: z.number().int().min(1).max(4).describe('A paragraph of body text, drawn as bars.') }),
  z.object({ kind: z.literal('button'), label: label('Button text.'), primary: z.boolean() }),
  z.object({ kind: z.enum(['input', 'select', 'search', 'checkbox']), label: label('Field label.') }),
  z.object({ kind: z.literal('list'), items: z.array(z.string()).max(6).describe('Row labels.') }),
  z.object({ kind: z.literal('table'), columns: z.array(z.string()).max(5), rows: z.number().int().min(1).max(6) }),
  z.object({ kind: z.literal('cards'), items: z.array(z.string()).max(6).describe('Card titles, shown in a grid.') }),
  z.object({ kind: z.literal('chart'), label: label('What it shows.'), type: z.enum(['bar', 'line', 'pie']) }),
  z.object({ kind: z.literal('stats'), items: z.array(z.string()).min(2).max(4).describe('Number tiles, e.g. "Loaves today".') }),
  z.object({ kind: z.literal('tabs'), items: z.array(z.string()).max(5) }),
  z.object({ kind: z.enum(['image', 'camera', 'map', 'video']), label: label('What it shows.') }),
])

export const wireframesInput = z.object({
  evaluationId: id,
  screens: z
    .array(
      z.object({
        name: sentence('Short screen name, e.g. "Dashboard".'),
        purpose: sentence('One sentence: what the user does here.'),
        device: z.enum(['desktop', 'mobile']).describe('"mobile" for screens used on a phone; otherwise "desktop".'),
        stories: z.array(z.string()).describe('The story ids (US-n) this screen serves.'),
        sidebar: z.array(z.string()).max(7).describe('Navigation items down the left, desktop screens only; otherwise [].'),
        elements: z
          .array(z.union([leaf, z.object({ kind: z.literal('row'), children: z.array(leaf).min(2).max(3) })]))
          .min(3)
          .max(10)
          .describe('The screen top to bottom. Starts with a "header" unless it is a full-screen view like a camera scanner. A "row" puts 2-3 parts side by side.'),
        leadsTo: z.array(z.string()).max(4).describe('Names of other screens in this list.'),
        notes: z.array(z.string()).max(4).describe('Short design notes, e.g. "Scanning confirms in under 2 seconds".'),
      })
    )
    .min(4)
    .max(7)
    .describe('The key screens for the first release, in the order a user meets them. Use real labels from this product, not placeholders.'),
})

// ── SRS, in three parts ─────────────────────────────────────────────────

const nfr = z.array(
  z.object({ statement: sentence('"The system shall …"'), measure: sentence('How it is measured, with a number or a named standard.') })
)

export const srsOverviewInput = z.object({
  evaluationId: id,
  purpose: sentence('2-3 sentences: what this document specifies and who it is for.'),
  inScope: z.array(z.string()).min(3).describe('What the product does, one capability per item.'),
  outOfScope: z.array(z.string()).describe('What it deliberately does not do, including what the plan leaves out.'),
  definitions: z.array(z.object({ term: z.string(), meaning: z.string() })).describe('Only terms a reviewer might not know.'),
  productPerspective: sentence('2-3 sentences: standalone or part of a larger system; what it replaces or works alongside.'),
  productFunctions: z.array(z.string()).min(4).max(8),
  userClasses: z
    .array(z.object({ name: z.string(), description: sentence('Who they are and what they do with it.'), frequency: z.string(), expertise: z.string() }))
    .min(2)
    .max(4),
  operatingEnvironment: sentence('Platforms, browsers or devices, hosting.'),
  designConstraints: z.array(z.string()).describe('Stack, budget, regulation, deadline.'),
  userDocumentation: z.array(z.string()),
  assumptions: z.array(z.string()),
  dependencies: z.array(z.string()).describe('Outside services or components it depends on.'),
  uiPrinciples: z.array(z.string()).describe('Rules every screen follows.'),
  hardwareInterfaces: z.array(z.string()).describe('Devices it uses, e.g. a camera; empty if none.'),
  softwareInterfaces: z.array(z.object({ name: z.string(), purpose: z.string() })),
  communicationsInterfaces: z.array(z.string()).describe('Protocols or channels, e.g. "HTTPS", "Transactional email".'),
})

export const srsFeaturesInput = z.object({
  evaluationId: id,
  features: z
    .array(
      z.object({
        name: sentence('A feature, e.g. "Pre-order entry".'),
        description: sentence('2-3 sentences: what it does and for whom.'),
        priority: z
          .enum(['Must', 'Should', 'Could'])
          .describe('Must = must-have features; Should = other features the planned versions include; Could = nice-to-haves and anything the plan leaves out.'),
        stimulusResponse: z
          .array(z.object({ stimulus: sentence('What the user or system does.'), response: sentence('What the system does in reply.') }))
          .min(2)
          .max(4),
        requirements: z
          .array(
            z.object({
              statement: sentence('One testable "The system shall …" statement.'),
              acceptance: z.array(z.string()).min(1).max(3).describe('Testable conditions.'),
              stories: z.array(z.string()).describe('Story ids (US-n) it fulfils.'),
              screens: z.array(z.string()).describe('Screen names, exactly as in the wireframes, where it shows up; empty for background work.'),
            })
          )
          .min(2)
          .max(5),
      })
    )
    .min(4)
    .max(8)
    .describe('Cover every user story with at least one requirement. The server numbers requirements FR-1, FR-2, … in this order.'),
})

export const srsQualityInput = z.object({
  evaluationId: id,
  performance: nfr.min(2).max(4),
  safety: nfr.max(3).describe('Empty if nothing applies.'),
  security: nfr.min(2).max(4).describe('Include the plan’s security work and any regulation that applies to the data, e.g. GDPR.'),
  quality: z
    .array(
      z.object({
        attribute: z.enum(['Usability', 'Reliability', 'Availability', 'Maintainability', 'Portability', 'Accessibility']),
        statement: sentence('"The system shall …"'),
        measure: sentence('How it is measured, with a number.'),
      })
    )
    .min(2)
    .max(4),
  // A business rule is a statement, not a measurable target, so its measure may be empty
  businessRules: z
    .array(z.object({ statement: sentence('A rule the product enforces, e.g. who may do what.'), measure: z.string().describe('Usually "".') }))
    .max(3)
    .describe('Empty if none.'),
  entities: z
    .array(
      z.object({
        name: sentence('A data entity, e.g. "Pre-order".'),
        description: z.string(),
        fields: z.array(z.object({ name: z.string(), type: z.string().describe('text | number | date | boolean | id | …'), notes: z.string().describe('e.g. "unique", "required"') })),
        relations: z.array(z.string()).describe('e.g. "A Bakery has many Products".'),
      })
    )
    .min(3)
    .max(7),
  retention: z.array(z.string()).describe('How long data is kept, and how it is deleted.'),
  openQuestions: z.array(z.object({ question: z.string(), why: z.string() })).min(3).max(6).describe('Real decisions the evaluation leaves open.'),
})
