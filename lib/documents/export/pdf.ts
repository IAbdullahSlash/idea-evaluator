import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { cellText, COLORS, NARROW_COLUMNS, sectionNumber, type Block, type Cell, type DocumentModel, type ModelSection, type Run, type TableModel } from '@/lib/documents/export/model'

/**
 * A document model as a PDF, with pdfmake: an A4 cover page, a contents page
 * with page numbers, then the chapters one after another, with a running
 * title at the top and "Page n of m" at the foot. Built in the browser;
 * pdfmake is loaded only when someone downloads.
 *
 * pdfmake can keep a block on one page ("unbreakable") but drops whatever of
 * it doesn't fit on that page, so blocks are only kept together when their
 * estimated height fits comfortably.
 */

const c = (hex: string) => `#${hex}`
const MM = 72 / 25.4
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = { top: 22 * MM, side: 18 * MM, bottom: 20 * MM }
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN.side
// Blocks estimated taller than this are never kept together; a heading is only held with what follows up to SHORT
const FITS = (PAGE_HEIGHT - MARGIN.top - MARGIN.bottom) * 0.8
const SHORT = 260
const KEEP_WHOLE = 320

// ── estimated heights, in points ─────────────────────────────────────────

const LINE = 13.5
const lines = (chars: number, width: number) => Math.max(1, Math.ceil(chars / Math.max(8, width / 5.3)))
const runChars = (runs: Run[]) => runs.reduce((n, r) => n + r.text.length, 0)

function height(list: Block[], width = CONTENT_WIDTH): number {
  return list.reduce((sum, b) => sum + blockHeight(b, width), 0)
}

function blockHeight(b: Block, width: number): number {
  switch (b.kind) {
    case 'para':
      return lines(runChars(b.runs), width - (b.style === 'callout' || b.style === 'vision' ? 14 : 0)) * LINE + (b.style === 'callout' || b.style === 'vision' ? 24 : 6)
    case 'subheading':
      return 28
    case 'list':
      return b.items.reduce((n, item) => n + lines(runChars(item), width - 12) * LINE + 2, 8)
    case 'table': {
      const cols = Math.max(1, b.table.head.length || b.table.rows[0]?.cells.length || 1)
      const row = (cells: Cell[]) => Math.max(...cells.map((cl) => height(cl.blocks, (width / cols) * cl.colSpan - 12)), LINE) + 8
      return (b.table.head.length ? 22 : 0) + b.table.rows.reduce((n, r) => n + row(r.cells), 14)
    }
    case 'columns':
      return Math.max(...b.columns.map((col) => height(col, width / b.columns.length))) + 6
    case 'figure': {
      const maxW = b.mobile ? 62 * MM : width
      const w = Math.min(maxW, ((b.mobile ? 135 : 165) * MM * b.width) / b.height)
      return (w * b.height) / b.width + 12
    }
    case 'card':
      return lines(runChars(b.runs), width) * 11 + 18
    case 'group':
      return height(b.blocks, width) + 6
  }
}

/** Blocks kept on one page when they fit, otherwise left to break. */
const together = (content: Content[], estimate: number): Content[] => (estimate < FITS ? [{ stack: content, unbreakable: true }] : content)

// ── inline text ──────────────────────────────────────────────────────────

const text = (runs: Run[], base: Record<string, unknown> = {}) =>
  runs.map((r) => ({
    text: r.text,
    bold: r.bold || undefined,
    italics: r.italic || undefined,
    decoration: r.strike ? ('lineThrough' as const) : r.link ? ('underline' as const) : undefined,
    decorationColor: r.link ? c(COLORS.marker) : undefined,
    color: r.meta || r.strike ? c(COLORS.pencil) : undefined,
    fontSize: r.meta ? 9 : undefined,
    link: r.link,
    ...base,
  }))

// ── blocks ───────────────────────────────────────────────────────────────

/** A one-cell table with only a left rule, for callouts. */
const callout = (content: Content, fontSize: number): Content => ({
  table: { widths: ['*'], body: [[{ stack: [content], fontSize }]] },
  layout: {
    hLineWidth: () => 0,
    vLineWidth: (i) => (i === 0 ? 2.5 : 0),
    vLineColor: () => c(COLORS.marker),
    paddingLeft: () => 10,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  },
  margin: [0, 6, 0, 8],
})

