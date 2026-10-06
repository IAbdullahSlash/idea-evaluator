import type { McpServer } from '@modelcontextprotocol/server'
import { alignReleases, briefSchema, numberStories, type Brief } from '@/lib/schemas/brief'
import { tidyWireframes, wireframesSchema, type Wireframes } from '@/lib/schemas/wireframes'
import { numberRequirements, srsFeaturesSchema, srsOverviewSchema, srsQualitySchema, tidySrs } from '@/lib/schemas/srs'
import type { StoredEvaluation } from '@/lib/store'
import { fail, isFail, issues, load, ok, store } from '@/lib/mcp/helpers'
import { briefInput, srsFeaturesInput, srsOverviewInput, srsQualityInput, wireframesInput } from '@/lib/mcp/document-contracts'
import { BRIEF_WRITEUP, SRS_GUIDE, SRS_WRITEUP, WIREFRAMES_GUIDE, WIREFRAMES_WRITEUP } from '@/lib/mcp/document-guide'

/**
 * The Hand-off documents over MCP: the product brief (vision and story map),
 * the wireframes, and the SRS in three parts. Each is checked with the
 * website's own schemas and numbered and traced the same way, then saved
 * where the Hand-off page's Report and SRS read it.
 */

type Stage5 = { brief?: Brief; wireframes?: Wireframes; srs?: unknown }
type SrsDraft = { overview?: unknown; features?: { features: unknown[] }; quality?: unknown }

const stage5Of = (e: StoredEvaluation) => (e.stageData.stage5 ?? {}) as Stage5
const PLAN_FIRST = 'Save the plan first (save_plan): the documents build on its versions and scope.'

