/**
 * The document template shared by the Report and the SRS.
 *
 * A document is a fixed outline: every section always appears, numbered, in
 * the same order, and its content grows or shrinks to fit the idea. A section
 * with nothing to say shows its `empty` line instead of disappearing, so two
 * documents always have the same shape.
 *
 * The HTML is laid out into printed pages by Paged.js: a cover page, a table
 * of contents with page numbers, running headers, and page numbers in the
 * footer. The reader saves it as a PDF from the print dialog.
 */

export interface DocSection {
  title: string
  /** HTML for the section's own content (escape text with `esc`). */
  body?: string
  /** Shown when the section has no body and no subsections with content. */
  empty?: string
  children?: DocSection[]
  /** A top-level appendix: lettered (A, B, …) after the numbered sections. */
  appendix?: boolean
}

export interface DocMeta {
  label: string
  value: string
}

export interface DocRevision {
  version: string
  date: string
  description: string
}

export interface DocumentSpec {
  /** "Evaluation report", "Software Requirements Specification", … */
  kind: string
  title: string
  /** A paragraph under the title on the cover. */
  summary?: string
  meta: DocMeta[]
  revisions?: DocRevision[]
  sections: DocSection[]
  /** The line at the foot of the last page. */
  colophon?: string
}

export const NONE = 'None identified for this project.'

// ── HTML helpers for section bodies ─────────────────────────────────────

export const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
export const arr = <T = any>(value: unknown): T[] => (Array.isArray(value) ? value : [])
export const texts = (value: unknown) => arr(value).map(str).filter(Boolean)
// Only http(s) links are kept, so saved data can't smuggle in a script URL
const safeUrl = (value: unknown) => (/^https?:\/\//i.test(str(value)) ? str(value) : '')

export const para = (text: unknown) => (str(text) ? `<p>${esc(text)}</p>` : '')
export const bullets = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '')
export const link = (title: string, url: unknown) =>
  safeUrl(url) ? `<a href="${esc(safeUrl(url))}">${esc(title)}</a>` : esc(title)
// The leading no-break space survives Paged.js, which drops whitespace between tags
export const meta = (text: unknown) => (str(String(text ?? '')) ? `<span class="meta">&nbsp;${esc(text)}</span>` : '')

/** A table; cells are already HTML. Returns '' when there are no rows. */
export function table(head: string[], rows: string[][], numeric: number[] = []): string {
  if (rows.length === 0) return ''
  const cls = (i: number) => (numeric.includes(i) ? ' class="num"' : '')
  return (
    `<table><thead><tr>${head.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
    rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('') +
    '</tbody></table>'
  )
}

/**
 * A small heading kept on the same page as its content. Paged.js can't keep a
 * heading with what follows it (break-after: avoid makes it loop), so the two
 * go in one block that isn't split across pages.
 */
export const keep = (heading: string, body: string) => (body.trim() ? `<div class="block"><h4>${heading}</h4>${body}</div>` : '')

/** Label: value lines, skipping empty values. */
export const facts = (pairs: [string, unknown][]) =>
  pairs
    .filter(([, v]) => str(String(v ?? '')))
    .map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`)
    .join('')

// ── rendering ───────────────────────────────────────────────────────────

interface Numbered {
  id: string
  number: string
  depth: number
  section: DocSection
}

function number(sections: DocSection[], prefix = '', depth = 1): Numbered[] {
  let appendices = 0
  let numbered = 0
  return sections.flatMap((section) => {
    const own = !prefix && section.appendix ? String.fromCharCode(65 + appendices++) : String(++numbered)
    const n = prefix ? `${prefix}.${own}` : own
    return [{ id: `s-${n.replace(/\./g, '-')}`, number: n, depth, section }, ...number(section.children ?? [], n, depth + 1)]
  })
}

const heading = (item: Numbered) =>
  item.depth === 1 && item.section.appendix ? `Appendix ${item.number}: ${esc(item.section.title)}` : esc(item.section.title)

// A subsection this short stays on one page with its heading, so a heading is never left alone
// at the foot of a page. Longer ones may break; Paged.js can't keep a heading with what follows.
const KEEP_TOGETHER_CHARS = 2500

function renderSection(item: Numbered, all: Numbered[]): string {
  const { section, depth } = item
  const tag = depth === 1 ? 'h2' : depth === 2 ? 'h3' : 'h4'
  const children = all.filter((n) => n.number.startsWith(`${item.number}.`) && n.depth === depth + 1)
  const body = section.body?.trim()
  // A leaf section with nothing to say keeps its place and says so; a parent's subsections speak for it
  const empty = !body && children.length === 0 ? `<p class="empty">${esc(section.empty ?? NONE)}</p>` : ''
  const head = `<${tag} id="${item.id}">${section.appendix ? '' : `<span class="no">${item.number}</span> `}${heading(item)}</${tag}>`
  const own = head + (body ?? '') + empty
  const short = depth > 1 && children.length === 0 && own.length < KEEP_TOGETHER_CHARS
  return `<section class="d${depth}">${short ? `<div class="block">${own}</div>` : own}${children.map((c) => renderSection(c, all)).join('')}</section>`
}

export function renderDocument(doc: DocumentSpec): string {
  const all = number(doc.sections)
  const top = all.filter((n) => n.depth === 1)
  const contents = all
    .filter((n) => n.depth <= 2)
    .map((n) => `<li class="t${n.depth}"><a href="#${n.id}">${n.depth === 1 && n.section.appendix ? '' : `<span class="no">${n.number}</span> `}${heading(n)}</a></li>`)
    .join('')
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.title)}: ${esc(doc.kind)}</title>
<style>${STYLE}</style>
<script>
  // Paged.js lays the document out into pages; the print button is added after,
  // so it isn't laid out as part of the document
  window.PagedConfig = { after: function () { window.__addPrintButton && window.__addPrintButton() } }
  window.__addPrintButton = function () {
    if (document.querySelector('.print')) return
    var b = document.createElement('button')
    b.className = 'print'
    b.textContent = 'Print or save as PDF'
    b.onclick = function () { window.print() }
    document.body.appendChild(b)
  }
  // If Paged.js can't load (offline), the document still reads as one long page
  window.addEventListener('load', function () { setTimeout(window.__addPrintButton, 4000) })
