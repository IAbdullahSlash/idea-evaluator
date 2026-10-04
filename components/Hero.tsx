"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sheet, SheetRow } from "@/components/script/sheet"
import { Underline } from "@/components/script/marks"

const pages = [
  { n: 1, name: "Snapshot", asks: "Is it worth building?" },
  { n: 2, name: "Summary", asks: "What works, and what could sink it?" },
  { n: 3, name: "Plan", asks: "What are the phases, who does what, and what will it cost?" },
  { n: 4, name: "Hand-off", asks: "How do I take this further?" },
]

export function Hero() {
  const router = useRouter()
  const [idea, setIdea] = React.useState("")
  const ready = idea.trim().length >= 15

  const start = (e: React.FormEvent) => {
    e.preventDefault()
    if (!idea.trim()) return
    try {
      sessionStorage.setItem("draftIdea", idea.trim())
    } catch {
      // Storage can be unavailable (private mode); the analysis page still opens blank.
    }
    router.push("/analysis?new")
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:pb-24">
      <h1 className="max-w-[16ch] text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[3.75rem] lg:text-[4.5rem]">
        Is your project idea{" "}
        <span className="relative inline-block whitespace-nowrap">
          worth building?
          <Underline className="absolute -bottom-2 left-0 h-3 w-full text-marker sm:-bottom-3 sm:h-4" />
        </span>
      </h1>
      <p className="mt-8 max-w-[58ch] text-[1.0625rem] leading-relaxed text-ink-soft sm:text-lg">
        Write it down and get it marked like an exam answer: a score out of ten, the real risks noted in the margin, and,
        if it holds up, a plan you can start on today.
      </p>

      <form onSubmit={start} className="mt-10 sm:mt-12">
        <Sheet>
          <SheetRow
            divider={false}
            marginLabel="What gets marked"
            margin={
              <div>
                <p className="text-sm font-semibold text-marker">What gets marked</p>
                <ol className="mt-3 space-y-3">
                  {pages.map((p) => (
                    <li key={p.n} className="flex gap-3">
                      <span className="pt-0.5 font-mono text-meta text-pencil tabular">{p.n}</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{p.name}</p>
                        <p className="text-meta text-ink-soft">{p.asks}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 border-t border-rule pt-3 text-meta text-pencil">
                  Each page opens only when you choose to go on, so a weak idea can stop at page one.
                </p>
              </div>
            }
          >
            <Label htmlFor="idea" className="text-sm font-semibold text-ink">
              Your idea
            </Label>
            <Textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A campus app that matches students into study groups by course and free periods, with a shared timetable and chat."
              className="ruled mt-3 min-h-[12rem] resize-none rounded-none border-0 border-b border-rule bg-transparent px-0 py-1.5 text-[1.0625rem] leading-8 md:text-[1.0625rem] dark:bg-transparent text-ink shadow-none placeholder:text-pencil/80 focus-visible:border-marker focus-visible:ring-0"
            />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-meta text-pencil">Say what it does, who it is for, and what you already know about building it.</p>
              <Button type="submit" size="lg" disabled={!ready} className="h-11 px-5 text-[0.9375rem]">
                Mark my idea <ArrowRight />
              </Button>
            </div>
          </SheetRow>
        </Sheet>
      </form>
    </section>
  )
}
