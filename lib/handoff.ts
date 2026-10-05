/**
 * The Hand-off page's exports, built from the plan in the browser:
 * the plan as Jira issues, and searches for people with the plan's skills.
 */

interface Phase {
  phase: string
  duration: string
  deliverables: string[]
}

interface Role {
  role: string
  skills: string[]
}

// RFC 4180: quote every field and double any quotes inside it
const csvField = (value: string) => `"${value.replace(/"/g, '""')}"`

/**
 * The plan as a CSV for Jira's importer: each phase is an epic and each of its
 * deliverables a task under it, linked through the Issue ID and Parent ID
 * columns. Two Labels columns (Jira takes one label per column) carry the
 * project and the phase, so the issues are easy to filter.
 */
export function jiraCsv(phases: Phase[], projectTitle: string): string {
  const label = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
  const rows: string[][] = [['Issue ID', 'Parent ID', 'Issue Type', 'Summary', 'Description', 'Labels', 'Labels']]
  let id = 1
  phases.forEach((phase, i) => {
    const epicId = id++
    const phaseLabel = `phase-${i + 1}`
    rows.push([
      String(epicId),
      '',
      'Epic',
      `${i + 1}. ${phase.phase}`,
      `Estimated time: ${phase.duration}`,
      label,
      phaseLabel,
    ])
    for (const deliverable of phase.deliverables) {
      rows.push([String(id++), String(epicId), 'Task', deliverable, `Part of phase ${i + 1}: ${phase.phase}`, label, phaseLabel])
    }
  })
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n')
}

export interface HireLink {
  role: string
  skills: string
  sites: { name: string; url: string }[]
}

/** Searches on Upwork and Fiverr for each role in the plan, by the role's main skill. */
export function hireLinks(roles: Role[]): HireLink[] {
  return roles.slice(0, 4).map((r) => {
    const skills = r.skills.slice(0, 2)
    // One skill per search: two unrelated ones ("UI/UX Design Manual Testing") find almost nobody
    const query = encodeURIComponent((skills[0] || r.role).trim())
    return {
      role: r.role,
      skills: skills.join(', '),
      sites: [
        { name: 'Upwork', url: `https://www.upwork.com/nx/search/talent/?q=${query}` },
        { name: 'Fiverr', url: `https://www.fiverr.com/search/gigs?query=${query}` },
      ],
    }
  })
}

/** Save text as a file through the browser's download. */
export function downloadText(filename: string, text: string, type: string): void {
  // No byte-order mark: Jira's importer would read it as part of the first column's name
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Open an HTML document in a new tab. Returns false when the browser blocked
 * the tab; the document is then saved as a file so it isn't lost.
 */
export function openHtml(html: string, filename: string): boolean {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  if (window.open(url, '_blank')) {
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return true
  }
  URL.revokeObjectURL(url)
  downloadText(filename, html, 'text/html')
  return false
}

/** A safe file name from the project title. */
export const fileSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project'
