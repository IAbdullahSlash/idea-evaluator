"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CircledScore, Cross, Query, Tick } from "@/components/script/marks"
import { Fact, MarginNote, Sheet, SheetHeading, SheetRow } from "@/components/script/sheet"

/*
 * One illustrative evaluation, written by the makers to show what a marked
 * page looks like. It is labelled as an example everywhere it appears and is
 * never presented as a real user's result.
 */

const idea =
  "A browser extension that turns recorded lectures into revision flashcards, with spaced-repetition reminders before exams."

const pages = [
  { id: "snapshot", label: "Snapshot" },
  { id: "summary", label: "Summary" },
  { id: "roadmap", label: "Plan" },
] as const
type PageId = (typeof pages)[number]["id"]

const phases = [
  { name: "Prove the cards", weeks: 3, does: ["Transcribe five of your own lectures", "Generate cards and mark them by hand", "Keep the prompt that wins"] },
  { name: "Build the extension", weeks: 4, does: ["Upload a recording", "Review and edit cards", "Export to Anki"] },
  { name: "Test with your course", weeks: 2, does: ["Ten classmates use it for one topic", "Count the cards they keep"] },
  { name: "Write up and demo", weeks: 2, does: ["Report with results", "Recorded demo"] },
]
const totalWeeks = phases.reduce((n, p) => n + p.weeks, 0)

/** Mount children only once the element is on screen, so the score's circle draws in view. */
function useSeen<T extends Element>() {
  const ref = React.useRef<T>(null)
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === "undefined") return setSeen(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen] as const
}

function Hl({ children }: { children: React.ReactNode }) {
  return <mark className="hl bg-transparent text-ink">{children}</mark>
}

function SnapshotPage({ seen }: { seen: boolean }) {
  return (
    <>
      <SheetRow
        marginFirstOnMobile
        marginLabel="Mark"
        margin={
          <div className="space-y-5">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start">
              <div className="h-[7.5rem] w-[9.5rem]">{seen ? <CircledScore score={6} /> : null}</div>
              <div>
                <p className="text-[1.0625rem] font-semibold text-marker">Feasible</p>
                <p className="text-meta text-pencil">Feasibility, out of 10</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-rule pt-4">
              <Fact label="Success odds"><span className="tabular">55%</span></Fact>
              <Fact label="Difficulty">Intermediate</Fact>
            </dl>
          </div>
        }
      >
        <h3 className="max-w-[40ch] text-[1.375rem] font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[1.5rem]">
          {idea}
        </h3>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
          <Fact label="For">Final-year project</Fact>
          <Fact label="Team">2 people</Fact>
          <Fact label="Time">3–6 months</Fact>
        </dl>
      </SheetRow>
      <SheetRow
        marginLabel="Examiner's note"
        margin={<MarginNote mark={<Query />} title="The honest read">The highlighted line is what decides the mark.</MarginNote>}
      >
        <SheetHeading level={3}>Reality check</SheetHeading>
        <p className="max-w-[68ch] text-[0.9375rem] leading-[1.7] text-ink">
          <Hl>Building it is realistic; getting good flashcards out of messy lecture audio is the hard part.</Hl>{" "}
          Transcription is good enough today, but turning a transcript into questions worth revising needs careful
          prompting and testing on real courses. Spaced repetition is a solved problem: use an existing algorithm.
        </p>
      </SheetRow>
      <SheetRow
        divider={false}
        marginLabel="Next"
        margin={<MarginNote mark={<Tick />} title="Worth continuing">With the narrower scope below.</MarginNote>}
      >
        <SheetHeading level={3}>Verdict</SheetHeading>
        <p className="max-w-[68ch] text-[0.9375rem] leading-[1.7] text-ink">
          <Hl>Build a narrower version.</Hl> Start with one course you are taking and uploaded recordings only, and
          prove the cards are worth studying from before adding reminders.
        </p>
      </SheetRow>
    </>
  )
}

