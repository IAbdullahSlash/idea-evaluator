/**
 * The Hand-off page's helpers, run in the browser: searches for people with
 * the plan's skills, and saving files.
 */

interface Role {
  role: string
  skills: string[]
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

/** Save a file through the browser's download. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A safe file name from the project title. */
export const fileSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project'
