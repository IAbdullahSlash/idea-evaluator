"use client"

import * as React from "react"
import { ChevronRight, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tick } from "./marks"

export type StageState = "marked" | "current" | "open" | "locked"

export interface StageTab {
  id: number
  label: string
  state: StageState
}

/**
 * The five stages as the paper's sections. Marked stages carry the examiner's tick;
 * locked stages wait until the one before is done.
 */
export function StageTabs({
  stages,
  onSelect,
  className,
}: {
  stages: StageTab[]
  onSelect: (id: number) => void
  className?: string
}) {
  const listRef = React.useRef<HTMLOListElement>(null)
  const [moreRight, setMoreRight] = React.useState(false)
  const current = stages.find((s) => s.state === "current")?.id

  const measure = React.useCallback(() => {
    const el = listRef.current
    if (el) setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  // Keep the current stage visible when the strip scrolls on narrow screens.
  React.useEffect(() => {
    const el = listRef.current
    const active = el?.querySelector<HTMLElement>('[aria-current="step"]')
    if (el && active) {
      el.scrollTo({ left: Math.max(0, active.offsetLeft - 12), behavior: "smooth" })
    }
    measure()
  }, [current, measure])

  React.useEffect(() => {
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])

  return (
    <nav aria-label="Evaluation stages" className={cn("relative min-w-0", className)}>
      <ol
        ref={listRef}
        onScroll={measure}
        className={cn(
          "-mb-px flex items-stretch gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          moreRight && "pr-10"
        )}
      >
        {stages.map((stage) => {
          const isCurrent = stage.state === "current"
          const isLocked = stage.state === "locked"
          return (
            <li key={stage.id} className="shrink-0">
              <button
                type="button"
                disabled={isLocked}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => { if (!isCurrent) onSelect(stage.id) }}
                className={cn(
                  "group relative flex h-14 items-center gap-2 px-3 text-sm font-medium transition-colors",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:transition-colors",
                  isCurrent && "text-ink after:bg-marker",
                  stage.state === "marked" && "text-ink-soft hover:text-ink after:bg-transparent",
                  stage.state === "open" && "text-ink-soft hover:text-ink",
                  isLocked && "cursor-not-allowed text-pencil/70"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-meta tabular",
                    isCurrent ? "text-marker" : "text-pencil"
                  )}
                >
                  {stage.id}
                </span>
                <span>{stage.label}</span>
                {stage.state === "marked" ? (
                  <Tick className="size-4 text-marker" title="Done" />
                ) : isLocked ? (
                  <Lock className="size-3.5" aria-label="Locked" />
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
      {moreRight ? (
        <button
          type="button"
          onClick={() => listRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
          aria-label="Show more stages"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-background from-60% to-transparent pr-1 text-ink-soft hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </nav>
  )
}
