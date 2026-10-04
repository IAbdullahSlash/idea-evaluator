# The Idea Evaluator

Write down a project idea and get it marked like an exam answer: a score out of ten with the reasons, the real risks, what people are already saying about the problem, and, if it holds up, a plan you can start on. Built for students and hackathon teams.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss)
![Gemini](https://img.shields.io/badge/Gemini-Flash-4285F4?style=for-the-badge&logo=google)

## What It Does

The evaluation runs in four stages. Each one opens only when you choose to continue, so a weak idea can stop at the first.

1. **Snapshot** — A mark out of 10, worked out from six criteria (a real problem, worth solving, not already done, something new, within reach, someone wants it), each with its own mark and reason. Also a recommendation (Build / Narrow it down / Rethink / Drop), odds of success, an honest reality check, who it is for, and questions to ask yourself. If the idea is too vague to mark, it asks up to three follow-up questions first.
2. **Summary** — Pros and cons, risks with severity, what people have said on Hacker News, quick wins, existing solutions, similar projects on GitHub, and an executive summary.
3. **Plan** — Scope, a suggested stack, phases with deliverables, the team you need, technology layers, versions, security, and costs.
4. **Hand-off** — A printable report and links to find people who can help build it.

## Architecture

```
Browser (Next.js 14 App Router)
  ├─ /            Landing page
  └─ /analysis    The four-stage evaluation
        │
        ├─ POST /api/analyze      Snapshot and Summary (validated against a schema)
        ├─ POST /api/stage-data   Plan and Hand-off
        ├─ POST /api/discussions  Hacker News threads, filtered and summarised
        ├─ POST /api/github-repos Similar repositories
        └─ POST /api/export-pdf   Printable report
                │
                └─ lib/llm.ts — AI router
                     "quality" tier: gemini-3.5-flash → gemini-3.8-flash → gemini-2.5-flash → Groq gpt-oss-120b
                     "light" tier:   gemini-3.5-flash-lite → 2.5-flash-lite → 3.1-flash-lite → Groq gpt-oss-20b
```

Every Gemini model is tried with every configured key before moving on. A model/key pair that hits a quota, rate limit, overload, or timeout is skipped until it recovers, and identical prompts are cached for a day. Keys stay on the server.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS 3, Radix UI primitives, Geist and Kalam fonts |
| AI | Google Gemini via `@google/generative-ai`, Groq (OpenAI-compatible API) as fallback |
| Validation | zod |
| Discussions | Hacker News via the Algolia search API (no key needed) |
| Repos | GitHub search API |
| State | localStorage (the idea, answers, and every stage survive a refresh) |

## Getting Started

### Prerequisites

- Node.js 18+
- At least one [Google Gemini API key](https://aistudio.google.com/apikey)
- (Optional) A [Groq API key](https://console.groq.com) as the last-resort fallback

### Setup

```bash
git clone https://github.com/IAbdullahSlash/idea-evaluator.git
cd idea-evaluator
npm install
```

Create `.env.local` (see the variables below), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and write down your idea.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` or `GEMINI_API_KEY_1` | Yes | Gemini API key |
| `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, … | No | More keys, each from a different Google project (quota is per project) |
| `GEMINI_API_KEYS` | No | Alternatively, a comma-separated list of keys |
| `GROQ_API_KEY` | No | Groq key, used when no Gemini model is available |
| `GITHUB_TOKEN` | No | Raises the GitHub search rate limit; search works without it |

A system-wide environment variable with the same name takes priority over `.env.local`.

In development, `GET /api/llm-status` shows which model/key pairs are available or cooling down (never the keys themselves).

## Project Structure

```
app/
├── layout.tsx               # Root layout: fonts and theme
├── page.tsx                 # Landing page
├── login/page.tsx           # Sign-in screen (accounts are not built yet)
├── analysis/page.tsx        # The four-stage evaluation
└── api/
    ├── analyze/             # Snapshot and Summary
    ├── stage-data/          # Plan and Hand-off
    ├── discussions/         # Hacker News discussions
    ├── github-repos/        # Similar repositories
    ├── google-search/       # Web search (needs Google Custom Search keys; not used by the UI yet)
    ├── export-pdf/          # Printable report
    └── llm-status/          # Dev-only router status
components/
├── script/                  # The marked-script design system: sheet, margin notes, marks, stage tabs
├── ui/                      # Radix-based primitives (button, input, label, textarea, dropdown menu)
└── *.tsx                    # Landing page sections
lib/
├── llm.ts                   # Multi-key, multi-model AI router
├── schemas/snapshot.ts      # Snapshot schema and marking criteria
├── hackernews.ts            # Hacker News search and comments
└── validation.ts            # Idea input checks shared by client and server
```

## Key Design Decisions

- **Honest over encouraging** — The mark is the average of six explained criteria, so every score can be traced to its reasons.
- **Progressive stages** — Each stage unlocks only when you choose to continue.
- **Real sources, labelled** — Discussions and repositories come from live searches; existing solutions come from the model's knowledge with every link checked, and are labelled as such.
- **Spread the AI load** — A router walks models and keys so one exhausted quota doesn't stop an evaluation.
- **Server-side keys** — API keys never reach the browser.

## License

MIT
