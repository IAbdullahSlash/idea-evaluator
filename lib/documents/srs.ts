import type { Srs } from '@/lib/schemas/srs'
import { bullets, esc, keep, para, renderDocument, table, type DocSection } from '@/lib/documents/template'

/**
 * The SRS on the IEEE 830 / ISO 29148 outline:
 *
 *   1 Introduction · 2 Overall description · 3 External interfaces
 *   4 System features · 5 Non-functional requirements · 6 Data requirements
 *   Appendix A: traceability · Appendix B: open questions
 *
 * Every section always appears. One the content doesn't cover yet says
 * "To be determined", as an SRS draft would.
 */

const TBD = 'To be determined.'

const kindIs = (kind: string, ...words: string[]) => words.some((w) => kind.toLowerCase().includes(w))

// Non-functional requirements sorted into the standard's five headings by their category
const NFR_GROUPS: { title: string; match: (category: string) => boolean }[] = [
  { title: 'Performance', match: (c) => kindIs(c, 'perform', 'speed', 'latency', 'scal') },
  { title: 'Safety', match: (c) => kindIs(c, 'safety') },
  { title: 'Security', match: (c) => kindIs(c, 'secur', 'privacy', 'auth') },
  { title: 'Business rules', match: (c) => kindIs(c, 'business', 'legal', 'compliance') },
]

export function buildSrsDocument(srs: Srs, projectTitle: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const nfrs = srs.nonFunctionalRequirements.map((r, i) => ({ ...r, id: `NFR-${i + 1}` }))
  const nfrTable = (items: typeof nfrs) => table(['ID', 'Category', 'Requirement'], items.map((r) => [`<b>${r.id}</b>`, esc(r.category), esc(r.requirement)]))
  const grouped = NFR_GROUPS.map((g) => ({ ...g, items: nfrs.filter((r) => g.match(r.category)) }))
  const quality = nfrs.filter((r) => !NFR_GROUPS.some((g) => g.match(r.category)))
  const interfaces = (...words: string[]) =>
    bullets(srs.externalInterfaces.filter((x) => kindIs(x.kind, ...words)).map((x) => x.description))

  const sections: DocSection[] = [
    {
      title: 'Introduction',
      children: [
        { title: 'Purpose', body: para(srs.purpose) },
        { title: 'Scope', body: para(srs.productScope) },
        {
          title: 'Definitions, acronyms, and abbreviations',
          body: table(['Term', 'Meaning'], srs.definitions.map((d) => [`<b>${esc(d.term)}</b>`, esc(d.meaning)])),
        },
        {
          title: 'References',
          body: bullets([
            'IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.',
            `Evaluation report for ${projectTitle}, from The Idea Evaluator.`,
          ]),
        },
        {
          title: 'Overview',
          body: para(
            'Section 2 describes the product and its users. Section 3 covers its interfaces, section 4 its features and functional requirements, section 5 the non-functional requirements, and section 6 its data. Appendix A traces requirements to user stories and appendix B lists open questions.'
          ),
        },
      ],
    },
    {
      title: 'Overall description',
      children: [
        { title: 'Product perspective', body: para(srs.productPerspective), empty: TBD },
        { title: 'Product functions', body: bullets(srs.functionalRequirements.map((r) => r.title)) },
        {
          title: 'User classes and characteristics',
          body: table(['User class', 'Characteristics'], srs.userClasses.map((u) => [`<b>${esc(u.name)}</b>`, esc(u.description)])),
        },
        { title: 'Operating environment', body: para(srs.operatingEnvironment), empty: TBD },
        { title: 'Design and implementation constraints', body: bullets(srs.constraints) },
        { title: 'User documentation', empty: TBD },
        { title: 'Assumptions and dependencies', body: bullets(srs.assumptions) },
      ],
    },
    {
      title: 'External interface requirements',
      children: [
        { title: 'User interfaces', body: interfaces('user', 'screen', 'ui'), empty: TBD },
        { title: 'Hardware interfaces', body: interfaces('hardware', 'device') },
        { title: 'Software interfaces', body: interfaces('api', 'software', 'third', 'service', 'library') },
        { title: 'Communications interfaces', body: interfaces('communic', 'email', 'network', 'http', 'notification') },
      ],
    },
    {
      title: 'System features',
      body: para('Priorities: Must is needed for the first release, Should is planned for a later version, Could is a candidate if time allows.'),
      children: srs.functionalRequirements.map((r, i) => ({
        title: r.title,
        body:
          `<p><b>FR-${i + 1}</b> · Priority: <b>${esc(r.priority)}</b></p>` +
          para(r.description) +
          keep('Acceptance criteria', bullets(r.acceptanceCriteria)),
      })),
    },
    {
      title: 'Non-functional requirements',
      children: [
        ...grouped.slice(0, 3).map((g) => ({ title: `${g.title} requirements`, body: nfrTable(g.items) })),
        { title: 'Software quality attributes', body: nfrTable(quality) },
        { title: grouped[3].title, body: nfrTable(grouped[3].items) },
      ],
    },
    {
      title: 'Data requirements',
      children: [
        { title: 'Data model', empty: TBD },
        { title: 'Data retention', empty: TBD },
      ],
    },
    { title: 'Traceability', appendix: true, empty: TBD },
    { title: 'Open questions', appendix: true, empty: TBD },
  ]

  return renderDocument({
    kind: 'Software Requirements Specification',
    title: projectTitle,
    summary: srs.productScope,
    meta: [
      { label: 'Version', value: '0.1 (draft)' },
      { label: 'Standard', value: 'IEEE 830 / ISO/IEC/IEEE 29148' },
    ],
    revisions: [{ version: '0.1', date: today, description: 'First draft, written from the evaluation and the plan. Review before use.' }],
    sections,
    colophon: 'Drafted by The Idea Evaluator from the evaluation. Review and edit before use.',
  })
}
