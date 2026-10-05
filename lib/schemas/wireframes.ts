import { z } from 'zod'

/**
 * Wireframes: the key screens, each described as a stack of standard parts
 * that lib/documents/wireframe.ts draws as low-fidelity grey boxes. The model
 * only picks parts and labels; it never draws, so every screen looks the same
 * way and always renders.
 */

const text = z.string().trim().min(1)
const label = z.string().catch('').transform((t) => t.trim().slice(0, 60))
const labels = (max: number, length = 40) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().slice(0, length))
        .slice(0, max)
    )
const count = (min: number, max: number, fallback: number) => z.coerce.number().int().min(min).max(max).catch(fallback)

// The parts a screen is built from. Anything else the model invents is dropped.
const header = z.object({ kind: z.literal('header'), title: label, items: labels(5) })
const heading = z.object({ kind: z.literal('heading'), text: label })
const paragraph = z.object({ kind: z.literal('text'), lines: count(1, 4, 2) })
const button = z.object({ kind: z.literal('button'), label, primary: z.boolean().catch(false) })
const input = z.object({ kind: z.enum(['input', 'select', 'search', 'checkbox']), label })
const list = z.object({ kind: z.literal('list'), items: labels(6) })
const table = z.object({ kind: z.literal('table'), columns: labels(5), rows: count(1, 6, 3) })
const cards = z.object({ kind: z.literal('cards'), items: labels(6) })
const chart = z.object({ kind: z.literal('chart'), label, type: z.enum(['bar', 'line', 'pie']).catch('bar') })
const media = z.object({ kind: z.enum(['image', 'camera', 'map', 'video']), label })
const stats = z.object({ kind: z.literal('stats'), items: labels(4) })
const tabs = z.object({ kind: z.literal('tabs'), items: labels(5) })

const leaf = z.union([header, heading, paragraph, button, input, list, table, cards, chart, media, stats, tabs])
export type WireLeaf = z.infer<typeof leaf>

/** Side by side: a row of two or three parts. */
const row = z.object({
  kind: z.literal('row'),
  children: z
    .array(z.unknown())
    .catch([])
    .transform((items) => items.flatMap((raw) => {
      const p = leaf.safeParse(raw)
      return p.success ? [p.data] : []
    }).slice(0, 3)),
})
export type WireElement = WireLeaf | z.infer<typeof row>

const elements = z
  .array(z.unknown())
  .catch([])
  .transform((items) =>
    items
      .flatMap((raw): WireElement[] => {
        const r = row.safeParse(raw)
        if (r.success) return r.data.children.length ? [r.data] : []
        const l = leaf.safeParse(raw)
        return l.success ? [l.data] : []
      })
      .slice(0, 14)
  )

export const screenSchema = z.object({
  name: text,
  purpose: text,
  device: z.enum(['desktop', 'mobile']).catch('desktop'),
  // Story IDs (US-n) this screen serves
  stories: labels(8),
  // Navigation items down the left side (desktop only)
  sidebar: labels(7),
  elements: elements.refine((l) => l.length > 0, 'No elements'),
  // Names of the screens this one leads to
  leadsTo: labels(4),
  // Sentences, not labels: they get more room
  notes: labels(4, 200),
})

export type Screen = z.infer<typeof screenSchema>

export const wireframesSchema = z.object({
  screens: z
    .array(z.unknown())
    .catch([])
    .transform((items) => items.flatMap((raw) => {
      const p = screenSchema.safeParse(raw)
      return p.success ? [p.data] : []
    }).slice(0, 8))
    .refine((l) => l.length > 0, 'No screens'),
})

export type Wireframes = z.infer<typeof wireframesSchema>

/** Drop story IDs that aren't in the story map, and links to screens that don't exist. */
export function tidyWireframes(w: Wireframes, storyIds: string[]): Wireframes {
  const ids = new Set(storyIds)
  const names = new Set(w.screens.map((s) => s.name.toLowerCase()))
  return {
    screens: w.screens.map((s) => ({
      ...s,
      stories: storyIds.length ? s.stories.filter((id) => ids.has(id)) : [],
      leadsTo: s.leadsTo.filter((n) => names.has(n.toLowerCase()) && n.toLowerCase() !== s.name.toLowerCase()),
    })),
  }
}
