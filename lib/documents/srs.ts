import { numberRequirements, type Srs } from '@/lib/schemas/srs'
import type { Wireframes } from '@/lib/schemas/wireframes'
import type { MappedStory } from '@/lib/schemas/brief'
import { screensTable, screenSection } from '@/lib/documents/screens'
import { bullets, esc, keep, para, renderDocument, table, type DocSection } from '@/lib/documents/template'

/**
 * The SRS on the IEEE 830 / ISO/IEC/IEEE 29148 outline:
 *
 *   1 Introduction · 2 Overall description · 3 External interfaces
 *   4 System features · 5 Non-functional requirements · 6 Data requirements
 *   Appendix A: traceability · Appendix B: open questions
 *
 * Every section always appears. Functional requirements are numbered FR-n and
 * non-functional ones NFR-n here, and Appendix A traces each FR to the user
 * stories and screens it cites, then lists any story no requirement covers.
 */

const TBD = 'To be determined.'

export interface SrsExtras {
  wireframes?: Wireframes
  /** The story map's stories, for the traceability appendix. */
  stories?: MappedStory[]
}

export function buildSrsDocument(srs: Srs, projectTitle: string, { wireframes, stories = [] }: SrsExtras = {}): string {
  const today = new Date().toISOString().slice(0, 10)
  const o = srs.overview
  const q = srs.quality
  const frs = numberRequirements(srs)

  // NFR-n across the five groups, in the standard's order
  let nfrNo = 0
  const nfrTable = (items: { statement: string; measure: string; attribute?: string }[], withAttribute = false) =>
    table(
      withAttribute ? ['ID', 'Attribute', 'Requirement', 'Measure'] : ['ID', 'Requirement', 'Measure'],
      items.map((r) => [
        `<b class="nowrap">NFR-${++nfrNo}</b>`,
        ...(withAttribute ? [esc(r.attribute || '–')] : []),
        esc(r.statement),
        esc(r.measure || '–'),
      ])
    )

  const features: DocSection[] = srs.features.map((f) => {
    const own = frs.filter((r) => r.feature === f.name)
    return {
      title: f.name,
      body:
        `<p><b>Priority:</b> ${esc(f.priority)}</p>` +
        para(f.description) +
        keep('Stimulus and response', table(['When', 'The system'], f.stimulusResponse.map((s) => [esc(s.stimulus), esc(s.response)]))) +
        `<h4>Functional requirements</h4>` +
        table(
          ['ID', 'Requirement', 'Acceptance criteria', 'Traces to'],
          own.map((r) => [
            `<b class="nowrap">${r.id}</b>`,
            esc(r.statement),
            bullets(r.acceptance) || '–',
            esc([...r.stories, ...r.screens].join(', ') || '–'),
          ])
        ),
    }
  })

  // Appendix A: each requirement's stories and screens, then what nothing covers
  const covered = new Set(frs.flatMap((r) => r.stories))
  const uncovered = stories.filter((s) => !covered.has(s.id))
  const traceability =
    table(
      ['Requirement', 'Feature', 'Priority', 'Stories', 'Screens'],
      frs.map((r) => [`<b class="nowrap">${r.id}</b>`, esc(r.feature), esc(r.priority), esc(r.stories.join(', ') || '–'), esc(r.screens.join(', ') || '–')])
    ) +
    (stories.length
      ? uncovered.length
        ? keep(
            'Stories without a requirement',
            table(['Story', 'Release'], uncovered.map((s) => [`<b>${s.id}</b> ${esc(s.title)}`, esc(s.release)])) +
              para('Each of these needs a requirement before the first release that includes it.')
          )
        : para(`Every one of the ${stories.length} user stories is covered by at least one requirement.`)
      : para('There is no user story map to trace to. Write the vision and story map on the Hand-off page, then write this document again.'))

  const sections: DocSection[] = [
    {
      title: 'Introduction',
      children: [
        { title: 'Purpose', body: para(o.purpose) },
        {
          title: 'Scope',
          body:
            `<div class="cols"><div><h4>In scope</h4>${bullets(o.inScope)}</div><div><h4>Out of scope</h4>${bullets(o.outOfScope) || '<p class="empty">None stated.</p>'}</div></div>`,
        },
        {
          title: 'Definitions, acronyms, and abbreviations',
          body: table(['Term', 'Meaning'], o.definitions.map((d) => [`<b>${esc(d.term)}</b>`, esc(d.meaning)])),
        },
        {
          title: 'References',
          body: bullets([
            'IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.',
            'ISO/IEC/IEEE 29148:2018, Systems and software engineering — Life cycle processes — Requirements engineering.',
            `Evaluation report for ${projectTitle}, from The Idea Evaluator: the product vision, user story map (US-n), and wireframes this document traces to.`,
          ]),
        },
        {
          title: 'Overview',
          body: para(
            'Section 2 describes the product, its users, and its environment. Section 3 covers its interfaces, including the screens. Section 4 groups the functional requirements (FR-n) by feature, section 5 sets the non-functional requirements (NFR-n), and section 6 describes the data. Appendix A traces every requirement to the user stories and screens, and appendix B lists open questions.'
          ),
        },
      ],
    },
    {
      title: 'Overall description',
      children: [
        { title: 'Product perspective', body: para(o.productPerspective) },
        { title: 'Product functions', body: bullets(o.productFunctions) },
        {
          title: 'User classes and characteristics',
          body: table(
            ['User class', 'Characteristics', 'Use', 'Expertise'],
            o.userClasses.map((u) => [`<b>${esc(u.name)}</b>`, esc(u.description), esc(u.frequency || '–'), esc(u.expertise || '–')])
          ),
        },
        { title: 'Operating environment', body: para(o.operatingEnvironment) },
        { title: 'Design and implementation constraints', body: bullets(o.designConstraints) },
        { title: 'User documentation', body: bullets(o.userDocumentation), empty: TBD },
        {
          title: 'Assumptions and dependencies',
          body:
            (o.assumptions.length ? `<h4>Assumptions</h4>${bullets(o.assumptions)}` : '') +
            (o.dependencies.length ? `<h4>Dependencies</h4>${bullets(o.dependencies)}` : ''),
        },
      ],
    },
    {
      title: 'External interface requirements',
      children: [
        {
          title: 'User interfaces',
          body:
            (o.uiPrinciples.length ? `<h4>Principles for every screen</h4>${bullets(o.uiPrinciples)}` : '') +
            (wireframes ? `<h4>Screens</h4>${screensTable(wireframes)}<p class="meta">Each screen is sketched below as a low-fidelity wireframe.</p>` : ''),
          empty: TBD,
          // The screens sit under 3.1 (3.1.1, 3.1.2, …) so the standard's numbering stays fixed
          children: wireframes?.screens.map(screenSection),
        },
        { title: 'Hardware interfaces', body: bullets(o.hardwareInterfaces) },
        {
          title: 'Software interfaces',
          body: table(['Software', 'Used for'], o.softwareInterfaces.map((s) => [`<b>${esc(s.name)}</b>`, esc(s.purpose)])),
        },
        { title: 'Communications interfaces', body: bullets(o.communicationsInterfaces) },
      ],
    },
    {
      title: 'System features',
      body: para(
        'Each feature lists what triggers it and how the system responds, then its functional requirements. Priority: Must is needed for the first release, Should is planned for a later version, Could is a candidate if time allows. "Traces to" names the user stories (US-n) and screens each requirement serves.'
      ),
      children: features,
    },
    {
      title: 'Non-functional requirements',
      children: [
        { title: 'Performance requirements', body: nfrTable(q.performance) },
        { title: 'Safety requirements', body: nfrTable(q.safety) },
        { title: 'Security requirements', body: nfrTable(q.security) },
        { title: 'Software quality attributes', body: nfrTable(q.quality, true) },
        { title: 'Business rules', body: nfrTable(q.businessRules) },
      ],
    },
    {
      title: 'Data requirements',
      children: [
        {
          title: 'Data model',
          body: q.entities
            .map((e) =>
              keep(
                esc(e.name),
                para(e.description) +
                  table(['Field', 'Type', 'Notes'], e.fields.map((f) => [`<b>${esc(f.name)}</b>`, esc(f.type || '–'), esc(f.notes || '–')])) +
                  (e.relations.length ? `<p class="meta">${esc(e.relations.join(' · '))}</p>` : '')
              )
            )
            .join(''),
          empty: TBD,
        },
        { title: 'Data retention', body: bullets(q.retention), empty: TBD },
      ],
    },
    { title: 'Traceability', appendix: true, body: traceability },
    {
      title: 'Open questions',
      appendix: true,
      body: table(['#', 'Question', 'Why it matters'], q.openQuestions.map((x, i) => [String(i + 1), esc(x.question), esc(x.why || '–')])),
    },
  ]

  return renderDocument({
    kind: 'Software Requirements Specification',
    title: projectTitle,
    summary: o.inScope.slice(0, 3).join(' · '),
    meta: [
      { label: 'Version', value: '0.1 (draft)' },
      { label: 'Standard', value: 'IEEE 830 / ISO/IEC/IEEE 29148' },
      { label: 'Requirements', value: `${frs.length} functional · ${nfrNo} non-functional` },
    ],
    revisions: [{ version: '0.1', date: today, description: 'First draft, written from the evaluation, the plan, the story map, and the wireframes. Review before use.' }],
    sections,
    colophon: 'Drafted by The Idea Evaluator from the evaluation. Review and edit before use.',
  })
}