function blocks(list: Block[], width = CONTENT_WIDTH): Content[] {
  const out: Content[] = []
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    const next = list[i + 1]
    // A small heading stays with what follows it, when that is short enough to move with it
    if (b.kind === 'subheading' && next && blockHeight(next, width) < SHORT) {
      out.push({ stack: [block(b, width), block(next, width)], unbreakable: true })
      i++
    } else out.push(block(b, width))
  }
  return out
}

function block(b: Block, width: number): Content {
  switch (b.kind) {
    case 'para':
      if (b.style === 'callout' || b.style === 'vision') return callout({ text: text(b.runs) }, b.style === 'vision' ? 12.5 : 11.5)
      return {
        text: text(b.runs),
        margin: [0, 2, 0, 3],
        ...(b.style === 'empty' ? { italics: true, color: c(COLORS.pencil) } : b.style === 'meta' ? { color: c(COLORS.pencil), fontSize: 9 } : {}),
      }
    case 'subheading':
      return { text: text(b.runs), fontSize: 11, bold: true, margin: [0, 10, 0, 3] }
    case 'list':
      return { ul: b.items.map((runs) => ({ text: text(runs), margin: [0, 1, 0, 1] })), margin: [0, 2, 0, 6] }
    case 'table':
      return table(b.table, width)
    case 'columns': {
      const gap = 14
      const each = (width - gap * (b.columns.length - 1)) / b.columns.length
      return { columns: b.columns.map((col) => ({ width: '*', stack: blocks(col, each) })), columnGap: gap, margin: [0, 2, 0, 4] }
    }
    case 'figure': {
      // Scaled to the page, and never taller than fits beside its heading
      const maxW = b.mobile ? 62 * MM : width
      const maxH = (b.mobile ? 135 : 165) * MM
      const w = Math.min(maxW, (maxH * b.width) / b.height)
      return { svg: b.svg, width: w, alignment: 'center', margin: [0, 6, 0, 6] }
    }
    case 'card':
      return {
        table: { widths: ['*'], body: [[{ stack: [{ text: b.id, fontSize: 6.5, bold: true, color: c(COLORS.pencil) }, { text: text(b.runs), fontSize: 8.5 }], fillColor: c(COLORS.card) }]] },
        layout: { hLineColor: () => c(COLORS.cardEdge), vLineColor: () => c(COLORS.cardEdge), hLineWidth: () => 0.75, vLineWidth: () => 0.75, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 },
        margin: [0, 0, 0, 4],
      }
    case 'group':
      return { stack: blocks(b.blocks, width), unbreakable: blockHeight(b, width) < FITS || undefined, margin: [0, 0, 0, 6] }
  }
}

function cell(cl: Cell, style: TableModel['rows'][number]['style'] | 'head', storymap: boolean, width: number): TableCell {
  const head = style === 'head'
  const activity = style === 'activity'
  const content = blocks(cl.blocks, width)
  return {
    stack: content.length ? content : [{ text: '' }],
    margin: activity ? [5, 1, 0, 1] : undefined,
    colSpan: cl.colSpan > 1 ? cl.colSpan : undefined,
    alignment: cl.numeric ? 'right' : undefined,
    fillColor: activity ? c(COLORS.ink) : style === 'group' ? c(COLORS.fill) : undefined,
    color: activity ? '#ffffff' : head ? c(storymap ? COLORS.marker : COLORS.pencil) : undefined,
    bold: head || activity || style === 'total' || style === 'group' || (cl.header && storymap) || undefined,
    fontSize: head ? (storymap ? 8 : 7.5) : activity ? 9 : undefined,
    characterSpacing: head && !storymap ? 0.5 : undefined,
  }
}

