import { CRITERIA } from '@/lib/schemas/snapshot'
import { availableWeeks, formatMoney, formatWeeks, sumCosts, totalWeeks } from '@/lib/plan-math'
import {
  arr,
  bullets,
  esc,
  facts,
  keep,
  link,
  meta,
  para,
  renderDocument,
  str,
  table,
  texts,
  type DocSection,
} from '@/lib/documents/template'

/**
 * The Report (evaluation and product brief), on its fixed outline:
 *
 *   1 Executive summary · 2 Product vision · 3 Evaluation · 4 User story map
 *   5 Wireframes · 6 Plan · 7 Next steps · Appendix: sources
 *
 * The input is whatever the page has saved, which may come from an older
 * version, so every field is read defensively.
 */

export interface ReportInput {
  idea: string
  context: { label: string; value: string }[]
  snapshot: any
  summary?: any
  discussions?: any
  githubRepos?: any[]
  existingSolutions?: any[]
  quickWins?: any[]
  plan?: { stage3: any; stage4: any }
}

const NOT_YET = 'Not written yet. It will be added to the report in a coming version.'
const NO_PLAN = 'The plan has not been made yet. Continue to the Plan page first.'
const NO_SUMMARY = 'The summary has not been made yet.'

const verdictLine = (fit: any) =>
  fit?.verdict === 'fits' ? 'Fits the time available' : fit?.verdict === 'tight' ? 'Tight for the time available' : 'More than the time available'

function executiveSummary(input: ReportInput): DocSection {
  const s = input.snapshot ?? {}
  const s2 = input.summary ?? {}
  const mark = Number.isFinite(Number(s2.feasibilityScore)) ? s2.feasibilityScore : s.feasibilityScore
  return {
    title: 'Executive summary',
    body:
      `<div class="callout"><b>${esc(str(s.recommendation) || 'Verdict')}</b> · marked <b>${esc(mark ?? '–')}/10</b>` +
      (Number.isFinite(Number(s.successProbability)) ? ` · ${esc(s.successProbability)}% chance of success` : '') +
      `</div>` +
      para(s2.executiveSummary || s.honestAiFeedback || s.honestRealityCheck) +
      facts([
        ['Difficulty', s.difficultyLevel],
        ['Estimated build time', s2.estimatedTimeframe || s.estimatedTimeframe],
        ['Domain', s.detectedDomain],
      ]),
  }
}

function productVision(input: ReportInput): DocSection {
  const s = input.snapshot ?? {}
  const users = s.targetUsersMarketFit ?? {}
  const rubric = s.rubric ?? {}
  return {
    title: 'Product vision',
    children: [
      { title: 'Vision statement', empty: NOT_YET },
      { title: 'Target users', body: para(users.primaryUsers) },
      { title: 'Problem', body: para(rubric.realProblem?.reason) + para(rubric.worthSolving?.reason) },
      { title: 'Goals', empty: NOT_YET },
      { title: 'Non-goals', empty: NOT_YET },
      { title: 'Success measures', body: para(users.userValidation), empty: NOT_YET },
    ],
  }
}

