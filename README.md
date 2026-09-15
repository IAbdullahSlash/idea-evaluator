# The Idea Evaluator

AI-powered project idea validation that walks you through a progressive 5-stage analysis — from a quick feasibility snapshot to a full technical roadmap, cost breakdown, and execution handoff.

![The Idea Evaluator](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=for-the-badge&logo=tailwindcss)
![Gemini](https://img.shields.io/badge/Gemini-Flash-4285F4?style=for-the-badge&logo=google)

## What It Does

Describe your project idea and The Idea Evaluator gives you:

1. **Quick Snapshot** — Feasibility score (1–10), success probability, difficulty level, and an honest AI reality check
2. **Executive Summary** — Market fit, key strengths, potential challenges, tech stack recommendations, and similar existing projects
3. **Roadmaps** — Project milestones, SDLC methodology, team roles with FTE estimates, and QA strategy
4. **Tech Roadmap** — Layered technology roadmap with TRL levels, version-based milestones, security/compliance considerations, and cost estimates
5. **Deep Resources** — Shareable report link, freelancer matching, Jira integration (coming), and PDF export

## Architecture

```
User (browser)
  └─ Next.js 14 (App Router)
       ├─ Theme provider (dark/light)
       └─ AI Assistant overlay
            │
            ├─ POST /api/analyze ──► Gemini 3.5-flash (feasibility + analysis)
            ├─ POST /api/chat     ──► Gemini 3.5-flash (streaming assistant)
            ├─ POST /api/stage-data ──► Groq/Llama + third-party APIs
            │    ├─ Research papers (Google Scholar)
            │    ├─ Google Custom Search
            │    └─ GitHub repositories
            └─ POST /api/export-pdf
```

Keys stay server-side — the client never sees them.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 + Radix UI primitives |
| AI (analysis) | Google Gemini 3.5-flash via `@google/generative-ai` |
| AI (stage data) | Groq / Llama via `@ai-sdk/groq` |
| Search | Google Custom Search API |
| Research | Google Scholar |
| Repos | GitHub API |
| State | React context + localStorage persistence |
| Export | PDF via print-friendly HTML |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://ai.google.dev)
- (Optional) A [Groq API key](https://console.groq.com) for stage-data processing

### Setup

```bash
# Clone and install
git clone <repo-url>
cd idea-eval
npm install

# Add environment variables
cp .env.local.example .env.local
# Edit .env.local with your GEMINI_API_KEY (and GEMINI_API_KEY_2, GROQ_API_KEY if using)

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start describing your idea.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Primary Gemini API key for analysis + chat |
| `GEMINI_API_KEY_2` | No | Fallback key — the analyzer tries both until one works |
| `GROQ_API_KEY` | No | Used by `/api/stage-data` for Groq/Llama processing |

## Project Structure

```
app/
├── layout.tsx          # Root layout (theme + AI assistant provider)
├── page.tsx            # Landing page
├── analysis/
│   └── page.tsx        # Main analysis workflow (5 stages)
├── api/
│   ├── analyze/route.ts    # Core analysis endpoint (Gemini)
│   ├── chat/route.ts       # Streaming AI assistant (Gemini)
│   ├── stage-data/route.ts # Stage 2–5 data (Groq + search)
│   ├── research-papers/route.ts
│   ├── google-search/route.ts
│   ├── github-repos/route.ts
│   ├── refine/route.ts
│   └── export-pdf/route.tsx
components/          # UI components (Navbar, Hero, Features, etc.)
contexts/            # React contexts (AI assistant, theme)
```

## Key Design Decisions

- **Progressive disclosure** — Users aren't overwhelmed; each stage unlocks after reviewing the previous one
- **Brutal honesty** — The AI is instructed to be realistic, not Pollyanna. Low scores get red-tinted warnings
- **Context-aware scoring** — Keywords like "AI", "blockchain", "real-time" adjust feasibility scores downward to reflect real-world complexity
- **Multi-key fallback** — Two Gemini keys are tried sequentially so one quota exhaustion doesn't break the analysis
- **Local persistence** — Analysis progress survives page refreshes via localStorage
- **Server-side keys** — API keys never leave the server; all LLM calls are proxied

## License

MIT
