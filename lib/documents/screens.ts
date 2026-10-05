import type { Screen, Wireframes } from '@/lib/schemas/wireframes'
import { renderWireframe } from '@/lib/documents/wireframe'
import { bullets, esc, para, table, type DocSection } from '@/lib/documents/template'

/**
 * The wireframes as document sections, shared by the Report (section 5) and
 * the SRS (section 3.1): a table of screens and how they connect, then one
 * subsection per screen with its sketch.
 */

export function screensTable(w: Wireframes): string {
  return table(
    ['#', 'Screen', 'What the user does', 'Stories', 'Leads to'],
    w.screens.map((s, i) => [
      String(i + 1),
      `<b>${esc(s.name)}</b><br><span class="meta">${s.device === 'mobile' ? 'Phone' : 'Desktop'}</span>`,
      esc(s.purpose),
      s.stories.length ? s.stories.map(esc).join('<br>') : '–',
      esc(s.leadsTo.join(', ') || '–'),
    ])
  )
}

export function screenSection(s: Screen): DocSection {
  return {
    title: s.name,
    keepTogether: true,
    body:
      para(s.purpose) +
      `<div class="wire-meta"><span>${s.device === 'mobile' ? 'Phone' : 'Desktop'}</span>` +
      (s.stories.length ? `<span>Stories: ${esc(s.stories.join(', '))}</span>` : '') +
      (s.leadsTo.length ? `<span>Leads to: ${esc(s.leadsTo.join(', '))}</span>` : '') +
      `</div><figure class="wire">${renderWireframe(s)}</figure>` +
      bullets(s.notes),
  }
}
