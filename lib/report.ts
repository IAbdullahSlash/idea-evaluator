import { CRITERIA } from '@/lib/schemas/snapshot'
import { availableWeeks, formatMoney, formatWeeks, sumCosts, totalWeeks } from '@/lib/plan-math'

/**
 * The printable report: every page of the evaluation in one HTML document,
 * built in the browser and opened in a new tab to print or save as PDF.
 *
 * The input is whatever the page has saved, which may come from an older
 * version, so every field is read defensively and missing parts are skipped.
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

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const arr = <T = any>(value: unknown): T[] => (Array.isArray(value) ? value : [])
const texts = (value: unknown) => arr(value).map(str).filter(Boolean)
// Only http(s) links are kept, so a saved value can't smuggle in a script URL
const safeUrl = (value: unknown) => (/^https?:\/\//i.test(str(value)) ? str(value) : '')

const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '')
const field = (label: string, value: unknown) => (str(value) ? `<p><b>${esc(label)}:</b> ${esc(value)}</p>` : '')
const link = (title: string, url: unknown) => (safeUrl(url) ? `<a href="${esc(safeUrl(url))}">${esc(title)}</a>` : esc(title))
const section = (title: string, body: string) => (body.trim() ? `<section><h3>${esc(title)}</h3>${body}</section>` : '')

function snapshotPart(s: any): string {
  const rubric = s?.rubric ?? {}
  const rows = CRITERIA.filter((c) => rubric[c.id])
    .map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${esc(rubric[c.id].score)}/10</td><td>${esc(rubric[c.id].reason)}</td></tr>`)
    .join('')
  const users = s?.targetUsersMarketFit ?? {}
  return `
    <h2><span>1</span> Snapshot</h2>
    <div class="facts">
      <div><small>Mark</small><strong>${esc(s?.feasibilityScore ?? '–')}/10</strong></div>
      ${str(s?.recommendation) ? `<div><small>Verdict</small><strong>${esc(s.recommendation)}</strong></div>` : ''}
      ${Number.isFinite(Number(s?.successProbability)) ? `<div><small>Chance of success</small><strong>${esc(s.successProbability)}%</strong></div>` : ''}
      ${str(s?.estimatedTimeframe) ? `<div><small>Build time</small><strong>${esc(s.estimatedTimeframe)}</strong></div>` : ''}
    </div>
    ${rows ? section('How it was marked', `<table><tr><th>Criterion</th><th class="num">Mark</th><th>Why</th></tr>${rows}</table>`) : ''}
    ${section('The examiner’s note', str(s?.honestAiFeedback || s?.honestRealityCheck) ? `<p>${esc(s.honestAiFeedback || s.honestRealityCheck)}</p>` : '')}
    ${section('Users', field('Who', users.primaryUsers) + field('Demand', users.marketDemand) + field('How to check', users.userValidation))}
  `
}

function summaryPart(input: ReportInput): string {
  const s = input.summary ?? {}
  const d = input.discussions
  const risks = s.potentialChallenges ?? {}
  const severity = s.riskSeverity ?? {}
  const risk = (label: string, key: string, text: unknown) =>
    str(text) ? `<p><b>${label}${severity[key] ? ` (${esc(severity[key])})` : ''}:</b> ${esc(text)}</p>` : ''

  const threads = arr(d?.threads)
    .map((t) => `<li>${link(str(t.title), t.url)} <span class="meta">${esc(t.where)}</span>${str(t.says) ? `<br>${esc(t.says)}` : ''}</li>`)
    .join('')
  const news = arr(d?.news)
    .map((n) => `<li>${link(str(n.title), n.url)} <span class="meta">${esc(n.source)}</span>${str(n.note) ? `<br>${esc(n.note)}` : ''}</li>`)
    .join('')
  const solutions = arr(input.existingSolutions)
    .map((x) => `<li>${link(str(x.name), x.url)}${str(x.description) ? ` — ${esc(x.description)}` : ''}${str(x.difference) ? `<br><i>Yours differs:</i> ${esc(x.difference)}` : ''}</li>`)
    .join('')
  const repos = arr(input.githubRepos)
    .slice(0, 4)
    .map((r) => `<li>${link(`${str(r.owner)}/${str(r.name)}`, r.url)} <span class="meta">${esc(r.language)} · ★ ${esc(r.stars)}</span><br>${esc(r.description)}</li>`)
    .join('')
  const wins = arr(input.quickWins)
    .map((w) => `<li><b>${esc(w.title)}</b>${str(w.timeEstimate) ? ` <span class="meta">${esc(w.timeEstimate)}</span>` : ''}<br>${esc(w.description)}</li>`)
    .join('')

  return `
    <h2><span>2</span> Summary</h2>
    ${Number.isFinite(Number(s.feasibilityScore)) ? `<p class="lead">Re-marked at <b>${esc(s.feasibilityScore)}/10</b>.${str(s.scoreChange) ? ` ${esc(s.scoreChange)}` : ''}</p>` : ''}
    ${section(
      'Market: what people are saying',
      (str(d?.takeaway) ? `<p class="lead">${esc(d.takeaway)}</p>` : '') +
        (threads ? `<p><b>Discussions</b></p><ul>${threads}</ul>` : '') +
        (news ? `<p><b>In the news</b></p><ul>${news}</ul>` : '')
    )}
    ${section('Risks', risk('Technical', 'technical', risks.technicalRisks) + risk('Usability', 'usability', risks.usabilityIssues) + risk('Market', 'market', risks.marketRisks))}
    ${section('Existing solutions', solutions ? `<ul>${solutions}</ul>` : '')}
    ${section('Similar projects on GitHub', repos ? `<ul>${repos}</ul>` : '')}
    ${section(
      'Pros and cons',
      texts(s.pros).length || texts(s.cons).length
        ? `<div class="cols"><div><p><b>Pros</b></p>${list(texts(s.pros))}</div><div><p><b>Cons</b></p>${list(texts(s.cons))}</div></div>`
        : ''
    )}
    ${section('Quick wins', wins ? `<ul>${wins}</ul>` : '')}
    ${section('Executive summary', str(s.executiveSummary) ? `<p>${esc(s.executiveSummary)}</p>` : '')}
  `
}

function planPart(input: ReportInput, timeline: string): string {
  const p3 = input.plan?.stage3 ?? {}
  const p4 = input.plan?.stage4 ?? {}
  const phases = arr(p3.projectMilestones)
  const scope = input.summary?.requirementsScope ?? {}
  const cuts = texts(p3.scopeCuts).map((c) => c.toLowerCase())
  const scopeItem = (f: string) => (cuts.some((c) => c.includes(f.toLowerCase()) || f.toLowerCase().includes(c)) ? `<s>${esc(f)}</s> (cut)` : esc(f))
  const scopeList = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${scopeItem(i)}</li>`).join('')}</ul>` : '')

  const needed = totalWeeks(phases.map((m) => str(m.duration)))
  const fit = p3.timelineFit
  const costs = arr(p4.costEstimates)
  const costTotals = costs.map((c) => sumCosts(arr(c.items).map((i) => str(i.cost))))
  const overall = costTotals.every(Boolean)
    ? costTotals.reduce<{ monthly: number; oneOff: number }>((t, c) => ({ monthly: t.monthly + c!.monthly, oneOff: t.oneOff + c!.oneOff }), { monthly: 0, oneOff: 0 })
    : null

  return `
    <h2><span>3</span> Plan</h2>
    ${fit ? `<p class="lead"><b>${esc(fit.verdict === 'fits' ? 'Fits the time you have' : fit.verdict === 'tight' ? 'Tight for the time you have' : 'More than the time you have')}.</b> ${esc(fit.note)}</p>` : ''}
    ${needed !== null ? `<p class="meta">${phases.length} phases adding up to ${formatWeeks(needed)}${availableWeeks(timeline) !== null ? ` of the ${esc(timeline)} available` : ''}.</p>` : ''}
    ${section(
      'Scope',
      `<div class="cols3"><div><p><b>Must have</b></p>${scopeList(texts(scope.mustHaveFeatures))}</div><div><p><b>Nice to have</b></p>${scopeList(texts(scope.niceToHaveFeatures))}</div><div><p><b>Constraints</b></p>${list(texts(scope.constraints))}</div></div>`
    )}
    ${section(
      'Phases',
      phases
        .map((m, i) => `<div class="phase"><p><b>${i + 1}. ${esc(m.phase)}</b> <span class="meta">${esc(m.duration)}</span></p>${list(texts(m.deliverables))}</div>`)
        .join('')
    )}
    ${section('Way of working', str(p3.sdlcMapping) ? `<p>${esc(p3.sdlcMapping)}</p>` : '')}
    ${section('Testing and release', str(p3.qaApproach) ? `<p>${esc(p3.qaApproach)}</p>` : '')}
    ${section(
      'Team',
      arr(p3.teamRoles).length
        ? `<table><tr><th>Role</th><th class="num">FTE</th><th>Skills</th></tr>${arr(p3.teamRoles)
            .map((r) => `<tr><td><b>${esc(r.role)}</b><br>${esc(r.description)}</td><td class="num">${esc(r.fteEstimate)}</td><td>${esc(texts(r.skills).join(', '))}</td></tr>`)
            .join('')}</table>`
        : ''
    )}
    ${section(
      'Stack',
      arr(p4.techRoadmap).length
        ? `<table><tr><th>Layer</th><th>Technologies</th><th>When</th></tr>${arr(p4.techRoadmap)
            .map((t) => `<tr><td>${esc(t.category)}${Number(t.trl) < 7 ? ' <i>(unproven)</i>' : ''}</td><td>${esc(texts(t.technologies).join(', '))}</td><td>${esc(t.timeline)}</td></tr>`)
            .join('')}</table>`
        : ''
    )}
    ${section(
      'Versions',
      arr(p4.versionMilestones)
        .map((v) => `<div class="phase"><p><b>${esc(v.version)}</b> <span class="meta">${esc(v.timeline)}</span><br>${esc(v.description)}</p>${list(texts(v.features))}</div>`)
        .join('')
    )}
    ${section(
      'Security and compliance',
      arr(p4.securityConsiderations)
        .map((c) => `<p><b>${esc(c.area)}</b>${texts(c.compliance).length ? ` <span class="meta">${esc(texts(c.compliance).join(', '))}</span>` : ''}</p>${list(texts(c.requirements))}`)
        .join('')
    )}
    ${section(
      'Costs',
      costs.length
        ? `<table><tr><th>Item</th><th class="num">Cost</th></tr>${costs
            .map(
              (c, i) =>
                `<tr class="group"><td>${esc(c.category)}</td><td class="num">${esc(costTotals[i] ? formatMoney(costTotals[i]!) : c.total)}</td></tr>` +
                arr(c.items).map((item) => `<tr><td>${esc(item.name)}<br><span class="meta">${esc(item.justification)}</span></td><td class="num">${esc(item.cost)}</td></tr>`).join('')
            )
            .join('')}${overall ? `<tr class="total"><td>Total to run it, at the start</td><td class="num">${esc(formatMoney(overall))}</td></tr>` : ''}</table>`
        : ''
    )}
  `
}

export function buildReport(input: ReportInput): string {
  const s = input.snapshot ?? {}
  const title = str(s.projectTitle) || str(s.shortTitle) || 'Project idea'
  const timeline = input.context.find((c) => c.label === 'Time you have')?.value ?? ''
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}: evaluation report</title>
<style>
  :root { --ink: #1c1f24; --soft: #4a5260; --pencil: #7a8291; --rule: #dde1e6; --marker: #d6392f; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: var(--ink); font: 15px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 52rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
  header { border-bottom: 2px solid var(--ink); padding-bottom: 1.25rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.9rem; line-height: 1.15; margin: 0 0 .5rem; letter-spacing: -.02em; }
  h2 { font-size: 1.35rem; margin: 2.5rem 0 1rem; padding-top: 1rem; border-top: 1px solid var(--rule); break-after: avoid; }
  h2 span { color: var(--marker); font-family: ui-monospace, monospace; margin-right: .4rem; }
  h3 { font-size: 1rem; margin: 1.5rem 0 .5rem; break-after: avoid; }
  p { margin: .35rem 0; }
  ul { margin: .35rem 0 .75rem; padding-left: 1.2rem; }
  li { margin: .25rem 0; }
  a { color: var(--ink); text-decoration-color: var(--marker); }
  .meta, small { color: var(--pencil); font-size: .85em; }
  .lead { font-size: 1.02rem; }
  .idea { color: var(--soft); white-space: pre-wrap; }
  .context { display: flex; flex-wrap: wrap; gap: .25rem 1.25rem; margin-top: .75rem; font-size: .9rem; color: var(--soft); }
  .facts { display: flex; flex-wrap: wrap; gap: 1.5rem; margin: .5rem 0 1rem; }
  .facts small { display: block; }
  .facts strong { font-size: 1.3rem; }
  table { width: 100%; border-collapse: collapse; margin: .5rem 0; font-size: .92rem; }
  th, td { text-align: left; vertical-align: top; padding: .45rem .5rem .45rem 0; border-bottom: 1px solid var(--rule); }
  th { font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--pencil); }
  .num { text-align: right; white-space: nowrap; }
  tr.group td { font-weight: 600; padding-top: .8rem; }
  tr.total td { font-weight: 700; border-top: 2px solid var(--ink); border-bottom: 0; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
  .phase, section, tr { break-inside: avoid; }
  s { color: var(--pencil); }
  .print { position: fixed; top: 1rem; right: 1rem; padding: .6rem 1rem; border: 0; border-radius: .4rem; background: var(--marker); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--rule); color: var(--pencil); font-size: .85rem; }
  @media (max-width: 640px) { .cols, .cols3 { grid-template-columns: 1fr; } .print { position: static; margin-bottom: 1rem; } }
  @media print { .print { display: none; } main { padding: 0; } @page { margin: 18mm 16mm; } }
</style>
</head>
<body>
<main>
  <button class="print" onclick="window.print()">Print or save as PDF</button>
  <header>
    <h1>${esc(title)}</h1>
    <p class="idea">${esc(input.idea)}</p>
    <div class="context">${input.context.filter((c) => c.value).map((c) => `<span><b>${esc(c.label)}:</b> ${esc(c.value)}</span>`).join('')}</div>
  </header>
  ${snapshotPart(s)}
  ${input.summary ? summaryPart(input) : ''}
  ${input.plan ? planPart(input, timeline) : ''}
  <footer>Evaluation report from The Idea Evaluator · ${esc(date)}. Market discussions and repositories are live search results; everything else is the AI's assessment.</footer>
</main>
</body>
</html>`
}
