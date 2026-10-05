import type { Screen, WireElement, WireLeaf } from '@/lib/schemas/wireframes'

/**
 * Draws a screen as a low-fidelity wireframe in SVG: grey boxes, real labels
 * on controls, and bars for body text. Parts are stacked top to bottom (a
 * "row" puts two or three side by side) inside a desktop window or a phone
 * frame. Sizes are fixed per part, so layout needs no measuring.
 */

const C = {
  ink: '#1c1f24',
  soft: '#4a5260',
  line: '#9aa1ac',
  fill: '#eceef1',
  fill2: '#dfe2e7',
  paper: '#ffffff',
  accent: '#d6392f',
}
const FONT = `font-family="-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"`
const GAP = 10

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Text cut to the width available (about 0.55em per character). */
function fit(t: string, width: number, size: number): string {
  const max = Math.max(3, Math.floor(width / (size * 0.56)))
  return esc(t.length > max ? `${t.slice(0, max - 1)}…` : t)
}

const txt = (x: number, y: number, t: string, width: number, size = 11, opts: { weight?: number; fill?: string; anchor?: string } = {}) =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? C.soft}"${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}>${fit(t, width, size)}</text>`
const rect = (x: number, y: number, w: number, h: number, fill: string, stroke = 'none', r = 4) =>
  `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`
// A grey bar standing in for a line of body text
const bar = (x: number, y: number, w: number, h = 7) => rect(x, y, w, h, C.fill2, 'none', 3)

/** Height of a part at a given width. */
function heightOf(el: WireElement, width: number): number {
  switch (el.kind) {
    case 'row':
      return Math.max(...el.children.map((c) => heightOf(c, (width - GAP * (el.children.length - 1)) / el.children.length)))
    case 'header': return 40
    case 'heading': return 24
    case 'text': return el.lines * 14
    case 'button': return 34
    case 'input': case 'select': case 'search': return el.label && el.kind !== 'search' ? 50 : 34
    case 'checkbox': return 22
    case 'list': return Math.max(1, el.items.length || 3) * 34
    case 'table': return 28 + el.rows * 26
    case 'cards': {
      const cols = width > 360 ? 3 : width > 200 ? 2 : 1
      return Math.ceil(Math.max(1, el.items.length || 3) / cols) * 76
    }
    case 'chart': return 150
    case 'image': case 'camera': case 'map': case 'video': return el.kind === 'camera' ? 200 : 130
    case 'stats': return 62
    case 'tabs': return 32
  }
}

