import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * The script sheet. Every row has an answer column and an examiner's margin,
 * divided by the double red rule. Because each row carries its own margin,
 * a note always sits level with the part of the answer it judges.
 */

export function Sheet({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sheet overflow-hidden", className)} {...props} />
}

/** The vertical double rule (desktop) and its horizontal stand-in (mobile). */
function MarginRule({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return orientation === "vertical" ? (
    <div aria-hidden className="hidden w-[5px] border-x border-marker/80 lg:block" />
  ) : (
    <div aria-hidden className="h-[5px] border-y border-marker/80 lg:hidden" />
  )
}

export function SheetRow({
  children,
  margin,
  marginLabel,
  className,
  bodyClassName,
  marginFirstOnMobile = false,
  marginDesktopOnly = false,
  divider = true,
  as: Tag = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  margin?: React.ReactNode
  marginLabel?: string
  bodyClassName?: string
  /** Put the margin above the answer on narrow screens (used for the verdict). */
  marginFirstOnMobile?: boolean
  /** Hide the margin (and its horizontal rule) below lg; the caller shows it inline instead. */
  marginDesktopOnly?: boolean
  /** Draw a hairline between this row and the next. */
  divider?: boolean
  as?: "section" | "div" | "article"
}) {
  return (
    <Tag
      className={cn(
        "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_5px_var(--margin-width)]",
        divider && "border-b border-rule last:border-b-0",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "min-w-0 px-5 py-6 sm:px-8 sm:py-7 lg:order-none",
          marginFirstOnMobile ? "order-3" : "order-1",
          bodyClassName
        )}
      >
        {children}
      </div>
      <MarginRule orientation="vertical" />
      {margin && !marginDesktopOnly ? (
        <div className="order-2 lg:hidden">
          <MarginRule orientation="horizontal" />
        </div>
      ) : null}
      <aside
        aria-label={marginLabel}
        className={cn(
          "min-w-0 px-5 py-6 sm:px-8 lg:order-none lg:px-6 lg:py-7",
          marginFirstOnMobile ? "order-1" : "order-3",
          (!margin || marginDesktopOnly) && "hidden lg:block"
        )}
      >
        {margin}
      </aside>
    </Tag>
  )
}

/** A short examiner's note in the margin: a mark, a heading, and a line or two. */
export function MarginNote({
  mark,
  title,
  children,
  className,
}: {
  mark?: React.ReactNode
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex gap-2.5", className)}>
      {mark ? <div className="pt-0.5 text-marker">{mark}</div> : null}
      <div className="min-w-0 space-y-1">
        {title ? <p className="text-sm font-semibold text-marker">{title}</p> : null}
        {children ? <div className="text-sm leading-relaxed text-ink-soft">{children}</div> : null}
      </div>
    </div>
  )
}

/** A section heading inside the answer column. */
export function SheetHeading({
  children,
  aside,
  className,
  level = 2,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
  className?: string
  level?: 2 | 3
}) {
  const H = level === 2 ? "h2" : "h3"
  return (
    <div className={cn("mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1", className)}>
      <H
        className={cn(
          "font-semibold text-ink",
          level === 2 ? "text-[1.375rem] leading-tight" : "text-base"
        )}
      >
        {children}
      </H>
      {aside ? <div className="text-meta text-pencil">{aside}</div> : null}
    </div>
  )
}

/** A label/value pair, used for facts like difficulty or duration. */
export function Fact({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 text-[0.9375rem] font-medium text-ink">{children}</dd>
    </div>
  )
}

/** A quiet, flat chip for tags such as tech names or compliance standards. */
export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-rule bg-muted px-2 py-0.5 text-meta font-medium text-ink-soft",
        className
      )}
    >
      {children}
    </span>
  )
}
