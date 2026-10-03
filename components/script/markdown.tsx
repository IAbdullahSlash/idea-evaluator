import * as React from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

/*
 * Markdown set in the script's ink: one component for analysis text and the
 * assistant, so AI output always reads the same way.
 */

const components: Components = {
  h1: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold text-ink first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-4 text-[0.9375rem] font-semibold text-ink first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 space-y-1.5 pl-5 last:mb-0 [list-style:'–__'] marker:text-pencil">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0 marker:text-pencil">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline decoration-marker/60 hover:decoration-marker">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l border-marker pl-4 text-ink-soft">{children}</blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "")
    return isBlock ? (
      <code className={cn("block overflow-x-auto rounded-md border border-rule bg-muted p-3 font-mono text-[0.8125rem] leading-relaxed", className)}>
        {children}
      </code>
    ) : (
      <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>
    )
  },
  pre: ({ children }) => <pre className="my-3">{children}</pre>,
  hr: () => <hr className="my-4 border-rule" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-rule px-2 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-rule px-2 py-1.5 align-top">{children}</td>,
}

export function Markdown({
  children,
  className,
  rehypePlugins,
}: {
  children: string
  className?: string
  rehypePlugins?: React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"]
}) {
  return (
    <div className={cn("text-[0.9375rem] leading-[1.7] text-ink", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
