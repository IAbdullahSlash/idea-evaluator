import { headingText, NONE, numberSections, type DocumentSpec } from '@/lib/documents/template'

/**
 * A document as plain blocks (paragraphs, lists, tables, figures), read from
 * its outline and the small HTML fragments its section bodies are written in.
 * The PDF and Word writers both render this model, so the two files always
 * hold the same content in the same order. Runs in the browser (DOMParser).
 */

export interface Run {
  text: string
  bold?: boolean
  italic?: boolean
  strike?: boolean
  /** Secondary text, in grey and slightly smaller. */
  meta?: boolean
  link?: string
}

export interface Cell {
  blocks: Block[]
  header: boolean
  numeric: boolean
  colSpan: number
}

export interface Row {
  cells: Cell[]
  /** A totals row, a group's heading row, or a story map's activity band. */
  style?: 'total' | 'group' | 'activity'
}

export interface TableModel {
  head: Cell[]
  rows: Row[]
  storymap: boolean
}

export type Block =
  | { kind: 'para'; runs: Run[]; style?: 'empty' | 'meta' | 'callout' | 'vision' }
  | { kind: 'subheading'; runs: Run[] }
  | { kind: 'list'; items: Run[][] }
  | { kind: 'table'; table: TableModel }
  | { kind: 'columns'; columns: Block[][] }
  | { kind: 'figure'; svg: string; width: number; height: number; mobile: boolean }
  | { kind: 'card'; id: string; runs: Run[] }
  /** Blocks to keep on one page if they fit. */
  | { kind: 'group'; blocks: Block[] }

export interface ModelSection {
  number: string
  depth: number
  /** The heading as printed, without its number. */
  title: string
  appendix: boolean
  blocks: Block[]
  /** Short enough to keep on one page with its heading. */
  keepTogether: boolean
}

export interface DocumentModel {
  kind: string
  title: string
  summary?: string
  meta: { label: string; value: string }[]
  revisions: { version: string; date: string; description: string }[]
  sections: ModelSection[]
  colophon?: string
  /** "Title · Kind", printed at the top of every page after the cover. */
  running: string
}

// ── inline text ──────────────────────────────────────────────────────────

type Format = Omit<Run, 'text'>

function inline(node: Node, format: Format, out: Run[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ')
    if (text) out.push({ text, ...format })
    return
  }
  if (!(node instanceof Element)) return
  const tag = node.tagName.toLowerCase()
  if (tag === 'br') {
    out.push({ text: '\n', ...format })
    return
  }
  const next: Format = { ...format }
  if (tag === 'b' || tag === 'strong') next.bold = true
  if (tag === 'i' || tag === 'em') next.italic = true
  if (tag === 's') next.strike = true
  if (node.classList.contains('meta')) next.meta = true
  if (tag === 'a' && /^https?:\/\//i.test(node.getAttribute('href') ?? '')) next.link = node.getAttribute('href')!
  node.childNodes.forEach((child) => inline(child, next, out))
}

/** Join neighbouring runs with the same format, and trim the ends of the line. */
function tidy(runs: Run[]): Run[] {
  const merged: Run[] = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && last.text !== '\n' && r.text !== '\n' && JSON.stringify({ ...last, text: '' }) === JSON.stringify({ ...r, text: '' })) last.text += r.text
    else merged.push({ ...r })
  }
  // No space at the start or end of a line, including around line breaks
  merged.forEach((r, i) => {
    if (i === 0 || merged[i - 1].text === '\n') r.text = r.text.replace(/^ +/, '')
    if (i === merged.length - 1 || merged[i + 1].text === '\n') r.text = r.text.replace(/ +$/, '')
  })
  return merged.filter((r) => r.text)
}

const runsOf = (el: Element, format: Format = {}) => {
  const out: Run[] = []
  el.childNodes.forEach((child) => inline(child, format, out))
  return tidy(out)
}

// ── blocks ───────────────────────────────────────────────────────────────

const BLOCK_TAGS = new Set(['p', 'div', 'ul', 'ol', 'table', 'figure', 'h4', 'h3', 'section'])

/** Mixed content (text and inline tags among blocks) as blocks: loose text becomes paragraphs. */
function flow(parent: Element): Block[] {
  const blocks: Block[] = []
  let pending: Run[] = []
  const flush = () => {
    const runs = tidy(pending)
    if (runs.length) blocks.push({ kind: 'para', runs })
    pending = []
  }
  parent.childNodes.forEach((node) => {
    if (node instanceof Element && BLOCK_TAGS.has(node.tagName.toLowerCase())) {
      flush()
      blocks.push(...block(node))
    } else inline(node, {}, pending)
  })
  flush()
  return blocks
}

