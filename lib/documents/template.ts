/**
 * The document template shared by "Idea as an overall" and the SRS.
 *
 * A document is a fixed outline: every section always appears, numbered, in
 * the same order, and its content grows or shrinks to fit the idea. A section
 * with nothing to say shows its `empty` line instead of disappearing, so two
 * documents always have the same shape.
 *
 * Section bodies are small HTML fragments built with the helpers below. The
 * exporters in ./export turn a document into a PDF and a Word file, each with
 * a cover page, a table of contents, running headers, and page numbers.
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
  /** Keep the whole subsection on one page, however long (e.g. a heading with its figure). */
  keepTogether?: boolean
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

/** A small heading kept on the same page as its content. */
export const keep = (heading: string, body: string) => (body.trim() ? `<div class="block"><h4>${heading}</h4>${body}</div>` : '')

/** Label: value lines, skipping empty values. */
export const facts = (pairs: [string, unknown][]) =>
  pairs
    .filter(([, v]) => str(String(v ?? '')))
    .map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`)
    .join('')

// ── numbering ───────────────────────────────────────────────────────────

export interface NumberedSection {
  /** "2.3", or "A" for an appendix. */
  number: string
  /** 1 for a chapter, 2 for its subsections, and so on. */
  depth: number
  section: DocSection
}

/** Every section in reading order, numbered 1, 1.1, 1.1.1 …, with appendices lettered A, B, … */
export function numberSections(sections: DocSection[], prefix = '', depth = 1): NumberedSection[] {
  let appendices = 0
  let numbered = 0
  return sections.flatMap((section) => {
    const own = !prefix && section.appendix ? String.fromCharCode(65 + appendices++) : String(++numbered)
    const n = prefix ? `${prefix}.${own}` : own
    return [{ number: n, depth, section }, ...numberSections(section.children ?? [], n, depth + 1)]
  })
}

/** A section's heading as printed: "Appendix A: Sources" for an appendix, otherwise its title. */
export const headingText = (item: NumberedSection) =>
  item.depth === 1 && item.section.appendix ? `Appendix ${item.number}: ${item.section.title}` : item.section.title