function evaluation(input: ReportInput): DocSection {
  const s = input.snapshot ?? {}
  const rubric = s.rubric ?? {}
  const d = input.discussions
  const s2 = input.summary
  const risks = s2?.potentialChallenges ?? {}
  const severity = s2?.riskSeverity ?? {}
  const users = s.targetUsersMarketFit ?? {}

  const threads = arr(d?.threads).map(
    (t) => `<div class="block">${link(str(t.title), t.url)} ${meta(t.where)}${str(t.says) ? `<br>${esc(t.says)}` : ''}</div>`
  )
  const news = arr(d?.news).map(
    (n) => `<div class="block">${link(str(n.title), n.url)} ${meta(n.source)}${str(n.note) ? `<br>${esc(n.note)}` : ''}</div>`
  )
  const solutions = arr(input.existingSolutions).map((x) => [
    `<b>${link(str(x.name), x.url)}</b><br>${esc(x.description)}`,
    esc(x.difference),
  ])
  const repos = arr(input.githubRepos)
    .slice(0, 4)
    .map((r) => [link(`${str(r.owner)}/${str(r.name)}`, r.url) + `<br><span class="meta">${esc(r.description)}</span>`, esc(r.language), esc(r.stars)])

  return {
    title: 'Evaluation',
    children: [
      {
        title: 'Marking',
        body:
          table(
            ['Criterion', 'Mark', 'Why'],
            CRITERIA.filter((c) => rubric[c.id]).map((c) => [`<b>${esc(c.name)}</b><br><span class="meta">${esc(c.asks)}</span>`, `${esc(rubric[c.id].score)}/10`, esc(rubric[c.id].reason)]),
            [1]
          ) + (str(s2?.scoreChange) ? para(`Re-marked in the summary: ${s2.scoreChange}`) : ''),
      },
      {
        title: 'Market: what people are saying',
        body:
          facts([
            ['Users', users.primaryUsers],
            ['Demand', users.marketDemand],
          ]) +
          (str(d?.takeaway) ? `<div class="callout">${esc(d.takeaway)}</div>` : '') +
          (threads.length ? `<h4>Discussions</h4>${threads.join('')}` : '') +
          (news.length ? `<h4>In the news</h4>${news.join('')}` : ''),
        empty: d?.status === 'error' ? 'Discussions and news could not be loaded for this evaluation.' : undefined,
      },
      {
        title: 'Existing solutions and similar projects',
        body:
          (solutions.length ? table(['Solution', 'How this idea differs'], solutions) : '') +
          keep('Similar projects on GitHub', table(['Repository', 'Language', 'Stars'], repos, [2])),
      },
      {
        title: 'Risks',
        body: s2
          ? table(
              ['Area', 'Severity', 'Risk'],
              (
                [
                  ['Technical', 'technical', risks.technicalRisks],
                  ['Usability', 'usability', risks.usabilityIssues],
                  ['Market', 'market', risks.marketRisks],
                ] as const
              )
                .filter(([, , text]) => str(text))
                .map(([label, key, text]) => [`<b>${label}</b>`, esc(severity[key] ?? ''), esc(text)])
            )
          : '',
        empty: s2 ? undefined : NO_SUMMARY,
      },
      {
        title: 'Pros and cons',
        body:
          texts(s2?.pros).length || texts(s2?.cons).length
            ? `<div class="cols"><div><h4>Pros</h4>${bullets(texts(s2?.pros))}</div><div><h4>Cons</h4>${bullets(texts(s2?.cons))}</div></div>`
            : '',
        empty: s2 ? undefined : NO_SUMMARY,
      },
    ],
  }
}