function drawLeaf(el: WireLeaf, x: number, y: number, w: number): string {
  switch (el.kind) {
    case 'header': {
      const items = el.items.slice(0, Math.max(0, Math.floor(w / 90) - 1))
      return (
        rect(x, y, w, 40, C.fill) +
        rect(x + 12, y + 13, 14, 14, C.line, 'none', 3) +
        txt(x + 34, y + 25, el.title || 'App', w * 0.4, 12, { weight: 700, fill: C.ink }) +
        items.map((it, i) => txt(x + w - 12 - (items.length - i) * 84 + 84, y + 25, it, 76, 10, { anchor: 'end' })).join('')
      )
    }
    case 'heading':
      return txt(x, y + 17, el.text || 'Title', w, 15, { weight: 700, fill: C.ink })
    case 'text':
      return Array.from({ length: el.lines }, (_, i) => bar(x, y + i * 14 + 3, i === el.lines - 1 && el.lines > 1 ? w * 0.6 : w)).join('')
    case 'button': {
      const bw = Math.min(w, Math.max(110, el.label.length * 7 + 32))
      return (
        rect(x, y, bw, 34, el.primary ? C.ink : C.paper, el.primary ? 'none' : C.line, 6) +
        txt(x + bw / 2, y + 21, el.label || 'Button', bw - 16, 11, { weight: 600, fill: el.primary ? '#fff' : C.ink, anchor: 'middle' })
      )
    }
    case 'input': case 'select': case 'search': {
      const top = el.label && el.kind !== 'search' ? 16 : 0
      return (
        (top ? txt(x, y + 11, el.label, w, 10, { weight: 600 }) : '') +
        rect(x, y + top, w, 34, C.paper, C.line, 5) +
        (el.kind === 'search'
          ? `<circle cx="${x + 16}" cy="${y + 16}" r="5" fill="none" stroke="${C.line}" stroke-width="1.5"/><line x1="${x + 20}" y1="${y + 20}" x2="${x + 24}" y2="${y + 24}" stroke="${C.line}" stroke-width="1.5"/>` +
            txt(x + 32, y + 21, el.label || 'Search', w - 40, 10, { fill: C.line })
          : el.kind === 'select'
            ? `<path d="M${x + w - 20} ${y + top + 14} l5 6 l5 -6" fill="none" stroke="${C.line}" stroke-width="1.5"/>`
            : '')
      )
    }
    case 'checkbox':
      return rect(x, y + 3, 16, 16, C.paper, C.line, 3) + txt(x + 24, y + 15, el.label || 'Option', w - 24, 10)
    case 'list': {
      const items = el.items.length ? el.items : ['', '', '']
      return items
        .map((it, i) => {
          const ry = y + i * 34
          return (
            `<circle cx="${x + 13}" cy="${ry + 15}" r="10" fill="${C.fill2}"/>` +
            (it ? txt(x + 32, ry + 19, it, w - 56, 11, { fill: C.ink }) : bar(x + 32, ry + 12, w * 0.5)) +
            `<path d="M${x + w - 14} ${ry + 10} l5 5 l-5 5" fill="none" stroke="${C.line}" stroke-width="1.5"/>` +
            `<line x1="${x}" y1="${ry + 31}" x2="${x + w}" y2="${ry + 31}" stroke="${C.fill2}"/>`
          )
        })
        .join('')
    }
    case 'table': {
      const cols = el.columns.length ? el.columns : ['', '', '']
      const cw = w / cols.length
      return (
        rect(x, y, w, 28, C.fill, 'none', 3) +
        cols.map((c, i) => (c ? txt(x + i * cw + 8, y + 18, c, cw - 12, 10, { weight: 600 }) : bar(x + i * cw + 8, y + 11, cw * 0.5))).join('') +
        Array.from({ length: el.rows }, (_, r) =>
          cols.map((_, i) => bar(x + i * cw + 8, y + 28 + r * 26 + 10, cw * (i === 0 ? 0.65 : 0.45))).join('') +
          `<line x1="${x}" y1="${y + 28 + (r + 1) * 26}" x2="${x + w}" y2="${y + 28 + (r + 1) * 26}" stroke="${C.fill2}"/>`
        ).join('')
      )
    }
    case 'cards': {
      const items = el.items.length ? el.items : ['', '', '']
      const cols = w > 360 ? 3 : w > 200 ? 2 : 1
      const cw = (w - GAP * (cols - 1)) / cols
      return items
        .map((it, i) => {
          const cx = x + (i % cols) * (cw + GAP)
          const cy = y + Math.floor(i / cols) * 76
          return (
            rect(cx, cy, cw, 66, C.paper, C.line, 6) +
            (it ? txt(cx + 10, cy + 20, it, cw - 20, 11, { weight: 600, fill: C.ink }) : bar(cx + 10, cy + 13, cw * 0.5)) +
            bar(cx + 10, cy + 32, cw - 20, 6) +
            bar(cx + 10, cy + 44, (cw - 20) * 0.6, 6)
          )
        })
        .join('')
    }
    case 'chart': {
      const ph = 150, top = el.label ? 18 : 6
      const frame = rect(x, y, w, ph, C.paper, C.line, 6) + (el.label ? txt(x + 10, y + 15, el.label, w - 20, 10, { weight: 600 }) : '')
      const ix = x + 14, iy = y + top + 6, iw = w - 28, ih = ph - top - 18
      if (el.type === 'pie') {
        const r = Math.min(iw, ih) / 2 - 2, cx = x + w / 2, cy = iy + ih / 2
        return frame + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.fill2}"/><path d="M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx + r * 0.95} ${cy + r * 0.31} Z" fill="${C.line}"/>`
      }
      const n = 7
      const hs = [0.45, 0.7, 0.55, 0.85, 0.6, 0.95, 0.75]
      if (el.type === 'line') {
        const pts = hs.map((h, i) => `${ix + (iw / (n - 1)) * i},${iy + ih - h * ih}`).join(' ')
        return frame + `<line x1="${ix}" y1="${iy + ih}" x2="${ix + iw}" y2="${iy + ih}" stroke="${C.fill2}"/><polyline points="${pts}" fill="none" stroke="${C.line}" stroke-width="2"/>`
      }
      const bw = iw / n
      return frame + hs.map((h, i) => rect(ix + i * bw + bw * 0.2, iy + ih - h * ih, bw * 0.6, h * ih, i === 5 ? C.line : C.fill2, 'none', 2)).join('')
    }
    case 'image': case 'camera': case 'map': case 'video': {
      const h = el.kind === 'camera' ? 200 : 130
      const inner =
        el.kind === 'camera'
          ? // A scanning frame: corner brackets in the middle
            (() => {
              const s = Math.min(w, h) * 0.45, cx = x + w / 2 - s / 2, cy = y + h / 2 - s / 2 - 8, k = 16
              const corner = (px: number, py: number, dx: number, dy: number) => `<path d="M${px} ${py + dy * k} V${py} H${px + dx * k}" fill="none" stroke="#fff" stroke-width="3"/>`
              return corner(cx, cy, 1, 1) + corner(cx + s, cy, -1, 1) + corner(cx, cy + s, 1, -1) + corner(cx + s, cy + s, -1, -1)
            })()
          : `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" stroke="${C.line}"/><line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" stroke="${C.line}"/>`
      return (
        rect(x, y, w, h, el.kind === 'camera' ? '#3a3f47' : C.fill, 'none', 6) +
        inner +
        (el.label ? txt(x + w / 2, y + h - 10, el.label, w - 16, 10, { anchor: 'middle', fill: el.kind === 'camera' ? '#fff' : C.soft }) : '')
      )
    }
    case 'stats': {
      const items = el.items.length ? el.items : ['', '', '']
      const sw = (w - GAP * (items.length - 1)) / items.length
      return items
        .map((it, i) => {
          const sx = x + i * (sw + GAP)
          return rect(sx, y, sw, 62, C.paper, C.line, 6) + rect(sx + 10, y + 12, Math.min(48, sw * 0.4), 14, C.fill2, 'none', 3) + (it ? txt(sx + 10, y + 48, it, sw - 20, 10) : bar(sx + 10, y + 40, sw * 0.5))
        })
        .join('')
    }
    case 'tabs': {
      const items = el.items.length ? el.items : ['', '', '']
      const tw = Math.min(110, w / items.length)
      return (
        `<line x1="${x}" y1="${y + 31}" x2="${x + w}" y2="${y + 31}" stroke="${C.fill2}"/>` +
        items
          .map((it, i) => txt(x + i * tw + tw / 2, y + 20, it || 'Tab', tw - 10, 11, { anchor: 'middle', weight: i === 0 ? 700 : 400, fill: i === 0 ? C.ink : C.soft }) + (i === 0 ? rect(x + i * tw + 8, y + 29, tw - 16, 3, C.ink, 'none', 1) : ''))
          .join('')
      )
    }
  }
}

