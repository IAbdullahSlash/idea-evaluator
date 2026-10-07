import type * as Docx from 'docx'
import { cellText, COLORS, NARROW_COLUMNS, sectionNumber, type Block, type Cell, type DocumentModel, type ModelSection, type Run, type TableModel } from '@/lib/documents/export/model'

/**
 * A document model as a Word file, with docx: an A4 cover page, a contents
 * page linking to each section, each chapter on a new page, a running title
 * at the top and "Page n of m" at the foot. Wireframes are drawn into PNG
 * images first, since Word can't show every SVG. Built in the browser; docx
 * is loaded only when someone downloads.
 */

// Word measures in twentieths of a point (twips) and font sizes in half-points
const MM = 56.7
const PAGE = { width: 11906, height: 16838 }
const MARGIN = { top: Math.round(22 * MM), side: Math.round(18 * MM), bottom: Math.round(20 * MM) }
const CONTENT_WIDTH = PAGE.width - 2 * MARGIN.side
const pt = (size: number) => Math.round(size * 2)
// Images are sized in pixels at 96 to the inch
const twipsToPx = (twips: number) => Math.round((twips / 1440) * 96)

/** Draw an SVG onto a canvas at twice its size, as PNG bytes. */
async function svgToPng(svg: string, width: number, height: number): Promise<Uint8Array> {
  const scale = 2
  const source = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  // Sized explicitly, so the browser draws it at the viewBox's size
  const sized = source.replace('<svg', `<svg width="${width}" height="${height}"`)
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('The wireframe could not be drawn.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('The wireframe could not be drawn.'))), 'image/png'))
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

const figuresIn = (blocks: Block[]): Extract<Block, { kind: 'figure' }>[] =>
  blocks.flatMap((b) =>
    b.kind === 'figure'
      ? [b]
      : b.kind === 'group'
        ? figuresIn(b.blocks)
        : b.kind === 'columns'
          ? b.columns.flatMap(figuresIn)
          : b.kind === 'table'
            ? [...b.table.head, ...b.table.rows.flatMap((r) => r.cells)].flatMap((cl) => figuresIn(cl.blocks))
            : []
  )

export async function renderDocx(m: DocumentModel): Promise<Blob> {
  const d = await import('docx')
  const images = new Map<string, Uint8Array>()
  for (const f of m.sections.flatMap((s) => figuresIn(s.blocks))) {
    if (!images.has(f.svg)) images.set(f.svg, await svgToPng(f.svg, f.width, f.height))
  }
  return d.Packer.toBlob(buildDocx(d, m, images))
}

function buildDocx(d: typeof Docx, m: DocumentModel, images: Map<string, Uint8Array>): Docx.Document {
  const none = { style: d.BorderStyle.NONE, size: 0, color: 'auto' }
  const line = (color: string, size = 4) => ({ style: d.BorderStyle.SINGLE, size, color })
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }

  // ── inline text ────────────────────────────────────────────────────────

  type RunStyle = { size?: number; color?: string; bold?: boolean; italics?: boolean; allCaps?: boolean }
  const runs = (list: Run[], base: RunStyle = {}): Docx.ParagraphChild[] =>
    list.map((r) => {
      if (r.text === '\n') return new d.TextRun({ text: '', break: 1 })
      const run = new d.TextRun({
        text: r.text,
        bold: r.bold || base.bold,
        italics: r.italic || base.italics,
        strike: r.strike,
        allCaps: base.allCaps,
        color: r.meta || r.strike ? COLORS.pencil : base.color,
        size: r.meta ? pt(9) : base.size,
        ...(r.link ? { underline: { color: COLORS.marker } } : {}),
      })
      return r.link ? new d.ExternalHyperlink({ link: r.link, children: [run] }) : run
    })

  // ── blocks ─────────────────────────────────────────────────────────────

  type Child = Docx.Paragraph | Docx.Table

  const para = (children: Docx.ParagraphChild[], options: Partial<Docx.IParagraphOptions> = {}) =>
    new d.Paragraph({ children, spacing: { before: 40, after: 80 }, ...options })

  /**
   * How a block holds to the page: "none" breaks freely; "within" keeps its own lines and rows
   * together but lets what follows go to the next page; "all" also keeps it with what follows.
   * A kept section is "all" up to its last block, which is "within", so Word's chain of
   * keep-with-next ends with the section and never runs on longer than a page.
   */
  type Keep = 'none' | 'within' | 'all'

  function blocks(list: Block[], width: number, keep = false, last: Keep = 'within'): Child[] {
    const out: Child[] = []
    list.forEach((b, i) => {
      // Two tables in a row need a paragraph between them, or Word joins them into one
      if (b.kind === 'table' && list[i - 1]?.kind === 'table') out.push(new d.Paragraph({ children: [], spacing: { before: 0, after: 0 } }))
      out.push(...block(b, width, !keep ? 'none' : i < list.length - 1 ? 'all' : last))
    })
    return out
  }

  function block(b: Block, width: number, keep: Keep): Child[] {
    const next = keep === 'all'
    switch (b.kind) {
      case 'para':
        if (b.style === 'callout' || b.style === 'vision')
          return [
            para(runs(b.runs, { size: pt(b.style === 'vision' ? 12.5 : 11.5) }), {
              border: { left: { style: d.BorderStyle.SINGLE, size: 18, color: COLORS.marker, space: 8 } },
              indent: { left: 160 },
              spacing: { before: 120, after: 160 },
              keepNext: next,
            }),
          ]
        return [
          para(
            runs(b.runs, b.style === 'empty' ? { italics: true, color: COLORS.pencil } : b.style === 'meta' ? { color: COLORS.pencil, size: pt(9) } : {}),
            { keepNext: next, keepLines: true }
          ),
        ]
      case 'subheading':
        return [para(runs(b.runs, { bold: true, size: pt(11) }), { keepNext: true, keepLines: true, spacing: { before: 200, after: 60 } })]
      case 'list':
        return b.items.map(
          (item, i) =>
            new d.Paragraph({
              children: runs(item),
              numbering: { reference: 'bullets', level: 0 },
              spacing: { before: 20, after: 40 },
              keepNext: next || (keep === 'within' && i < b.items.length - 1),
            })
        )
      case 'table':
        return [table(b.table, width, keep)]
      case 'columns': {
        const each = Math.floor(width / b.columns.length)
        return [
          new d.Table({
            width: { size: width, type: d.WidthType.DXA },
            columnWidths: b.columns.map(() => each),
            borders: noBorders,
            rows: [
              new d.TableRow({
                cantSplit: keep !== 'none',
                children: b.columns.map(
                  (col) =>
                    new d.TableCell({
                      width: { size: each, type: d.WidthType.DXA },
                      margins: { right: 200 },
                      children: cellChildren(blocks(col, each - 200, next, 'all')),
                    })
                ),
              }),
            ],
          }),
        ]
      }
      case 'figure': {
        // Scaled to the page, and never taller than fits beside its heading
        const maxW = b.mobile ? 62 * MM : width
        const maxH = (b.mobile ? 135 : 165) * MM
        const w = Math.min(maxW, (maxH * b.width) / b.height)
        const h = (w * b.height) / b.width
        const data = images.get(b.svg)
        if (!data) return []
        return [
          new d.Paragraph({
            alignment: d.AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            keepNext: next,
            children: [new d.ImageRun({ type: 'png', data, transformation: { width: twipsToPx(w), height: twipsToPx(h) }, altText: { name: 'Wireframe', description: 'Wireframe', title: 'Wireframe' } })],
          }),
        ]
      }
      case 'card':
        return [
          new d.Paragraph({
            children: [new d.TextRun({ text: b.id, bold: true, size: pt(6.5), color: COLORS.pencil }), new d.TextRun({ text: '', break: 1 }), ...runs(b.runs, { size: pt(8.5) })],
            shading: { type: d.ShadingType.CLEAR, fill: COLORS.card, color: 'auto' },
            border: { top: line(COLORS.cardEdge), bottom: line(COLORS.cardEdge), left: line(COLORS.cardEdge), right: line(COLORS.cardEdge) },
            spacing: { before: 40, after: 80 },
          }),
        ]
      case 'group':
        // A group keeps together; whether it also keeps with what follows depends on where it sits
        return blocks(b.blocks, width, true, next ? 'all' : 'within')
    }
  }

  // A table cell must hold at least one paragraph
  const cellChildren = (children: Child[]) => (children.length ? children : [new d.Paragraph({ children: [] })])

  function table(t: TableModel, width: number, keep: Keep = 'none'): Docx.Table {
    const columns = Math.max(t.head.length, ...t.rows.map((r) => r.cells.reduce((n, cl) => n + cl.colSpan, 0)))
    // Short-value columns get a fixed width and the rest share what is left; a story map's first column takes a third
    const fixedWidth = (i: number) => {
      const named = NARROW_COLUMNS[cellText(t.head[i])]
      if (named) return Math.round(named * MM)
      return t.head[i]?.numeric || t.rows.some((r) => r.cells[i]?.numeric) ? 1400 : 0
    }
    const widths = t.storymap
      ? [Math.round(width * 0.34), ...Array(columns - 1).fill(Math.floor((width * 0.66) / Math.max(1, columns - 1)))]
      : (() => {
          const fixed = Array.from({ length: columns }, (_, i) => fixedWidth(i))
          const rest = columns - fixed.filter(Boolean).length
          const share = rest ? Math.floor((width - fixed.reduce((a, b) => a + b, 0)) / rest) : 0
          return fixed.map((f) => f || share)
        })()

    type RowStyle = TableModel['rows'][number]['style'] | 'head'
    const cell = (cl: Cell, col: number, style: RowStyle, keepRow: boolean) => {
      const head = style === 'head'
      const activity = style === 'activity'
      const span = widths.slice(col, col + cl.colSpan).reduce((a, b) => a + b, 0)
      const base: RunStyle = head
        ? { bold: true, size: pt(t.storymap ? 8 : 7.5), color: t.storymap ? COLORS.marker : COLORS.pencil, allCaps: !t.storymap }
        : activity
          ? { bold: true, color: 'FFFFFF', size: pt(9) }
          : { size: pt(t.storymap ? 8.5 : 9.5), bold: style === 'total' || style === 'group' || (cl.header && t.storymap) || undefined }
      // Word keeps a table's rows together through their paragraphs' keep-with-next
      const content = cl.blocks.flatMap((b): Child[] =>
        b.kind === 'para' && !b.style
          ? [para(runs(b.runs, base), { alignment: cl.numeric ? d.AlignmentType.RIGHT : undefined, spacing: { before: 0, after: 40 }, keepNext: keepRow })]
          : block(b, span - 160, keepRow ? 'all' : 'none')
      )
      return new d.TableCell({
        width: { size: span, type: d.WidthType.DXA },
        columnSpan: cl.colSpan > 1 ? cl.colSpan : undefined,
        margins: { top: 80, bottom: 80, left: col === 0 && !activity ? 0 : 100, right: 100 },
        shading: activity ? { type: d.ShadingType.CLEAR, fill: COLORS.ink, color: 'auto' } : style === 'group' ? { type: d.ShadingType.CLEAR, fill: COLORS.fill, color: 'auto' } : undefined,
        borders: {
          top: style === 'total' ? line(COLORS.ink, 12) : none,
          bottom: head ? line(COLORS.ink, 6) : line(COLORS.rule),
          left: none,
          right: none,
        },
        children: cellChildren(content),
      })
    }
    const all: { cells: Cell[]; style?: RowStyle }[] = [...(t.head.length ? [{ cells: t.head, style: 'head' as RowStyle }] : []), ...t.rows]
    return new d.Table({
      width: { size: width, type: d.WidthType.DXA },
      columnWidths: widths,
      layout: d.TableLayoutType.FIXED,
      borders: noBorders,
      rows: all.map((r, i) => {
        // The heading row always stays with the first row; the rest only in a kept section
        const keepRow = (i === 0 && r.style === 'head') || keep === 'all' || (keep === 'within' && i < all.length - 1)
        let col = 0
        return new d.TableRow({
          tableHeader: r.style === 'head',
          cantSplit: true,
          children: r.cells.map((cl) => {
            const c = cell(cl, col, r.style, keepRow)
            col += cl.colSpan
            return c
          }),
        })
      }),
    })
  }

  // ── sections ───────────────────────────────────────────────────────────

  const anchor = (s: ModelSection) => `s${s.number.replace(/\./g, '_')}`

  function heading(s: ModelSection): Docx.Paragraph {
    const no = sectionNumber(s)
    const size = s.depth === 1 ? 17 : s.depth === 2 ? 12.5 : 11
    return new d.Paragraph({
      heading: s.depth === 1 ? d.HeadingLevel.HEADING_1 : s.depth === 2 ? d.HeadingLevel.HEADING_2 : d.HeadingLevel.HEADING_3,
      // Each chapter starts a page
      pageBreakBefore: s.depth === 1,
      keepNext: true,
      keepLines: true,
      spacing: { before: s.depth === 1 ? 0 : s.depth === 2 ? 320 : 240, after: s.depth === 1 ? 240 : 100 },
      border: s.depth === 1 ? { bottom: { style: d.BorderStyle.SINGLE, size: 12, color: COLORS.ink, space: 4 } } : undefined,
      children: [
        new d.Bookmark({
          id: anchor(s),
          children: [
            ...(no ? [new d.TextRun({ text: `${no}  `, color: COLORS.marker, bold: true, size: pt(size) })] : []),
            new d.TextRun({ text: s.title, bold: true, size: pt(size), color: COLORS.ink }),
          ],
        }),
      ],
    })
  }

  const cover: Child[] = [
    new d.Paragraph({ spacing: { before: Math.round(55 * MM), after: 160 }, children: [new d.TextRun({ text: m.kind.toUpperCase(), bold: true, size: pt(9), color: COLORS.marker, characterSpacing: 24 })] }),
    new d.Paragraph({
      border: { bottom: { style: d.BorderStyle.SINGLE, size: 12, color: COLORS.ink, space: 12 } },
      spacing: { after: 400 },
      children: [new d.TextRun({ text: m.title, bold: true, size: pt(30) })],
    }),
    ...(m.summary ? [new d.Paragraph({ spacing: { after: 560 }, children: [new d.TextRun({ text: m.summary, size: pt(12), color: COLORS.soft })] })] : []),
    new d.Table({
      width: { size: CONTENT_WIDTH, type: d.WidthType.DXA },
      columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
      borders: noBorders,
      rows: Array.from({ length: Math.ceil(m.meta.length / 2) }, (_, r) =>
        new d.TableRow({
          children: [m.meta[r * 2], m.meta[r * 2 + 1]].map(
            (x) =>
              new d.TableCell({
                width: { size: CONTENT_WIDTH / 2, type: d.WidthType.DXA },
                margins: { bottom: 200 },
                children: x
                  ? [
                      new d.Paragraph({ children: [new d.TextRun({ text: x.label.toUpperCase(), size: pt(8), color: COLORS.pencil, characterSpacing: 12 })] }),
                      new d.Paragraph({ children: [new d.TextRun({ text: x.value, bold: true })] }),
                    ]
                  : [new d.Paragraph({ children: [] })],
              })
          ),
        })
      ),
    }),
  ]

  const front: Child[] = [
    ...(m.revisions.length
      ? [
          new d.Paragraph({ children: [new d.TextRun({ text: 'Revision history', bold: true, size: pt(16) })], spacing: { after: 240 } }),
          table(
            {
              storymap: false,
              head: ['Version', 'Date', 'Description'].map((h) => ({ blocks: [{ kind: 'para', runs: [{ text: h }] }], header: true, numeric: false, colSpan: 1 })),
              rows: m.revisions.map((r) => ({ cells: [r.version, r.date, r.description].map((v) => ({ blocks: [{ kind: 'para', runs: [{ text: v }] }], header: false, numeric: false, colSpan: 1 })) })),
            },
            CONTENT_WIDTH
          ),
        ]
      : []),
    new d.Paragraph({ pageBreakBefore: m.revisions.length > 0, children: [new d.TextRun({ text: 'Contents', bold: true, size: pt(16) })], spacing: { after: 240 } }),
    ...m.sections
      .filter((s) => s.depth <= 2)
      .map(
        (s) =>
          new d.Paragraph({
            indent: { left: s.depth === 2 ? 450 : 0 },
            spacing: { before: s.depth === 1 ? 160 : 40, after: 40 },
            children: [
              new d.InternalHyperlink({
                anchor: anchor(s),
                children: [
                  ...(sectionNumber(s) ? [new d.TextRun({ text: `${sectionNumber(s)}  `, color: COLORS.pencil, size: s.depth === 2 ? pt(9.5) : undefined })] : []),
                  new d.TextRun({ text: s.title, bold: s.depth === 1, color: s.depth === 2 ? COLORS.soft : COLORS.ink, size: s.depth === 2 ? pt(9.5) : undefined }),
                ],
              }),
            ],
          })
      ),
  ]

  const body: Child[] = m.sections.flatMap((s) => [heading(s), ...blocks(s.blocks, CONTENT_WIDTH, s.keepTogether)])
  if (m.colophon) {
    body.push(
      new d.Paragraph({
        border: { top: { style: d.BorderStyle.SINGLE, size: 4, color: COLORS.rule, space: 6 } },
        spacing: { before: 560 },
        children: [new d.TextRun({ text: m.colophon, size: pt(8.5), color: COLORS.pencil })],
      })
    )
  }

  const page = { size: PAGE, margin: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.side, right: MARGIN.side, header: Math.round(9 * MM), footer: Math.round(8 * MM) } }
  const header = new d.Header({ children: [new d.Paragraph({ children: [new d.TextRun({ text: m.running, size: pt(8), color: COLORS.pencil })] })] })
  const footer = new d.Footer({
    children: [
      new d.Paragraph({
        alignment: d.AlignmentType.RIGHT,
        children: [new d.TextRun({ children: ['Page ', d.PageNumber.CURRENT, ' of ', d.PageNumber.TOTAL_PAGES], size: pt(8), color: COLORS.pencil })],
      }),
    ],
  })

  return new d.Document({
    title: `${m.title}: ${m.kind}`,
    creator: 'The Idea Evaluator',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: pt(10.5), color: COLORS.ink }, paragraph: { spacing: { line: 288 } } },
      },
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{ level: 0, format: d.LevelFormat.BULLET, text: '•', alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } } } }],
        },
      ],
    },
    sections: [
      // The cover has no running title or page number
      { properties: { page }, children: cover },
      { properties: { page }, headers: { default: header }, footers: { default: footer }, children: [...front, ...body] },
    ],
  })
}