function plan(input: ReportInput, timeline: string): DocSection {
  const p3 = input.plan?.stage3
  const p4 = input.plan?.stage4
  if (!p3 || !p4) return { title: 'Plan', empty: NO_PLAN }

  const phases = arr(p3.projectMilestones)
  const scope = input.summary?.requirementsScope ?? {}
  const cuts = texts(p3.scopeCuts).map((c) => c.toLowerCase())
  const isCut = (f: string) => cuts.some((c) => c.includes(f.toLowerCase()) || f.toLowerCase().includes(c))
  const scopeList = (items: string[]) =>
    items.length ? `<ul>${items.map((f) => `<li>${isCut(f) ? `<s>${esc(f)}</s> <span class="meta">(cut)</span>` : esc(f)}</li>`).join('')}</ul>` : '<p class="empty">None.</p>'
  const needed = totalWeeks(phases.map((m) => str(m.duration)))
  const costs = arr(p4.costEstimates)
  const costTotals = costs.map((c) => sumCosts(arr(c.items).map((i) => str(i.cost))))
  const overall = costTotals.every(Boolean)
    ? costTotals.reduce<{ monthly: number; oneOff: number }>((t, c) => ({ monthly: t.monthly + c!.monthly, oneOff: t.oneOff + c!.oneOff }), { monthly: 0, oneOff: 0 })
    : null

  return {
    title: 'Plan',
    children: [
      {
        title: 'Scope and fit',
        body:
          (p3.timelineFit ? `<div class="callout"><b>${esc(verdictLine(p3.timelineFit))}.</b> ${esc(p3.timelineFit.note)}</div>` : '') +
          (needed !== null
            ? para(`${phases.length} phases adding up to ${formatWeeks(needed)}${availableWeeks(timeline) !== null ? ` of the ${timeline} available` : ''}.`)
            : '') +
          `<div class="cols3"><div><h4>Must have</h4>${scopeList(texts(scope.mustHaveFeatures))}</div><div><h4>Nice to have</h4>${scopeList(texts(scope.niceToHaveFeatures))}</div><div><h4>Constraints</h4>${bullets(texts(scope.constraints)) || '<p class="empty">None.</p>'}</div></div>`,
      },
      {
        title: 'Phases',
        body:
          phases
            .map((m, i) => `<div class="block"><h4>${i + 1}. ${esc(m.phase)} ${meta(m.duration)}</h4>${bullets(texts(m.deliverables))}</div>`)
            .join('') +
          keep('Way of working', para(p3.sdlcMapping)) +
          keep('Testing and release', para(p3.qaApproach)),
      },
      {
        title: 'Team',
        body: table(
          ['Role', 'FTE', 'Skills'],
          arr(p3.teamRoles).map((r) => [`<b>${esc(r.role)}</b><br><span class="meta">${esc(r.description)}</span>`, esc(r.fteEstimate), esc(texts(r.skills).join(', '))]),
          [1]
        ),
      },
      {
        title: 'Stack',
        body: table(
          ['Layer', 'Technologies', 'When'],
          arr(p4.techRoadmap).map((t) => [`<b>${esc(t.category)}</b>${Number(t.trl) < 7 ? ' <span class="meta">(unproven)</span>' : ''}`, esc(texts(t.technologies).join(', ')), esc(t.timeline)])
        ),
      },
      {
        title: 'Versions',
        body: arr(p4.versionMilestones)
          .map((v) => `<div class="block"><h4>${esc(v.version)} ${meta(v.timeline)}</h4>${para(v.description)}${bullets(texts(v.features))}</div>`)
          .join(''),
      },
      {
        title: 'Security',
        body: table(
          ['Area', 'Requirements', 'Standards'],
          arr(p4.securityConsiderations).map((c) => [`<b>${esc(c.area)}</b>`, bullets(texts(c.requirements)), esc(texts(c.compliance).join(', ') || '–')])
        ),
      },
      {
        title: 'Costs',
        body: costs.length
          ? `<table><thead><tr><th>Item</th><th class="num">Cost</th></tr></thead><tbody>${costs
              .map(
                (c, i) =>
                  `<tr class="group"><td>${esc(c.category)}</td><td class="num">${esc(costTotals[i] ? formatMoney(costTotals[i]!) : c.total)}</td></tr>` +
                  arr(c.items).map((item) => `<tr><td>${esc(item.name)}<br><span class="meta">${esc(item.justification)}</span></td><td class="num">${esc(item.cost)}</td></tr>`).join('')
              )
              .join('')}${overall ? `<tr class="total"><td>Total to run it, at the start</td><td class="num">${esc(formatMoney(overall))}</td></tr>` : ''}</tbody></table>`
          : '',
      },
    ],
  }
}

function sources(input: ReportInput): DocSection {
  const items = [
    ...arr(input.discussions?.threads).map((t) => [link(str(t.title), t.url), esc(t.where)]),
    ...arr(input.discussions?.news).map((n) => [link(str(n.title), n.url), esc(n.source)]),
    ...arr(input.existingSolutions).map((x) => [link(str(x.name), x.url), 'Existing solution']),
    ...arr(input.githubRepos).slice(0, 4).map((r) => [link(`${str(r.owner)}/${str(r.name)}`, r.url), 'GitHub']),
  ]
  return {
    title: 'Sources',
    appendix: true,
    body:
      table(['Source', 'Where'], items) +
      '<p class="meta">Discussions, news, and repositories are live search results. Existing solutions come from the AI’s knowledge. Everything else is the AI’s assessment of the idea.</p>',
  }
}

export function buildReport(input: ReportInput): string {
  const s = input.snapshot ?? {}
  const title = str(s.projectTitle) || str(s.shortTitle) || 'Project idea'
  const timeline = input.context.find((c) => c.label === 'Time you have')?.value ?? ''
  const wins = arr(input.quickWins)

  return renderDocument({
    kind: 'Evaluation report',
    title,
    summary: input.idea,
    meta: input.context.filter((c) => c.value),
    sections: [
      executiveSummary(input),
      productVision(input),
      evaluation(input),
      {
        title: 'User story map',
        children: [
          { title: 'The map', empty: NOT_YET },
          { title: 'Releases', empty: NOT_YET },
        ],
      },
      {
        title: 'Wireframes',
        children: [{ title: 'Screens and flow', empty: NOT_YET }],
      },
      plan(input, timeline),
      {
        title: 'Next steps',
        body: wins.length
          ? wins.map((w) => `<div class="block"><h4>${esc(w.title)} ${meta(w.timeEstimate)}</h4>${para(w.description)}</div>`).join('')
          : '',
      },
      sources(input),
    ],
    colophon: 'Made with The Idea Evaluator.',
  })
}
