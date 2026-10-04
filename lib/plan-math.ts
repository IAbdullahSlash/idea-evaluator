/**
 * Arithmetic the plan shouldn't leave to the model: how long the phases take
 * in total, and what the costs add up to. Anything that can't be read reliably
 * returns null, so the page shows the model's own words instead of a wrong sum.
 */

const WEEKS_PER_MONTH = 52 / 12
const number = '(\\d+(?:\\.\\d+)?)'

/** "1.5 weeks", "3-5 days", "2 months" → weeks, using the upper end of a range. Days are working days, 5 a week. */
export function durationWeeks(text: string): number | null {
  const m = text.match(new RegExp(`${number}(?:\\s*(?:-|–|to)\\s*${number})?\\s*(day|week|wk|month|mo)`, 'i'))
  if (!m) return null
  const amount = Number(m[2] ?? m[1])
  const unit = m[3].toLowerCase()
  return unit.startsWith('d') ? amount / 5 : unit.startsWith('w') ? amount : amount * WEEKS_PER_MONTH
}

/** The phases' total in weeks, or null if any phase's duration can't be read. */
export function totalWeeks(durations: string[]): number | null {
  let total = 0
  for (const d of durations) {
    const weeks = durationWeeks(d)
    if (weeks === null) return null
    total += weeks
  }
  return durations.length > 0 ? total : null
}

/** The time the builder has, in weeks ("1-2 months" → about 8.7). Open-ended answers have no limit. */
export function availableWeeks(timeline: string | undefined): number | null {
  if (!timeline || timeline.includes('+')) return null
  return durationWeeks(timeline)
}

export function formatWeeks(weeks: number): string {
  const rounded = Math.round(weeks * 2) / 2
  return `${rounded} ${rounded === 1 ? 'week' : 'weeks'}`
}

// ── costs ──────────────────────────────────────────────────────────────

export interface Money {
  monthly: number // recurring, with yearly costs spread over the months
  oneOff: number
}

/** "$12/year", "$5-10/month", "$25 one-time", "Free" → money; null if the period or amount is unclear. */
export function parseCost(text: string): Money | null {
  const t = text.toLowerCase()
  // "Free tier, then $20/month": what it costs to start is what counts
  if (/^\s*free\b/.test(t)) return { monthly: 0, oneOff: 0 }
  const m = t.match(/\$\s*([\d,]+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*\$?\s*([\d,]+(?:\.\d+)?))?/)
  if (!m) return null
  const amount = Number((m[2] ?? m[1]).replace(/,/g, ''))
  if (!Number.isFinite(amount)) return null
  if (/one[- ]?(time|off)|once|upfront|lifetime/.test(t)) return { monthly: 0, oneOff: amount }
  if (/\/\s*(yr|year)|per year|a year|yearly|annual/.test(t)) return { monthly: amount / 12, oneOff: 0 }
  if (/\/\s*(mo|month)|per month|a month|monthly/.test(t)) return { monthly: amount, oneOff: 0 }
  return amount === 0 ? { monthly: 0, oneOff: 0 } : null
}

/** The sum of the costs, or null if any of them can't be read. */
export function sumCosts(costs: string[]): Money | null {
  const total: Money = { monthly: 0, oneOff: 0 }
  for (const c of costs) {
    const money = parseCost(c)
    if (!money) return null
    total.monthly += money.monthly
    total.oneOff += money.oneOff
  }
  return total
}

const dollars = (n: number) => `$${n >= 100 ? Math.round(n).toLocaleString('en-US') : Number(n.toFixed(n % 1 ? 2 : 0))}`

/** "$1/month + $25 once", "$0", … */
export function formatMoney({ monthly, oneOff }: Money): string {
  const parts = [monthly > 0 ? `${dollars(monthly)}/month` : '', oneOff > 0 ? `${dollars(oneOff)} once` : '']
  return parts.filter(Boolean).join(' + ') || '$0'
}
