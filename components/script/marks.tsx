import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * The examiner's marks, drawn as single hand strokes.
 * They inherit `currentColor`, so `text-marker` makes them red.
 */

type MarkProps = React.SVGProps<SVGSVGElement> & { title?: string }

function Mark({ title, className, children, viewBox = "0 0 24 24", ...props }: MarkProps) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  )
}

export function Tick(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M3.5 13.2c1.6 1.1 3.1 2.7 4.4 4.9 2.6-5.2 6.6-9.9 12.6-13.6" />
    </Mark>
  )
}

export function Cross(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M5.2 5.6c4.6 3.9 8.9 8.4 13.4 13.2" />
      <path d="M18.4 4.9c-4.4 4.1-8.7 8.9-13.1 14.1" />
    </Mark>
  )
}

export function Query(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M8.2 8.3c.3-2.6 2.3-4.2 4.6-4 2.6.2 4 2.3 3.4 4.4-.6 2.1-3.6 2.8-4 5.6" />
      <path d="M12.1 19.3l.1.2" strokeWidth={2.8} />
    </Mark>
  )
}

/** A hand-drawn underline stroke for emphasis under a word. */
export function Underline({ className, ...props }: MarkProps) {
  return (
    <Mark viewBox="0 0 200 12" preserveAspectRatio="none" className={cn("h-3 w-full", className)} {...props}>
      <path d="M2 8.5c38-4.1 79-6 120-5.2 26 .5 51 2.1 76 4.6" strokeWidth={2.4} />
    </Mark>
  )
}

/**
 * The score, written by hand and circled by the examiner.
 * The circle draws itself once when it mounts: the page's one authored motion.
 */
export function CircledScore({
  score,
  outOf = 10,
  size = "lg",
  animate = true,
  className,
}: {
  score: number | string
  outOf?: number
  size?: "md" | "lg"
  animate?: boolean
  className?: string
}) {
  const box = size === "lg" ? "h-[7.5rem] w-[9.5rem]" : "h-16 w-20"
  const num = size === "lg" ? "text-[3.6rem]" : "text-[1.9rem]"
  const den = size === "lg" ? "text-xl" : "text-sm"
  return (
    <div
      className={cn("relative inline-flex items-center justify-center text-marker", box, className)}
      role="img"
      aria-label={`Scored ${score} out of ${outOf}`}
    >
      <svg
        viewBox="0 0 160 124"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        aria-hidden
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M118 17C98 6 56 5 31 21 9 35 4 64 17 86c13 22 49 33 82 30 30-3 53-20 56-46 3-23-11-42-34-53-12-6-27-8-40-7"
          pathLength={400}
          strokeDasharray={400}
          className={animate ? "animate-mark-draw [animation-delay:250ms]" : undefined}
          style={{ ["--mark-length" as string]: 400 }}
        />
      </svg>
      <span className={cn("relative font-hand font-bold leading-none tabular", num)}>
        {score}
        <span className={cn("font-normal opacity-80", den)}>/{outOf}</span>
      </span>
    </div>
  )
}

/** The wordmark: the product name with the examiner's tick. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold tracking-[-0.02em] text-ink", className)}>
      <span className={compact ? "text-[0.95rem]" : "text-[1.05rem]"}>The Idea Evaluator</span>
      <Tick className="size-[1.15em] -translate-y-[0.2em] text-marker" strokeWidth={2.6} />
    </span>
  )
}
