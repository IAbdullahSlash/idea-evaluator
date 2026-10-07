import { CRITERIA } from '@/lib/schemas/snapshot'
import { QUESTIONS, type Answer, type Overall } from '@/lib/schemas/overall'
import { availableWeeks, formatMoney, formatWeeks, sumCosts, totalWeeks } from '@/lib/plan-math'
import { arr, bullets, esc, facts, link, para, str, table, texts, type DocSection, type DocumentSpec } from '@/lib/documents/template'

/**
 * "Idea as an overall", on its fixed outline:
 *
 *   1 The idea as a whole · 2 The problem and who cares · 3 Building and scaling it
 *   4 Maintaining and living with it · 5 Measuring success · Appendix A: sources
 *
 * The four middle chapters answer the four questions; each opens with its
 * short answer and adds the evaluation's own evidence (alternatives, plan,
 * costs). The saved evaluation may come from an older version, so every
 * field outside the overall answers is read defensively.
 */

export interface OverallInput {
  overall: Overall
  idea: string
  context: { label: string; value: string }[]
  snapshot: any
  summary?: any
  discussions?: any
  githubRepos?: any[]
  existingSolutions?: any[]
  plan?: { stage3: any; stage4: any }
}

const answerLine = (answer: Answer, summary: string) => `<div class="callout"><b>${esc(answer)}.</b> ${esc(summary)}</div>`

function wholeIdea(input: OverallInput): DocSection {
  const o = input.overall
  const s = input.snapshot ?? {}
  const s2 = input.summary ?? {}
  const rubric = s.rubric ?? {}
  const mark = Number.isFinite(Number(s2.feasibilityScore)) ? s2.feasibilityScore : s.feasibilityScore
  return {
    title: 'The idea as a whole',
    children: [
      {
        title: 'Verdict',
        body:
          `<div class="callout"><b>${esc(str(s.recommendation) || 'Verdict')}</b> · marked <b>${esc(mark ?? '–')}/10</b>` +
          (Number.isFinite(Number(s.successProbability)) ? ` · ${esc(s.successProbability)}% chance of success` : '') +
          `</div>` +
          para(o.verdict) +
          facts([
            ['Difficulty', s.difficultyLevel],
            ['Estimated build time', s2.estimatedTimeframe || s.estimatedTimeframe],
            ['Domain', s.detectedDomain],
          ]),
      },
      {
        title: 'The four questions',
        body: table(
          ['#', 'Question', 'Answer', 'In short'],
          QUESTIONS.map((q, i) => [String(i + 1), esc(q.question), `<b>${esc(o[q.id].answer)}</b>`, esc(o[q.id].summary)])
        ),
      },
      {
        title: 'How it was marked',
        body: table(
          ['Criterion', 'Mark', 'Why'],
          CRITERIA.filter((c) => rubric[c.id]).map((c) => [`<b>${esc(c.name)}</b><br><span class="meta">${esc(c.asks)}</span>`, `${esc(rubric[c.id].score)}/10`, esc(rubric[c.id].reason)]),
          [1]
        ),
      },
    ],
  }
}

function problem(input: OverallInput): DocSection {
  const p = input.overall.problem
  const solutions = arr(input.existingSolutions).map((x) => [`<b>${link(str(x.name), x.url)}</b><br>${esc(x.description)}`, esc(x.difference)])
  const takeaway = str(input.discussions?.takeaway)
  return {
    title: 'The problem and who cares',
    body: answerLine(p.answer, p.summary),
    children: [
      { title: 'The pain point', body: para(p.painPoint) },
      { title: 'Who cares', body: para(p.whoCares) + (takeaway ? `<p><b>What people are saying:</b> ${esc(takeaway)}</p>` : '') },
      { title: 'How urgent it is', body: para(p.urgency) },
      {
        title: 'What makes it different',
        body: para(p.differentiation) + (solutions.length ? table(['Existing solution', 'How this idea differs'], solutions) : ''),
      },
    ],
  }
}