function draw(el: WireElement, x: number, y: number, w: number): string {
  if (el.kind !== 'row') return drawLeaf(el, x, y, w)
  const n = el.children.length
  const cw = (w - GAP * (n - 1)) / n
  return el.children.map((c, i) => drawLeaf(c, x + i * (cw + GAP), y, cw)).join('')
}

/** The screen as an SVG wireframe, sized to fill the width of its container. */
export function renderWireframe(screen: Screen): string {
  const mobile = screen.device === 'mobile'
  const W = mobile ? 300 : 680
  const pad = mobile ? 16 : 20
  // The header bar spans the full width; everything else sits in the content area
  const header = screen.elements.find((e) => e.kind === 'header')
  const body = screen.elements.filter((e) => e !== header)
  const sidebar = !mobile && screen.sidebar.length ? 150 : 0
  const contentX = pad + sidebar
  const contentW = W - contentX - pad
  const chromeTop = mobile ? 34 : 30 // phone status bar / browser bar
  const headerH = header ? 40 : 0

  let y = chromeTop + headerH + pad
  const parts: string[] = []
  for (const el of body) {
    parts.push(draw(el, contentX, y, contentW))
    y += heightOf(el, contentW) + GAP + 4
  }
  const H = Math.max(y + pad - GAP, mobile ? 540 : 360)

  const frame = mobile
    ? rect(1, 1, W - 2, H - 2, C.paper, C.ink, 26) +
      rect(W / 2 - 40, 10, 80, 14, C.ink, 'none', 7) // the notch
    : rect(1, 1, W - 2, H - 2, C.paper, C.line, 8) +
      `<path d="M1 30 H${W - 1}" stroke="${C.line}"/>` +
      [0, 1, 2].map((i) => `<circle cx="${16 + i * 14}" cy="15" r="4.5" fill="${C.fill2}"/>`).join('') +
      rect(70, 8, W - 140, 14, C.fill, 'none', 7)

  // The sidebar highlights this screen's own item, or the first if none matches
  const words = (t: string) => t.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
  const here = screen.sidebar.findIndex((it) => words(it).some((w) => words(screen.name).includes(w)))
  const current = here >= 0 ? here : 0
  const side = sidebar
    ? rect(1, chromeTop + headerH, sidebar, H - chromeTop - headerH - 1, C.fill, 'none', 0) +
      screen.sidebar
        .map((it, i) =>
          (i === current ? rect(8, chromeTop + headerH + 12 + i * 28, sidebar - 16, 24, C.fill2, 'none', 4) : '') +
          txt(16, chromeTop + headerH + 28 + i * 28, it, sidebar - 24, 11, { weight: i === current ? 700 : 400, fill: i === current ? C.ink : C.soft })
        )
        .join('')
    : ''
  const head = header && header.kind === 'header' ? drawLeaf(header, 1, chromeTop, W - 2) : ''

  return `<svg class="wireframe ${mobile ? 'mobile' : 'desktop'}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(`Wireframe: ${screen.name}`)}">${frame}${side}${head}${parts.join('')}</svg>`
}