function table(t: TableModel, width: number): ContentTable {
  const columns = Math.max(t.head.length, ...t.rows.map((r) => r.cells.reduce((n, cl) => n + cl.colSpan, 0)))
  // Numeric columns and short ID columns fit their content; the rest share the width
  const numeric = (i: number) => t.head[i]?.numeric || t.rows.some((r) => r.cells[i]?.numeric)
  const short = (i: number) => cellText(t.head[i]) in NARROW_COLUMNS
  const widths = t.storymap
    ? ['34%', ...Array(columns - 1).fill('*')]
    : Array.from({ length: columns }, (_, i) => (numeric(i) || short(i) ? 'auto' : '*'))
  const each = width / columns

  // pdfmake wants a placeholder cell after each spanning one
  const row = (cells: Cell[], style: TableModel['rows'][number]['style'] | 'head'): TableCell[] =>
    cells.flatMap((cl) => [cell(cl, style, t.storymap, each * cl.colSpan), ...Array(cl.colSpan - 1).fill({})])
  const body = [...(t.head.length ? [row(t.head.map((h) => ({ ...h, blocks: upper(h.blocks, t.storymap) })), 'head')] : []), ...t.rows.map((r) => row(r.cells, r.style))]
  const totalRows = new Set(t.rows.flatMap((r, i) => (r.style === 'total' ? [i + (t.head.length ? 1 : 0)] : [])))

  return {
    // The heading row repeats on each page and never sits at the foot of a page without a row under it
    table: { headerRows: t.head.length ? 1 : 0, keepWithHeaderRows: t.head.length ? 1 : 0, widths, body, dontBreakRows: true },
    fontSize: t.storymap ? 8.5 : 9.5,
    layout: {
      hLineWidth: (i, node) => (i === 0 ? 0 : totalRows.has(i) ? 1.5 : i === 1 && t.head.length ? 0.75 : i === node.table.body.length ? 0.5 : 0.5),
      hLineColor: (i) => (totalRows.has(i) || (i === 1 && t.head.length) ? c(COLORS.ink) : c(COLORS.rule)),
      vLineWidth: () => 0,
      paddingLeft: (i) => (i === 0 ? 0 : 6),
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 4, 0, 10],
  }
}

// Column headings are printed in capitals, like the website's tables
const upper = (list: Block[], storymap: boolean): Block[] =>
  storymap ? list : list.map((b) => (b.kind === 'para' ? { ...b, runs: b.runs.map((r) => ({ ...r, text: r.text.toUpperCase() })) } : b))

// ── sections ─────────────────────────────────────────────────────────────

function heading(s: ModelSection): Content {
  const no = sectionNumber(s)
  const label = [...(no ? [{ text: `${no}  `, color: c(COLORS.marker) }] : []), { text: s.title }]
  const toc = s.depth <= 2
    ? { tocItem: true, tocStyle: s.depth === 1 ? { bold: true } : { color: c(COLORS.soft), fontSize: 9.5 }, tocMargin: s.depth === 1 ? [0, 8, 0, 0] : [22, 3, 0, 0] }
    : {}
  if (s.depth === 1) {
    return {
      stack: [{ text: label, fontSize: 17, bold: true, ...toc }, { canvas: [{ type: 'line', x1: 0, y1: 4, x2: CONTENT_WIDTH, y2: 4, lineWidth: 1.5, lineColor: c(COLORS.ink) }] }],
      margin: [0, 26, 0, 12],
    } as Content
  }
  return { text: label, fontSize: s.depth === 2 ? 12.5 : 11, bold: true, margin: [0, s.depth === 2 ? 16 : 12, 0, 5], ...toc } as Content
}

/**
 * The sections one after another. A heading never ends a page on its own: it is held with the
 * start of its content (and a chapter heading with no content of its own with its first
 * subsection), and a short subsection stays on one page with its heading.
 */
function sections(list: ModelSection[]): Content[] {
  const out: Content[] = []
  let pending: Content[] = []
  let pendingHeight = 0
  for (const s of list) {
    const lead = [...pending, heading(s)]
    const leadHeight = pendingHeight + (s.depth === 1 ? 50 : 32)
    pending = []
    pendingHeight = 0
    if (!s.blocks.length) {
      pending = lead
      pendingHeight = leadHeight
      continue
    }
    // Only a small subsection moves whole to the next page, or a heading with its wireframe;
    // anything bigger would leave too much of the page empty, so it breaks with its heading held
    const whole = leadHeight + height(s.blocks)
    const limit = s.blocks.some((b) => b.kind === 'figure') ? FITS : KEEP_WHOLE
    if (s.keepTogether && whole < limit) {
      out.push({ stack: [...lead, ...blocks(s.blocks)], unbreakable: true })
      continue
    }
    const [first, ...rest] = s.blocks
    out.push(...(blockHeight(first, CONTENT_WIDTH) < SHORT ? together([...lead, ...blocks([first])], leadHeight + blockHeight(first, CONTENT_WIDTH)) : [...lead, ...blocks([first])]))
    out.push(...blocks(rest))
  }
  return [...out, ...pending]
}