function build(input: OverallInput, timeline: string): DocSection {
  const b = input.overall.build
  const p3 = input.plan?.stage3
  const phases = arr(p3?.projectMilestones)
  const needed = totalWeeks(phases.map((m) => str(m.duration)))
  const fit =
    p3?.timelineFit && needed !== null
      ? para(
          `The plan's ${phases.length} phases add up to ${formatWeeks(needed)}${availableWeeks(timeline) !== null ? ` of the ${timeline} available` : ''}. ${str(p3.timelineFit.note)}`
        )
      : ''
  const team = table(
    ['Role', 'FTE', 'Skills'],
    arr(p3?.teamRoles).map((r) => [`<b>${esc(r.role)}</b>`, esc(r.fteEstimate), esc(texts(r.skills).join(', '))]),
    [1]
  )
  return {
    title: 'Building and scaling it',
    body: answerLine(b.answer, b.summary),
    children: [
      { title: 'Architecture', body: para(b.architecture) },
      { title: 'People, skills, and time', body: para(b.resources) + fit + team },
      { title: 'Gaps to close', body: bullets(b.gaps) },
    ],
  }
}

function sustain(input: OverallInput): DocSection {
  const s = input.overall.sustain
  const costs = arr(input.plan?.stage4?.costEstimates)
  const items = costs.flatMap((c) => arr(c.items).map((i) => ({ name: str(i.name), cost: str(i.cost) })))
  const totals = costs.map((c) => sumCosts(arr(c.items).map((i) => str(i.cost))))
  const overall = totals.length && totals.every(Boolean)
    ? totals.reduce<{ monthly: number; oneOff: number }>((t, c) => ({ monthly: t.monthly + c!.monthly, oneOff: t.oneOff + c!.oneOff }), { monthly: 0, oneOff: 0 })
    : null
  const running = items.length
    ? `<table><thead><tr><th>Item</th><th class="num">Cost</th></tr></thead><tbody>${items
        .map((i) => `<tr><td>${esc(i.name)}</td><td class="num">${esc(i.cost)}</td></tr>`)
        .join('')}${overall ? `<tr class="total"><td>Total to run it, at the start</td><td class="num">${esc(formatMoney(overall))}</td></tr>` : ''}</tbody></table>`
    : ''
  return {
    title: 'Maintaining and living with it',
    body: answerLine(s.answer, s.summary),
    children: [
      { title: 'Running it and technical debt', body: para(s.operations) + (running ? `<h4>Running costs from the plan</h4>${running}` : '') },
      {
        title: 'Dependencies and the way out',
        body: table(
          ['Dependency', 'Risk', 'Way out'],
          s.dependencies.map((d) => [`<b>${esc(d.name)}</b>${d.usedFor ? `<br><span class="meta">${esc(d.usedFor)}</span>` : ''}`, esc(d.risk || '–'), esc(d.exit || '–')])
        ),
      },
    ],
  }
}

function success(input: OverallInput): DocSection {
  const s = input.overall.success
  return {
    title: 'Measuring success',
    body: answerLine(s.answer, s.summary),
    children: [
      { title: 'Business measures', body: table(['Measure', 'Target'], s.businessMetrics.map((m) => [esc(m.metric), `<b>${esc(m.target || '–')}</b>`])) },
      { title: 'Value for the people using it', body: para(s.userValue) },
      { title: 'Warning signs', body: bullets(s.warningSigns) },
    ],
  }
}

function sources(input: OverallInput): DocSection {
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

export function buildOverall(input: OverallInput): DocumentSpec {
  const s = input.snapshot ?? {}
  const timeline = input.context.find((c) => c.label === 'Time you have')?.value ?? ''
  return {
    kind: 'Idea as an overall',
    title: str(s.projectTitle) || str(s.shortTitle) || 'Project idea',
    summary: input.idea,
    meta: input.context.filter((c) => c.value),
    sections: [wholeIdea(input), problem(input), build(input, timeline), sustain(input), success(input), sources(input)],
    colophon: 'Made with The Idea Evaluator.',
  }
}
