"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Wordmark } from "./marks"

/**
 * The top bar shared by every page: wordmark on the left, page actions on the right.
 * Solid desk colour with a hairline: no blur, no glass.
 */
export function AppBar({
  children,
  actions,
  className,
  wide = false,
}: {
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <header className={cn("sticky top-0 z-40 border-b border-rule bg-background", className)}>
      <div
        className={cn(
          "mx-auto flex h-14 items-center gap-4 px-4 sm:px-6",
          wide ? "max-w-[88rem]" : "max-w-6xl"
        )}
      >
        <Link
          href="/"
          className="shrink-0 rounded-sm"
          aria-label="The Idea Evaluator, home"
        >
          <Wordmark />
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>
    </header>
  )
}