function cover(m: DocumentModel): Content[] {
  const meta: Content[] = m.meta.map((x) => ({ stack: [{ text: x.label.toUpperCase(), fontSize: 8, color: c(COLORS.pencil), characterSpacing: 0.6 }, { text: x.value, bold: true }], margin: [0, 0, 0, 10] }))
  const pairs: Content[][] = []
  for (let i = 0; i < meta.length; i += 2) pairs.push([meta[i], meta[i + 1] ?? { text: '' }])
  return [
    { text: m.kind.toUpperCase(), fontSize: 9, bold: true, color: c(COLORS.marker), characterSpacing: 1.2, margin: [0, 55 * MM, 0, 10] },
    { text: m.title, fontSize: 30, bold: true, lineHeight: 1.05 },
    { canvas: [{ type: 'line', x1: 0, y1: 14, x2: CONTENT_WIDTH, y2: 14, lineWidth: 1.5, lineColor: c(COLORS.ink) }], margin: [0, 0, 0, 22] },
    ...(m.summary ? [{ text: m.summary, fontSize: 12, color: c(COLORS.soft), margin: [0, 0, 0, 30] } as Content] : []),
    { table: { widths: ['*', '*'], body: pairs }, layout: 'noBorders' },
  ]
}

export function pdfDefinition(m: DocumentModel): TDocumentDefinitions {
  const revisions: Content[] = m.revisions.length
    ? [
        { text: 'Revision history', fontSize: 16, bold: true, margin: [0, 0, 0, 14], pageBreak: 'before' },
        table(
          {
            storymap: false,
            head: ['Version', 'Date', 'Description'].map((h) => ({ blocks: [{ kind: 'para', runs: [{ text: h }] }], header: true, numeric: false, colSpan: 1 })),
            rows: m.revisions.map((r) => ({ cells: [r.version, r.date, r.description].map((v) => ({ blocks: [{ kind: 'para', runs: [{ text: v }] }], header: false, numeric: false, colSpan: 1 })) })),
          },
          CONTENT_WIDTH
        ),
      ]
    : []

  return {
    pageSize: 'A4',
    pageMargins: [MARGIN.side, MARGIN.top, MARGIN.side, MARGIN.bottom],
    info: { title: `${m.title}: ${m.kind}`, creator: 'The Idea Evaluator' },
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25, color: c(COLORS.ink) },
    header: (page) => (page === 1 ? null : { text: m.running, fontSize: 8, color: c(COLORS.pencil), margin: [MARGIN.side, 9 * MM, MARGIN.side, 0] }),
    footer: (page, pages) =>
      page === 1 ? null : { text: `Page ${page} of ${pages}`, fontSize: 8, color: c(COLORS.pencil), alignment: 'right', margin: [MARGIN.side, 8 * MM, MARGIN.side, 0] },
    content: [
      ...cover(m),
      ...revisions,
      { toc: { title: { text: 'Contents', fontSize: 16, bold: true, margin: [0, 0, 0, 10] }, numberStyle: { color: c(COLORS.pencil) } }, pageBreak: 'before' },
      // The chapters start on the page after the contents, then run on
      { text: '', pageBreak: 'after' },
      ...sections(m.sections),
      ...(m.colophon
        ? [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: c(COLORS.rule) }], margin: [0, 28, 0, 6] } as Content,
            { text: m.colophon, fontSize: 8.5, color: c(COLORS.pencil) },
          ]
        : []),
    ],
  }
}

/** The PDF as a Blob. */
export async function renderPdf(m: DocumentModel): Promise<Blob> {
  const [{ default: pdfMake }, fonts] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  // vfs_fonts exports the font files directly in pdfmake 0.2.23+, and under pdfMake.vfs before that
  const vfs = (fonts as any).default?.pdfMake?.vfs ?? (fonts as any).pdfMake?.vfs ?? (fonts as any).default ?? fonts
  return new Promise((resolve) => pdfMake.createPdf(pdfDefinition(m), undefined, undefined, vfs).getBlob(resolve))
}
