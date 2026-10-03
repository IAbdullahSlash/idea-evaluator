import Link from "next/link"
import { Github, Linkedin } from "lucide-react"
import { Wordmark } from "@/components/script/marks"

const makers = [
  {
    name: "Abdullah Azmi",
    github: "https://github.com/IAbdullahSlash",
    linkedin: "https://www.linkedin.com/in/abdullah-azmi-492120359/",
  },
  {
    name: "Darakhshan Ifraque",
    github: "https://github.com/Darakhshan-dev",
    linkedin: "https://www.linkedin.com/in/darakhshan-ifraque-6287a1320/",
  },
]

export function Footer() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="w-fit rounded-sm">
          <Wordmark compact />
        </Link>
        <ul className="flex flex-col gap-3 text-sm text-ink-soft sm:flex-row sm:gap-8">
          {makers.map((m) => (
            <li key={m.name} className="flex items-center gap-3">
              <span>{m.name}</span>
              <a href={m.github} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on GitHub`} className="rounded-sm text-pencil transition-colors hover:text-ink">
                <Github className="size-4" />
              </a>
              <a href={m.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on LinkedIn`} className="rounded-sm text-pencil transition-colors hover:text-ink">
                <Linkedin className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