</script>
<script src="https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.polyfill.min.js"></script>
</head>
<body>
<div class="running-title">${esc(doc.title)} · ${esc(doc.kind)}</div>

<div class="cover">
  <p class="kind">${esc(doc.kind)}</p>
  <h1>${esc(doc.title)}</h1>
  ${doc.summary ? `<p class="summary">${esc(doc.summary)}</p>` : ''}
  <dl>${[...doc.meta, { label: 'Date', value: date }]
    .filter((m) => m.value)
    .map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`)
    .join('')}</dl>
</div>

${
  doc.revisions?.length
    ? `<div class="front"><h2 class="plain">Revision history</h2>${table(
        ['Version', 'Date', 'Description'],
        doc.revisions.map((r) => [esc(r.version), esc(r.date), esc(r.description)])
      )}</div>`
    : ''
}

<nav class="front toc"><h2 class="plain">Contents</h2><ol>${contents}</ol></nav>

<main>${top.map((n) => renderSection(n, all)).join('')}</main>

${doc.colophon ? `<p class="colophon">${esc(doc.colophon)}</p>` : ''}
</body>
</html>`
}

const STYLE = `
  :root { --ink: #1c1f24; --soft: #4a5260; --pencil: #7a8291; --rule: #dde1e6; --marker: #d6392f; --fill: #f4f5f7; }
  * { box-sizing: border-box; }
  html { background: #e9ebee; }
  body { margin: 0; color: var(--ink); font: 10.5pt/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

  /* ── pages ── */
  @page { size: A4; margin: 22mm 18mm 20mm;
    @top-left { content: string(running); font-size: 8pt; color: #7a8291; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #7a8291; }
  }
  @page :first { @top-left { content: none; } @bottom-right { content: none; } }
  .running-title { string-set: running content(text); display: none; }
  .pagedjs_page { background: #fff; margin: 0 auto 12px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
  @media print { html { background: #fff; } .pagedjs_page { margin: 0; box-shadow: none; } .print { display: none !important; } }

  /* ── cover and front matter ── */
  .cover { break-after: page; padding-top: 55mm; }
  .cover .kind { text-transform: uppercase; letter-spacing: .12em; font-size: 9pt; color: var(--marker); font-weight: 700; margin: 0 0 4mm; }
  .cover h1 { font-size: 30pt; line-height: 1.1; letter-spacing: -.02em; margin: 0 0 8mm; border-bottom: 2px solid var(--ink); padding-bottom: 6mm; }
  .cover .summary { font-size: 12pt; color: var(--soft); white-space: pre-wrap; margin: 0 0 12mm; }
  .cover dl { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; margin: 0; }
  .cover dt { font-size: 8pt; text-transform: uppercase; letter-spacing: .08em; color: var(--pencil); }
  .cover dd { margin: 0; font-weight: 600; }
  .front { break-after: page; }
  h2.plain { font-size: 16pt; margin: 0 0 6mm; }
  .toc ol { list-style: none; padding: 0; margin: 0; }
  .toc li { margin: 1.6mm 0; }
  .toc li.t2 { padding-left: 8mm; font-size: 9.5pt; color: var(--soft); }
  .toc li.t1 { font-weight: 600; margin-top: 3.5mm; }
  .toc a { color: inherit; text-decoration: none; display: flex; }
  .toc a::after { content: target-counter(attr(href), page); margin-left: auto; padding-left: 4mm; color: var(--pencil); font-weight: 400; }
  .toc .no { display: inline-block; min-width: 10mm; color: var(--pencil); }

  /* ── body ── */
  /* Each chapter starts a page; the first follows the contents page's own break */
  main > section.d1 + section.d1 { break-before: page; }
  h2 { font-size: 17pt; letter-spacing: -.01em; margin: 0 0 5mm; padding-bottom: 2mm; border-bottom: 2px solid var(--ink); }
  h3 { font-size: 12.5pt; margin: 7mm 0 2.5mm; }
  h4 { font-size: 11pt; margin: 5mm 0 2mm; }
  h2 .no, h3 .no, h4 .no { color: var(--marker); font-variant-numeric: tabular-nums; margin-right: 1.5mm; }
  p { margin: 1.5mm 0; }
  ul { margin: 1.5mm 0 3mm; padding-left: 5mm; }
  li { margin: 1mm 0; }
  a { color: var(--ink); text-decoration-color: var(--marker); }
  .meta { color: var(--pencil); font-size: .88em; }
  .lead { font-size: 11.5pt; }
  .empty { color: var(--pencil); font-style: italic; }
  .callout { border-left: 3px solid var(--marker); padding: 2mm 0 2mm 4mm; margin: 3mm 0; font-size: 11.5pt; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; }
  th, td { text-align: left; vertical-align: top; padding: 1.8mm 2mm 1.8mm 0; border-bottom: 1px solid var(--rule); }
  th { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: var(--pencil); border-bottom: 1px solid var(--ink); }
  tr { break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; padding-left: 4mm; padding-right: 4mm; }
  th.num:last-child, td.num:last-child { padding-right: 0; }
  tr.total td { font-weight: 700; border-top: 2px solid var(--ink); border-bottom: 0; }
  tr.group td { font-weight: 600; background: var(--fill); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5mm; }
  .block { break-inside: avoid; margin: 0 0 3mm; }
  s { color: var(--pencil); }
  .vision { font-size: 12.5pt; line-height: 1.5; }
  table.storymap { table-layout: fixed; font-size: 8.5pt; }
  table.storymap th, table.storymap td { padding: 1.5mm 1.5mm 0 0; vertical-align: top; text-transform: none; letter-spacing: 0; }
  table.storymap thead th { color: var(--marker); font-size: 8pt; font-weight: 700; padding-bottom: 1.5mm; }
  table.storymap thead th.task { width: 34%; color: var(--pencil); }
  table.storymap tr.activity th { background: var(--ink); color: #fff; padding: 1.8mm 2mm; font-size: 9pt; border-bottom: 0; }
  table.storymap tbody th.task { font-weight: 600; color: var(--ink); padding-left: 2mm; }
  table.storymap td + td, table.storymap th.task + td { border-left: 1.5px dashed var(--rule); padding-left: 1.5mm; }
  .card { background: #fff8d6; border: 1px solid #e8dc9c; border-radius: 1mm; padding: 1.5mm; margin-bottom: 1.5mm; line-height: 1.3; }
  .card .id { display: block; font-size: 6.5pt; font-weight: 700; color: var(--pencil); }
  .colophon { margin-top: 10mm; padding-top: 3mm; border-top: 1px solid var(--rule); color: var(--pencil); font-size: 8.5pt; }

  /* Without Paged.js (or while it loads) the document reads as one long page */
  body:not(:has(.pagedjs_pages)) { max-width: 190mm; margin: 0 auto; padding: 10mm 6mm 20mm; background: #fff; }
  .print { position: fixed; top: 14px; right: 14px; z-index: 10; padding: 9px 16px; border: 0; border-radius: 6px; background: var(--marker); color: #fff; font: 600 13px/1 -apple-system, "Segoe UI", Roboto, sans-serif; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.2); }
  @media screen and (max-width: 640px) { .cols, .cols3, .cover dl { grid-template-columns: 1fr; } }
`
