import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { cellText, COLORS, NARROW_COLUMNS, sectionNumber, type Block, type Cell, type DocumentModel, type ModelSection, type Run, type TableModel } from '@/lib/documents/export/model'

/**
 * A document model as a PDF, with pdfmake: an A4 cover page, a contents page
 * with page numbers, each chapter on a new page, a running title at the top
 * and "Page n of m" at the foot. Built in the browser; pdfmake is loaded only
 * when someone downloads.
 */

const c = (hex: string) => `#${hex}`
const MM = 72 / 25.4
const PAGE_WIDTH = 595.28
const MARGIN = { top: 22 * MM, side: 18 * MM, bottom: 20 * MM }
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN.side

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
  return list.map((b) => block(b, width))
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
      return { text: text(b.runs), fontSize: 11, bold: true, margin: [0, 10, 0, 3], headlineLevel: 4 } as Content
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
      return { stack: blocks(b.blocks, width), unbreakable: true, margin: [0, 0, 0, 6] }
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
    table: { headerRows: t.head.length ? 1 : 0, widths, body, dontBreakRows: true },
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
    // Each chapter starts a page; the first follows the contents page's own break
    return {
      stack: [{ text: label, fontSize: 17, bold: true, ...toc }, { canvas: [{ type: 'line', x1: 0, y1: 4, x2: CONTENT_WIDTH, y2: 4, lineWidth: 1.5, lineColor: c(COLORS.ink) }] }],
      pageBreak: 'before',
      margin: [0, 0, 0, 12],
    }
  }
  return { text: label, fontSize: s.depth === 2 ? 12.5 : 11, bold: true, margin: [0, s.depth === 2 ? 16 : 12, 0, 5], headlineLevel: s.depth, ...toc } as Content
}

function section(s: ModelSection): Content[] {
  const content = [heading(s), ...blocks(s.blocks)]
  return s.keepTogether ? [{ stack: content, unbreakable: true }] : content
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
      ...m.sections.flatMap(section),
      ...(m.colophon
        ? [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: c(COLORS.rule) }], margin: [0, 28, 0, 6] } as Content,
            { text: m.colophon, fontSize: 8.5, color: c(COLORS.pencil) },
          ]
        : []),
    ],
    // A heading never ends a page on its own: if nothing follows it there, it moves to the next page
    pageBreakBefore: (node, following) => Boolean((node as { headlineLevel?: number }).headlineLevel) && following.length === 0,
  }
}

/** The PDF as a Blob. */
export async function renderPdf(m: DocumentModel): Promise<Blob> {
  const [{ default: pdfMake }, fonts] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  // vfs_fonts exports the font files directly in pdfmake 0.2.23+, and under pdfMake.vfs before that
  const vfs = (fonts as any).default?.pdfMake?.vfs ?? (fonts as any).pdfMake?.vfs ?? (fonts as any).default ?? fonts
  return new Promise((resolve) => pdfMake.createPdf(pdfDefinition(m), undefined, undefined, vfs).getBlob(resolve))
}