export function registerDocumentTools(server: McpServer, link: (id: string) => string): void {
  server.registerTool(
    'save_brief',
    {
      title: 'Save the product brief',
      description:
        'Save the product brief for the Hand-off documents: vision statement, problem, personas, goals, non-goals, success measures, and the user story map. The server numbers the stories (US-1, …) and puts each in one of the plan’s versions. Call after save_plan. Saving a new brief clears the wireframes and SRS, whose story numbers would no longer match.',
      inputSchema: briefInput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ evaluationId, ...raw }) => {
      const evaluation = await load(evaluationId)
      if (isFail(evaluation)) return evaluation
      const plan = evaluation.stageData.stage4 as { versionMilestones?: { version: string }[] } | undefined
      if (!evaluation.stageData.stage3 || !plan) return fail(PLAN_FIRST)
      const parsed = briefSchema.safeParse(raw)
      if (!parsed.success) return fail(`The brief is incomplete: ${issues(parsed.error)}. Fix it and call save_brief again.`)

      const versions = (plan.versionMilestones ?? []).map((v) => v.version)
      const brief = alignReleases(parsed.data, versions)
      const sent = numberStories(parsed.data)
      const stories = numberStories(brief)
      const moved = stories.filter((s, i) => s.release !== (sent[i]?.release || 'Later'))
      const failed = await store({
        ...evaluation,
        srsDraft: undefined,
        stageData: { ...evaluation.stageData, stage5: { ...stage5Of(evaluation), brief, wireframes: undefined, srs: undefined } },
      })
      if (failed) return failed

      const first = versions[0]
      return ok(
        `Product brief saved: ${stories.length} stories in ${brief.activities.length} activities` +
          (first ? `, ${stories.filter((s) => s.release === first).length} in the first release (${first}).` : '.') +
          (moved.length ? ` ${moved.map((s) => s.id).join(', ')} named a release the plan doesn't have, so they were put in "Later"; the plan's versions are ${versions.join(', ')}.` : '') +
          `\n\nThe stories, numbered:\n${stories.map((s) => `- ${s.id} [${s.release}] ${s.title}`).join('\n')}` +
          `\nLink: ${link(evaluationId)}\n\n${BRIEF_WRITEUP}\n\nIf they want to continue: ${WIREFRAMES_GUIDE}`
      )
    }
  )

  server.registerTool(
    'save_wireframes',
    {
      title: 'Save the wireframes',
      description:
        'Save the key screens as wireframes: each a stack of standard parts (header, heading, text, button, input, list, table, cards, chart, stats, tabs, image or camera, and rows of these) that the website draws as grey boxes. Call after save_brief. Saving new wireframes clears the SRS, which traces to the screens.',
      inputSchema: wireframesInput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ evaluationId, ...raw }) => {
      const evaluation = await load(evaluationId)
      if (isFail(evaluation)) return evaluation
      const brief = stage5Of(evaluation).brief
      if (!brief) return fail('Save the product brief first (save_brief): the screens cite its stories.')
      const parsed = wireframesSchema.safeParse(raw)
      if (!parsed.success) return fail(`The wireframes are incomplete: ${issues(parsed.error)}. Fix them and call save_wireframes again.`)

      const storyIds = numberStories(brief).map((s) => s.id)
      const wireframes = tidyWireframes(parsed.data, storyIds)
      const dropped = parsed.data.screens.reduce((n, s, i) => n + s.stories.length - wireframes.screens[i].stories.length, 0)
      const failed = await store({
        ...evaluation,
        srsDraft: undefined,
        stageData: { ...evaluation.stageData, stage5: { ...stage5Of(evaluation), wireframes, srs: undefined } },
      })
      if (failed) return failed

      const uncovered = storyIds.filter((id) => !wireframes.screens.some((s) => s.stories.includes(id)))
      return ok(
        `Wireframes saved: ${wireframes.screens.length} screens (${wireframes.screens.map((s) => `${s.name}, ${s.device}`).join('; ')}).` +
          (dropped ? ` ${dropped} story id(s) that aren't in the story map were removed.` : '') +
          (uncovered.length ? ` Stories no screen shows: ${uncovered.join(', ')} (fine for background work or later releases).` : '') +
          `\nLink: ${link(evaluationId)}\n\n${WIREFRAMES_WRITEUP}\n\nIf they want to continue: ${SRS_GUIDE}` +
          `\n\nFor the SRS, the story ids are ${storyIds.join(', ')} and the screen names are: ${wireframes.screens.map((s) => `"${s.name}"`).join(', ')}.`
      )
    }
  )

  /** One part of the SRS. When all three are saved, the document is put together, numbered, and traced. */
  async function saveSrsPart(evaluationId: string, part: keyof SrsDraft, data: unknown) {
    const evaluation = await load(evaluationId)
    if (isFail(evaluation)) return evaluation
    if (!evaluation.stageData.stage3) return fail(PLAN_FIRST)
    const draft: SrsDraft = { ...((evaluation.srsDraft as SrsDraft) ?? {}), [part]: data }
    const { brief, wireframes } = stage5Of(evaluation)
    const storyIds = brief ? numberStories(brief).map((s) => s.id) : []
    const screenNames = wireframes?.screens.map((s) => s.name) ?? []

    const complete = draft.overview && draft.features && draft.quality
    const srs = complete
      ? tidySrs({ overview: draft.overview, features: draft.features!.features, quality: draft.quality } as never, storyIds, screenNames)
      : undefined
    const failed = await store({
      ...evaluation,
      srsDraft: draft,
      stageData: { ...evaluation.stageData, stage5: { ...stage5Of(evaluation), srs } },
    })
    if (failed) return failed

    const missing = (['overview', 'features', 'quality'] as const).filter((p) => !draft[p])
    let reply = `SRS ${part} saved.`
    if (part === 'features') {
      // How the server numbered the requirements, so the write-up can use the same ids
      const numbered = numberRequirements({ features: draft.features!.features } as never)
      const byFeature = new Map<string, string[]>()
      for (const r of numbered) byFeature.set(r.feature, [...(byFeature.get(r.feature) ?? []), r.id])
      reply += ` Requirements numbered: ${[...byFeature].map(([f, ids]) => `${f}: ${ids[0]}${ids.length > 1 ? `–${ids[ids.length - 1]}` : ''}`).join('; ')}.`
    }
    if (!srs) return ok(`${reply} Still to save: ${missing.map((p) => `save_srs_${p}`).join(', ')}. The document is complete once all three parts are saved.`)

    const requirements = numberRequirements(srs as never)
    const traced = new Set(requirements.flatMap((r) => r.stories))
    const uncovered = storyIds.filter((id) => !traced.has(id))
    const s = srs as { features: unknown[]; quality: Record<string, unknown[]> }
    const nfrs = ['performance', 'safety', 'security', 'quality', 'businessRules'].reduce((n, k) => n + (s.quality[k]?.length ?? 0), 0)
    return ok(
      `${reply} The SRS is complete: ${s.features.length} features, ${requirements.length} functional and ${nfrs} non-functional requirements, ${s.quality.entities.length} data entities.` +
        (storyIds.length
          ? uncovered.length
            ? `\nTraceability: ${uncovered.join(', ')} have no requirement. Add requirements for them and call save_srs_features again with all the features.`
            : `\nTraceability: every one of the ${storyIds.length} user stories is covered by at least one requirement.`
          : '\nThere is no story map, so requirements can’t be traced to stories.') +
        `\nLink: ${link(evaluationId)}\n\n${SRS_WRITEUP}`
    )
  }

  const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }

  server.registerTool(
    'save_srs_overview',
    {
      title: 'Save the SRS overview',
      description: 'Save part 1 of the SRS: introduction, overall description, and interfaces. Call after save_wireframes.',
      inputSchema: srsOverviewInput,
      annotations: write,
    },
    async ({ evaluationId, ...raw }) => {
      const parsed = srsOverviewSchema.safeParse(raw)
      if (!parsed.success) return fail(`The overview is incomplete: ${issues(parsed.error)}. Fix it and call save_srs_overview again.`)
      return saveSrsPart(evaluationId, 'overview', parsed.data)
    }
  )

  server.registerTool(
    'save_srs_features',
    {
      title: 'Save the SRS features',
      description:
        'Save part 2 of the SRS: system features with their functional requirements, each tracing to story ids and screen names. Saving again replaces all the features.',
      inputSchema: srsFeaturesInput,
      annotations: write,
    },
    async ({ evaluationId, ...raw }) => {
      const parsed = srsFeaturesSchema.safeParse(raw)
      if (!parsed.success) return fail(`The features are incomplete: ${issues(parsed.error)}. Fix them and call save_srs_features again.`)
      return saveSrsPart(evaluationId, 'features', parsed.data)
    }
  )

  server.registerTool(
    'save_srs_quality',
    {
      title: 'Save the SRS quality and data',
      description: 'Save part 3 of the SRS: non-functional requirements, the data model, data retention, and open questions.',
      inputSchema: srsQualityInput,
      annotations: write,
    },
    async ({ evaluationId, ...raw }) => {
      const parsed = srsQualitySchema.safeParse(raw)
      if (!parsed.success) return fail(`The quality part is incomplete: ${issues(parsed.error)}. Fix it and call save_srs_quality again.`)
      return saveSrsPart(evaluationId, 'quality', parsed.data)
    }
  )
}
