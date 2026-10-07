import type { Srs } from '@/lib/schemas/srs'

/**
 * The SRS's data model as a diagram in SVG: each entity a box with its key
 * fields, and a line for each relation, labelled, with a crow's foot on the
 * "many" end. Relations are written as "<Entity> has many <Entity>", "has
 * one", or "belongs to"; one that doesn't name two known entities stays in
 * the text but isn't drawn. Entities sit round an ellipse, so the lines run
 * across the open middle rather than through other boxes.
 */

type Entity = Srs['quality']['entities'][number]
export interface Link {
  from: string
  to: string
  kind: 'has many' | 'has one' | 'belongs to'
}

const C = { ink: '#1c1f24', soft: '#4a5260', line: '#9aa1ac', fill: '#eceef1', paper: '#ffffff' }
const FONT = `font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"`
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const cut = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t)

// "Products" and "product" both name the entity "Product"
const singular = (t: string) => t.toLowerCase().trim().replace(/ies$/, 'y').replace(/(s|x|ch|sh)es$/, '$1').replace(/s$/, '')

/** The relations that name two of the entities, each pair once. */
export function linksOf(entities: Entity[]): Link[] {
  const byName = new Map(entities.map((e) => [singular(e.name), e.name]))
  const links: Link[] = []
  for (const e of entities) {
    for (const r of e.relations) {
      const m = r.match(/^(?:(?:an?|each|every|one)\s+)?(.+?)\s+(has many|has one|has an?|belongs to)\s+(?:(?:an?|many|one|several)\s+)?(.+?)\.?$/i)
      if (!m) continue
      const from = byName.get(singular(m[1]))
      const to = byName.get(singular(m[3]))
      if (!from || !to || from === to) continue
      const kind = m[2].toLowerCase().startsWith('has many') ? 'has many' : m[2].toLowerCase() === 'belongs to' ? 'belongs to' : 'has one'
      const seen = links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))
      if (!seen) links.push({ from, to, kind })
    }
  }
  return links
}

const BOX_W = 156
const ROW = 16
const MAX_FIELDS = 6
const boxHeight = (e: Entity) => 30 + Math.min(e.fields.length, MAX_FIELDS + 1) * ROW + 8

/** The diagram as SVG, or '' when there are fewer than two entities. */
export function renderDataModel(entities: Entity[]): string {
  if (entities.length < 2) return ''
  const W = 680
  const n = entities.length
  const maxH = Math.max(...entities.map(boxHeight))
  // Two entities sit side by side; more go round an ellipse, starting at the top
  const rx = n === 2 ? 190 : (W - BOX_W) / 2 - 12
  const ry = n === 2 ? 0 : n <= 4 ? 120 : 165
  const cy = maxH / 2 + ry + 16
  const H = Math.round(cy + ry + maxH / 2 + 16)
  const pos = new Map(
    entities.map((e, i) => {
      const a = n === 2 ? (i === 0 ? Math.PI : 0) : -Math.PI / 2 + (2 * Math.PI * i) / n
      return [e.name, { x: W / 2 + rx * Math.cos(a), y: cy + ry * Math.sin(a), h: boxHeight(e) }]
    })
  )

  // Where the line from a box's centre towards a point leaves the box
  const edge = (p: { x: number; y: number; h: number }, dx: number, dy: number) => {
    const t = Math.min((BOX_W / 2 + 4) / Math.abs(dx || 1e-9), (p.h / 2 + 4) / Math.abs(dy || 1e-9))
    return { x: p.x + dx * t, y: p.y + dy * t }
  }

  const lines = linksOf(entities)
    .map((l) => {
      const a = pos.get(l.from)!
      const b = pos.get(l.to)!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const [ux, uy] = [dx / len, dy / len]
      const p = edge(a, dx, dy)
      const q = edge(b, -dx, -dy)
      // A crow's foot on the "many" end; a single bar on a "one" end
      const foot =
        l.kind === 'has many'
          ? [-7, 0, 7].map((s) => `<path d="M${q.x - ux * 13} ${q.y - uy * 13} L${q.x - uy * s} ${q.y + ux * s}" stroke="${C.soft}" stroke-width="1.3" fill="none"/>`).join('')
          : `<path d="M${q.x - ux * 8 - uy * 6} ${q.y - uy * 8 + ux * 6} L${q.x - ux * 8 + uy * 6} ${q.y - uy * 8 - ux * 6}" stroke="${C.soft}" stroke-width="1.3"/>`
      const mx = (p.x + q.x) / 2
      const my = (p.y + q.y) / 2
      const label = l.kind
      const lw = label.length * 5.8 + 10
      return (
        `<path d="M${p.x} ${p.y} L${q.x} ${q.y}" stroke="${C.line}" stroke-width="1.3" fill="none"/>` +
        foot +
        `<rect x="${mx - lw / 2}" y="${my - 8}" width="${lw}" height="16" rx="8" fill="${C.paper}" stroke="${C.line}" stroke-width="0.8"/>` +
        `<text x="${mx}" y="${my + 3.5}" ${FONT} font-size="9.5" fill="${C.soft}" text-anchor="middle">${label}</text>`
      )
    })
    .join('')

  const boxes = entities
    .map((e) => {
      const p = pos.get(e.name)!
      const x = p.x - BOX_W / 2
      const y = p.y - p.h / 2
      const shown = e.fields.slice(0, MAX_FIELDS)
      const more = e.fields.length - shown.length
      return (
        `<rect x="${x}" y="${y}" width="${BOX_W}" height="${p.h}" rx="6" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>` +
        `<path d="M${x} ${y + 26} H${x + BOX_W}" stroke="${C.line}"/>` +
        `<rect x="${x + 0.6}" y="${y + 0.6}" width="${BOX_W - 1.2}" height="25.4" rx="5.4" fill="${C.fill}"/>` +
        `<text x="${p.x}" y="${y + 17.5}" ${FONT} font-size="12" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(cut(e.name, 20))}</text>` +
        shown
          .map(
            (f, i) =>
              `<text x="${x + 10}" y="${y + 42 + i * ROW}" ${FONT} font-size="10" fill="${C.ink}">${esc(cut(f.name, 16))}</text>` +
              (f.type ? `<text x="${x + BOX_W - 10}" y="${y + 42 + i * ROW}" ${FONT} font-size="9.5" fill="${C.soft}" text-anchor="end">${esc(cut(f.type, 10))}</text>` : '')
          )
          .join('') +
        (more > 0 ? `<text x="${x + 10}" y="${y + 42 + shown.length * ROW}" ${FONT} font-size="9.5" fill="${C.soft}">+ ${more} more</text>` : '')
      )
    })
    .join('')

  return `<svg class="wireframe desktop" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Data model diagram">${lines}${boxes}</svg>`
}