function block(el: Element): Block[] {
  const tag = el.tagName.toLowerCase()
  const has = (c: string) => el.classList.contains(c)

  if (tag === 'p') {
    const runs = runsOf(el)
    return runs.length ? [{ kind: 'para', runs, style: has('empty') ? 'empty' : has('meta') ? 'meta' : undefined }] : []
  }
  if (tag === 'h3' || tag === 'h4') return [{ kind: 'subheading', runs: runsOf(el) }]
  if (tag === 'ul' || tag === 'ol') {
    return [{ kind: 'list', items: Array.from(el.children).filter((li) => li.tagName.toLowerCase() === 'li').map((li) => runsOf(li)) }]
  }
  if (tag === 'table') return [{ kind: 'table', table: tableOf(el) }]
  if (tag === 'figure') {
    const svg = el.querySelector('svg')
    if (!svg) return flow(el)
    const [, , w, h] = (svg.getAttribute('viewBox') ?? '0 0 680 400').split(/\s+/).map(Number)
    return [{ kind: 'figure', svg: svg.outerHTML, width: w || 680, height: h || 400, mobile: svg.classList.contains('mobile') }]
  }
  if (has('callout')) return [{ kind: 'para', runs: runsOf(el), style: has('vision') ? 'vision' : 'callout' }]
  if (has('card')) {
    const id = el.querySelector('.id')?.textContent?.trim() ?? ''
    const rest = el.cloneNode(true) as Element
    rest.querySelector('.id')?.remove()
    return [{ kind: 'card', id, runs: runsOf(rest) }]
  }
  if (has('wire-meta')) {
    const parts = Array.from(el.children).map((c) => c.textContent?.trim()).filter(Boolean)
    return [{ kind: 'para', runs: [{ text: parts.join('   ·   '), meta: true }], style: 'meta' }]
  }
  if (has('cols') || has('cols3')) return [{ kind: 'columns', columns: Array.from(el.children).map((c) => flow(c)) }]
  if (has('block')) return [{ kind: 'group', blocks: flow(el) }]
  return flow(el)
}

function cellOf(el: Element): Cell {
  return {
    blocks: flow(el),
    header: el.tagName.toLowerCase() === 'th',
    numeric: el.classList.contains('num'),
    colSpan: Number(el.getAttribute('colspan')) || 1,
  }
}

function tableOf(el: Element): TableModel {
  const headRow = el.querySelector('thead tr')
  const bodyRows = Array.from(el.querySelectorAll('tbody tr'))
  return {
    storymap: el.classList.contains('storymap'),
    head: headRow ? Array.from(headRow.children).map(cellOf) : [],
    rows: bodyRows.map((tr) => ({
      cells: Array.from(tr.children).map(cellOf),
      style: tr.classList.contains('total') ? 'total' : tr.classList.contains('group') ? 'group' : tr.classList.contains('activity') ? 'activity' : undefined,
    })),
  }
}

function parseBody(html: string): Block[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return flow(doc.body)
}

// ── the document ─────────────────────────────────────────────────────────

// A subsection this short stays on one page with its heading, so a heading is never left alone
// at the foot of a page. Length is judged by characters and by lines (table rows, list items,
// paragraphs), since a table is tall for its character count.
const KEEP_TOGETHER_CHARS = 1200
const KEEP_TOGETHER_LINES = 8
const lineCount = (html: string) => (html.match(/<(tr|li|p|h4)[\s>]/g) ?? []).length

export function toModel(spec: DocumentSpec): DocumentModel {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const all = numberSections(spec.sections)
  const sections = all.map((item): ModelSection => {
    const { section, depth } = item
    const body = section.body?.trim() ?? ''
    const hasChildren = Boolean(section.children?.length)
    const blocks = body ? parseBody(body) : []
    // A leaf section with nothing to say keeps its place and says so; a parent's subsections speak for it
    if (!blocks.length && !hasChildren) blocks.push({ kind: 'para', runs: [{ text: section.empty ?? NONE }], style: 'empty' })
    return {
      number: item.number,
      depth,
      title: headingText(item),
      appendix: Boolean(section.appendix),
      blocks,
      keepTogether:
        depth > 1 && !hasChildren && (Boolean(section.keepTogether) || (body.length < KEEP_TOGETHER_CHARS && lineCount(body) <= KEEP_TOGETHER_LINES)),
    }
  })
  return {
    kind: spec.kind,
    title: spec.title,
    summary: spec.summary,
    meta: [...spec.meta, { label: 'Date', value: date }].filter((m) => m.value),
    revisions: spec.revisions ?? [],
    sections,
    colophon: spec.colophon,
    running: `${spec.title} · ${spec.kind}`,
  }
}

/** A section's number as printed before its heading; appendices carry theirs in the title. */
export const sectionNumber = (s: ModelSection) => (s.appendix && s.depth === 1 ? '' : s.number)

/** The plain text of a table cell, e.g. a column heading. */
export const cellText = (cl?: Cell) => cl?.blocks.map((b) => (b.kind === 'para' ? b.runs.map((r) => r.text).join('') : '')).join('') ?? ''

/** Columns whose heading names short values (numbers, ids, dates), and their width in millimetres. */
export const NARROW_COLUMNS: Record<string, number> = { '#': 8, ID: 16, FTE: 14, Mark: 16, Answer: 20, Priority: 20, Version: 20, Date: 26 }

/** The document's colours, shared by both writers (hex without #). */
export const COLORS = {
  ink: '1c1f24',
  soft: '4a5260',
  pencil: '7a8291',
  rule: 'dde1e6',
  marker: 'd6392f',
  fill: 'f4f5f7',
  card: 'fff8d6',
  cardEdge: 'e8dc9c',
} as const
