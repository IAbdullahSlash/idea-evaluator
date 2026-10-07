import { numberStories, releaseOrder, type Brief } from '@/lib/schemas/brief'
import { esc, keep, table, type DocSection } from '@/lib/documents/template'

/**
 * The product vision and user story map as document sections, for the SRS:
 * the vision statement, then the map itself (activities down the page, one
 * column per release), then each release's stories as a list.
 */

export interface PlannedVersion {
  version: string
  timeline?: string
}

/** The vision statement, as one sentence in Geoffrey Moore's template. */
export const visionStatement = (b: Brief) =>
  `<div class="callout vision">For <b>${esc(b.vision.targetUsers)}</b> who ${esc(b.vision.need)}, <b>${esc(b.vision.productName)}</b> is a ${esc(b.vision.category)} that <b>${esc(b.vision.benefit)}</b>. Unlike ${esc(b.vision.alternative)}, it ${esc(b.vision.difference)}.</div>`

// "As a gym owner, I want to export reports so that …" → "Export reports", for the map's cards
const want = (story: string) => {
  const m = story.match(/I want (?:the (?:system|app) to |to )?(.+?)(?:,? so that\b|$)/i)
  const core = (m?.[1] ?? story).trim().replace(/[.]$/, '')
  return core.charAt(0).toUpperCase() + core.slice(1)
}

export function storyMapSections(b: Brief, versions: PlannedVersion[]): DocSection[] {
  const releases = releaseOrder(b, versions.map((v) => v.version))
  const stories = numberStories(b)
  const cell = (task: string, activity: string, release: string) =>
    stories
      .filter((st) => st.task === task && st.activity === activity && st.release === release)
      .map((st) => `<div class="card"><span class="id">${st.id}</span>${esc(want(st.title))}</div>`)
      .join('')
  const releaseNote = (r: string) => {
    const v = versions.find((x) => x.version === r)
    return v ? `${esc(r)}${v.timeline ? ` · ${esc(v.timeline)}` : ''}` : r === 'Later' ? 'Later · not in this plan' : esc(r)
  }

  // Activities run down the page in the order users go through them, and each release is a column,
  // so the map fits a portrait page however many tasks there are
  const map =
    `<p class="meta">Read top to bottom: what users do, in order. Each column is a release; the first is the smallest version people can use.</p>` +
    `<table class="storymap"><thead><tr><th class="task">Activity and task</th>${releases.map((r) => `<th class="rel">${releaseNote(r)}</th>`).join('')}</tr></thead><tbody>` +
    b.activities
      .map(
        (a) =>
          `<tr class="activity"><th colspan="${releases.length + 1}">${esc(a.name)}</th></tr>` +
          a.tasks.map((t) => `<tr><th class="task">${esc(t.name)}</th>${releases.map((r) => `<td>${cell(t.name, a.name, r)}</td>`).join('')}</tr>`).join('')
      )
      .join('') +
    `</tbody></table>`

  return [
    { title: 'The map', body: map },
    {
      title: 'Releases',
      body: releases
        .map((r) =>
          keep(
            releaseNote(r),
            table(
              ['ID', 'Story', 'Activity'],
              stories.filter((st) => st.release === r).map((st) => [`<b>${st.id}</b>`, esc(st.title), esc(st.activity)])
            )
          )
        )
        .join(''),
    },
  ]
}
