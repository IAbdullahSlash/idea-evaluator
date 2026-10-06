"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

/*
 * The other way in: add the Idea Evaluator to your own AI as a connector (an
 * MCP server). Your AI does the thinking with the same method; every stage is
 * saved here, with a link to share.
 */

const PRODUCTION_ORIGIN = "https://idea-evaluator-nine.vercel.app"

const apps = [
  {
    id: "claude",
    name: "Claude",
    steps: [
      <>Open <b>Settings → Connectors</b> on claude.ai or in Claude Desktop.</>,
      <>Choose <b>Add custom connector</b>, name it <b>Idea Evaluator</b>, and paste the address above.</>,
      <>In a new chat, turn the connector on from the tools menu and write: <i>“Evaluate my idea with the Idea Evaluator: …”</i></>,
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    steps: [
      <>Open <b>Settings → Apps &amp; Connectors → Advanced settings</b> and turn on <b>Developer mode</b>.</>,
      <>Create a connector named <b>Idea Evaluator</b>, paste the address above, and choose <b>No authentication</b>.</>,
      <>In a new chat, pick it from the <b>+</b> menu and ask it to evaluate your idea.</>,
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    steps: [
      <>
        With the <b>Gemini CLI</b>, add the server to <code className="font-mono text-[0.85em]">~/.gemini/settings.json</code>:
      </>,
      "config",
      <>Run <code className="font-mono text-[0.85em]">gemini</code> and ask it to evaluate your idea.</>,
    ],
  },
] as const

export function ConnectAI() {
  // The address of this site's MCP server; the deployed site by default, the current one once loaded
  const [origin, setOrigin] = React.useState(PRODUCTION_ORIGIN)
  React.useEffect(() => setOrigin(window.location.origin), [])
  const url = `${origin}/api/mcp`

  const [app, setApp] = React.useState<(typeof apps)[number]["id"]>("claude")
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the address is selectable in the field
    }
  }
  const current = apps.find((a) => a.id === app)!

  return (
    <section id="connect" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.5rem]">
            Or use it in your own AI
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
            Add the Idea Evaluator to ChatGPT, Claude, or Gemini as a connector. Your AI marks the idea with the same
            method: the six criteria, live research on what people are saying, a plan sized to your time, and the
            documents. Every stage is saved here, with a link you can share.
          </p>
          <p className="mt-4 text-meta text-pencil">
            Your AI does the thinking on your own plan, so it is as quick and as thorough as the model you use.
          </p>
        </div>

        <div>
          <label htmlFor="mcp-url" className="label-caps">Connector address</label>
          <div className="mt-2 flex gap-2">
            <input
              id="mcp-url"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-sheet px-3 font-mono text-sm text-ink focus-visible:border-marker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marker/40"
            />
            <Button type="button" onClick={copy} className="h-11 shrink-0 px-4" aria-live="polite">
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div role="tablist" aria-label="Set it up in" className="mt-8 flex gap-1 border-b border-rule">
            {apps.map((a) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                id={`tab-${a.id}`}
                aria-selected={app === a.id}
                aria-controls={`panel-${a.id}`}
                onClick={() => setApp(a.id)}
                className={
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
                  (app === a.id ? "border-marker text-ink" : "border-transparent text-ink-soft hover:text-ink")
                }
              >
                {a.name}
              </button>
            ))}
          </div>

          <ol role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} className="mt-2">
            {current.steps.map((step, i) =>
              step === "config" ? (
                <li key={i} className="pb-4 pl-12">
                  <pre className="overflow-x-auto rounded-md border border-rule bg-sheet p-3 font-mono text-[0.8125rem] leading-relaxed text-ink">
                    {JSON.stringify({ mcpServers: { "idea-evaluator": { httpUrl: url } } }, null, 2)}
                  </pre>
                </li>
              ) : (
                <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-b border-rule py-4 last:border-b-0">
                  <span className="font-hand text-[1.5rem] font-bold leading-none text-marker tabular">
                    {current.steps.slice(0, i + 1).filter((s) => s !== "config").length}
                  </span>
                  <p className="text-[0.9375rem] leading-relaxed text-ink-soft [&_b]:font-semibold [&_b]:text-ink">{step}</p>
                </li>
              )
            )}
          </ol>

          <p className="mt-4 text-meta text-pencil">
            Other apps that support MCP connectors, such as Cursor or VS Code, use the same address. Menu names change
            between versions, and some apps offer connectors only on certain plans.
          </p>
        </div>
      </div>
    </section>
  )
}