function SummaryPage() {
  return (
    <>
      <SheetRow
        margin={<MarginNote mark={<Tick />} title="2 strengths that hold up">Lead with these when you pitch it.</MarginNote>}
      >
        <SheetHeading level={3}>Strengths</SheetHeading>
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="label-caps">Value proposition</dt>
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">Saves the hours students spend turning notes into flashcards before exams.</dd>
          </div>
          <div>
            <dt className="label-caps">Market fit</dt>
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">Every student revises, and the need peaks at a predictable time each term.</dd>
          </div>
        </dl>
      </SheetRow>
      <SheetRow
        margin={
          <MarginNote
            mark={
              <span className="flex -space-x-2.5" role="img" aria-label="Serious risk">
                <Cross /> <Cross />
              </span>
            }
            title="1 serious risk"
          >
            The highlighted part of each is what to solve first.
          </MarginNote>
        }
      >
        <SheetHeading level={3}>Risks</SheetHeading>
        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="label-caps">Technical</dt>
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">
              <Hl>Card quality depends on transcript accuracy,</Hl> which drops with accents and poor microphones.
            </dd>
          </div>
          <div>
            <dt className="label-caps">Usability</dt>
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">
              <Hl>Students won&apos;t trust cards they didn&apos;t write,</Hl> unless editing them is quick.
            </dd>
          </div>
          <div>
            <dt className="label-caps">Market</dt>
            <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">
              <Hl>Anki and Quizlet already own the habit,</Hl> so this has to feed into them, not replace them.
            </dd>
          </div>
        </dl>
      </SheetRow>
      <SheetRow
        divider={false}
        margin={<MarginNote mark={<Query />} title="Already out there">Be ready to say how yours is different.</MarginNote>}
      >
        <SheetHeading level={3}>Existing solutions</SheetHeading>
        <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-soft">
          Flashcard apps exist, and some note tools generate cards from text. Few start from the lecture recording
          itself, which is the gap this idea has to prove.
        </p>
      </SheetRow>
    </>
  )
}

function RoadmapPage() {
  return (
    <>
      {phases.map((p, i) => (
        <SheetRow
          key={p.name}
          marginDesktopOnly
          margin={
            <div>
              <p className="font-hand text-[1.6rem] font-bold leading-none text-marker tabular">
                {p.weeks} weeks
              </p>
              <p className="mt-2 text-meta text-pencil">{i === 0 ? "Starts first" : `After ${phases[i - 1].name.toLowerCase()}`}</p>
            </div>
          }
        >
          <div className="flex gap-4">
            <span className="pt-1 font-mono text-meta text-pencil tabular">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <h3 className="text-[1.0625rem] font-semibold text-ink">{p.name}</h3>
              <p className="mt-0.5 font-hand text-lg font-bold leading-tight text-marker lg:hidden">{p.weeks} weeks</p>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-[0.9375rem] text-ink sm:grid-cols-2">
                {p.does.map((d) => (
                  <li key={d} className="flex gap-2"><span className="text-pencil">–</span><span>{d}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </SheetRow>
      ))}
      <SheetRow
        divider={false}
        margin={<MarginNote mark={<Tick />} title={`${totalWeeks} weeks in total`}>Fits a 14-week term with 3 weeks spare.</MarginNote>}
      >
        <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
          The real plan also lists the team you need, how to test it, the tools for each layer, security, and what it costs.
        </p>
      </SheetRow>
    </>
  )
}

export function ExampleEvaluation() {
  const [page, setPage] = React.useState<PageId>("snapshot")
  const [ref, seen] = useSeen<HTMLDivElement>()
  const tabsId = React.useId()

  const onKey = (e: React.KeyboardEvent) => {
    const i = pages.findIndex((p) => p.id === page)
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null
    if (next === null) return
    e.preventDefault()
    const p = pages[(next + pages.length) % pages.length]
    setPage(p.id)
    document.getElementById(`${tabsId}-${p.id}`)?.focus()
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="max-w-2xl">
        <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
            What a marked idea looks like
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
            An example we wrote to show the format: the mark and the notes sit in the margin, beside the part of the
            idea they judge.
          </p>
      </div>

      <div ref={ref} className="mt-10">
        <Sheet>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 sm:px-8">
            <div role="tablist" aria-label="Example evaluation pages" className="-mb-px flex gap-1" onKeyDown={onKey}>
              {pages.map((p, i) => {
                const active = p.id === page
                return (
                  <button
                    key={p.id}
                    id={`${tabsId}-${p.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`${tabsId}-panel`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setPage(p.id)}
                    className={cn(
                      "relative flex h-12 items-center gap-2 px-3 text-sm font-medium transition-colors first:-ml-3",
                      "after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full",
                      active ? "text-ink after:bg-marker" : "text-ink-soft hover:text-ink"
                    )}
                  >
                    <span className={cn("font-mono text-meta tabular", active ? "text-marker" : "text-pencil")}>{i + 1}</span>
                    {p.label}
                  </button>
                )
              })}
            </div>
            <p className="rounded-sm border border-marker/40 px-2 py-0.5 text-meta font-semibold text-marker">
              Example, not a real user&apos;s idea
            </p>
          </div>
          <div
            id={`${tabsId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-${page}`}
            key={page}
            className="animate-ink-in"
          >
            {page === "snapshot" ? <SnapshotPage seen={seen} /> : page === "summary" ? <SummaryPage /> : <RoadmapPage />}
          </div>
        </Sheet>
      </div>
    </section>
  )
}
