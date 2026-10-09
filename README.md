<div align="center">

# The Idea Evaluator ✓

**Write down a project idea and get it marked like an exam answer.**

A mark out of ten with the reasons, the real risks, what people are already saying about the problem, a plan sized to the weeks you have, and the documents to start building: an IEEE 830 SRS with wireframes, a data model and a user story map. It runs on the website, or inside your own AI as an MCP connector. Built for students and hackathon teams.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-Flash-8e75b2?logo=googlegemini&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-connector-d6352b)
![Upstash](https://img.shields.io/badge/Upstash-Redis-00e9a3?logo=upstash&logoColor=white)
[![Showcase](https://github.com/IAbdullahSlash/idea-evaluator/actions/workflows/pages.yml/badge.svg)](https://github.com/IAbdullahSlash/idea-evaluator/actions/workflows/pages.yml)

**[Try it on the web ↗](https://idea-evaluator-slash.vercel.app)** · **[Showcase: video and interactive diagrams ↗](https://iabdullahslash.github.io/idea-evaluator/)** · Connector address: `https://idea-evaluator-slash.vercel.app/api/mcp`

</div>

## Walkthrough video

<!-- mcp-connector-walkthrough-video -->

[![The Idea Evaluator in your own AI: watch the walkthrough](showcase/media/mcp-connector-walkthrough-poster.jpg)](https://iabdullahslash.github.io/idea-evaluator/#video)

<sub><b>57 s · 1080p · with sound.</b> Click the picture to play it on the showcase page, or <a href="showcase/media/mcp-connector-walkthrough.mp4">download mcp-connector-walkthrough.mp4</a>.</sub>

The video follows one real evaluation (a bake planner for small bakeries) through the MCP connector, from a one-line idea to a traced SRS:

| Time | Chapter | What you see |
|---|---|---|
| 0:00 | **The problem** | A generic chat answers "Great idea!" and lists twelve features. It doesn't understand, brainstorm, research or guide |
| 0:08 | **The fix** | The Idea Evaluator does all four, as a connector in your own AI |
| 0:12 | **1 · Connect** | Copy the address from the site, add a custom connector, turn it on in a new chat |
| 0:22 | **2 · Understand** | Your AI asks what's missing before anything is marked |
| 0:27 | **3 · Snapshot** | `save_snapshot`: 7/10 overall from six criteria, "Narrow it down" |
| 0:31 | **4 · Research** | `research_market`: real discussions, news and GitHub projects; a dead link is dropped |
| 0:36 | **5 · Plan** | `save_plan`: seven weeks of the one to two months available, $1 a month to run |
| 0:41 | **6 · SRS** | The documents are written, every requirement traced to a user story, then downloaded as PDF or Word |

Every tool reply in the video is the server's real reply from that evaluation; every page shown is a real capture of the site. The chat and settings windows are a plain "Your AI", not any one product.

---

## Table of contents

▶️ [Walkthrough video](#walkthrough-video)

1. [The problem](#1-the-problem)
2. [What it does](#2-what-it-does)
3. [Step by step: the connector in your own AI](#3-step-by-step-the-connector-in-your-own-ai)
   - [3.1 Connect it](#31-connect-it)
   - [3.2 Stage by stage](#32-stage-by-stage)
   - [3.3 The SRS and the other Hand-off documents](#33-the-srs-and-the-other-hand-off-documents)
4. [On the website: the four stages](#4-on-the-website-the-four-stages)
5. [How it works](#5-how-it-works)
   - [5.1 System architecture](#51-system-architecture)
   - [5.2 The four-stage workflow](#52-the-four-stage-workflow)
   - [5.3 One evaluation through the connector](#53-one-evaluation-through-the-connector)
   - [5.4 How the SRS is written](#54-how-the-srs-is-written)
   - [5.5 The AI router](#55-the-ai-router)
6. [MCP tools reference](#6-mcp-tools-reference)
7. [Getting started](#7-getting-started)
8. [Configuration](#8-configuration)
9. [Project structure](#9-project-structure)
10. [The showcase and GitHub Actions](#10-the-showcase-and-github-actions)
11. [Key design decisions](#11-key-design-decisions)
12. [Tech stack](#12-tech-stack)
13. [License](#13-license)

---

## 1. The problem

Ask a general-purpose AI about a project idea and it is on your side from the first message. It says the idea is great, suggests a dozen features, and moves on. It doesn't:

| It doesn't… | So you never find out… |
|---|---|
| **Understand** the idea | what it is for, who it is for, or how much time you really have |
| **Brainstorm** it honestly | which parts are strong, which are weak, and whether to build it at all |
| **Research** it | who is already doing it and what people are actually saying about the problem |
| **Guide** you to a build | what to cut so it fits your weeks, or what the requirements are |

![Generic AI cheers every idea: understand, brainstorm, research and guide, each crossed out](showcase/screenshots/01-the-problem.jpg)

The Idea Evaluator marks the idea instead. It asks what's missing first, scores it against six explained criteria, researches it in live sources, plans it to your time, and writes the documents you need to start. You can use it on the website, or add it to the AI you already use.

![The Idea Evaluator does all four, as a connector in your own AI](showcase/screenshots/02-the-fix.jpg)

---

## 2. What it does

The evaluation runs in four stages. Each opens only when you choose to continue, so a weak idea can stop at the first.

| Stage | What you get |
|---|---|
| **1 · Snapshot** | A mark out of 10, the average of six criteria (a real problem, worth solving, not already done, something new, within reach, someone wants it), each with its own mark and reason. A recommendation (Build / Narrow it down / Rethink / Drop), odds of success, a reality check, who it is for, and questions to ask yourself. If the idea is too vague to mark, up to three follow-up questions come first |
| **2 · Summary** | Pros and cons, risks with severity, what people are discussing (Hacker News, Stack Exchange), recent news (Google News), quick wins, existing solutions with every link checked, similar projects on GitHub, and an executive summary |
| **3 · Plan** | Whether the scope fits your time, phases sized to it, scope cuts, the team, the stack, versions, security, and costs added up |
| **4 · Hand-off** | **Idea as an overall** (four questions: the problem and who cares, building and scaling it, maintaining it, measuring success) and a detailed **SRS** (IEEE 830 outline with the product vision, user story map, wireframes, data model and traceability), both as PDF or Word; the plan sent to **Linear** as a roadmap; and searches for people with the plan's skills |

**Highlights**

- ✍️ **Marked, not cheered.** The mark is the average of six explained criteria, so every score can be traced to its reasons.
- 🔎 **Real research.** Discussions, news and repositories come from live searches, not the model's memory. Existing-solution links are opened and dropped if they don't work.
- 🧮 **Arithmetic in code.** Phase weeks, costs and the overall mark are added up by the server, not guessed by the model.
- 📄 **Documents you can hand in.** An IEEE 830 / ISO/IEC/IEEE 29148 SRS where every requirement cites a user story and a screen.
- 🤖 **In your own AI.** The same method runs as an MCP connector in Claude, ChatGPT or Gemini. Your AI does the thinking; the server runs no AI at all.
- 🔗 **One link.** Every stage made through the connector is saved for 90 days and opens read-only at `/e/<id>`.

---

## 3. Step by step: the connector in your own AI

The Idea Evaluator is also an MCP server. Add one address to your AI as a custom connector and it evaluates ideas with the same method as the website, in your chat. These screenshots come from the [walkthrough video](#walkthrough-video).

### 3.1 Connect it

**Step 1. Copy the connector address.** The landing page's *Or use it in your own AI* section has the address and a Copy button.

```
https://idea-evaluator-slash.vercel.app/api/mcp
```

![The "Or use it in your own AI" section with the Copy button clicked](showcase/screenshots/03-copy-the-address.jpg)

**Step 2. Follow the steps for your app.** The same section has tabs for Claude, ChatGPT and Gemini, each with its own steps:

![The Gemini tab with its settings.json snippet](showcase/screenshots/04-steps-per-app.jpg)

| App | Steps |
|---|---|
| **Claude** | Open **Settings → Connectors** on claude.ai or in Claude Desktop. Choose **Add custom connector**, name it **Idea Evaluator**, and paste the address. In a new chat, turn the connector on from the tools menu and write *"Evaluate my idea with the Idea Evaluator: …"* |
| **ChatGPT** | Open **Settings → Apps & Connectors → Advanced settings** and turn on **Developer mode**. Create a connector named **Idea Evaluator**, paste the address, and choose **No authentication**. In a new chat, pick it from the **+** menu and ask it to evaluate your idea |
| **Gemini** | With the **Gemini CLI**, add the server to `~/.gemini/settings.json` (below), run `gemini`, and ask it to evaluate your idea |
| **Others** | Apps that support MCP connectors, such as Cursor or VS Code, use the same address |

```json
{
  "mcpServers": {
    "idea-evaluator": {
      "httpUrl": "https://idea-evaluator-slash.vercel.app/api/mcp"
    }
  }
}
```

Menu names change between versions, and some apps offer connectors only on certain plans.

**Step 3. Add it as a custom connector.** Name it, paste the address, and add it. It shows as connected.

| Adding it | Connected |
|---|---|
| ![The Add custom connector dialog with the name and address filled in](showcase/screenshots/05-add-custom-connector.jpg) | ![The connector list showing Idea Evaluator as connected](showcase/screenshots/06-connected.jpg) |

**Step 4. Turn it on in a new chat** and ask for an evaluation.

![A new chat with the Idea Evaluator connector turned on and the request typed](showcase/screenshots/07-turn-it-on.jpg)

### 3.2 Stage by stage

From here your AI calls the server's tools in order. Each reply carries the next stage's method and how to write it up in the chat. On the right of each screenshot is the saved stage at the evaluation's link.

**Understand.** Before anything is marked, your AI asks for what's missing: what it is for, how much time you have, your experience. Then `start_evaluation` checks the idea and the four context answers, starts a stored evaluation, and returns the marking method and the link.

![The AI asks two questions before marking, then start_evaluation returns the link](showcase/screenshots/08-understand.jpg)

**Snapshot.** Your AI marks the six criteria; `save_snapshot` computes the overall mark from them. Here: **7/10, "Narrow it down", 55% chance of success.**

![save_snapshot returns 7/10 and the saved Snapshot page appears](showcase/screenshots/09-snapshot.jpg)

**Research.** `research_market` searches Hacker News, Stack Exchange, Google News and GitHub, and returns the results quoted as data. `save_summary` keeps only discussions and news from that research and opens every existing-solution link: *"1 existing-solution link(s) didn't open and were removed."*

![research_market lists similar GitHub projects; save_summary drops a dead link](showcase/screenshots/10-research.jpg)

**Plan.** `save_plan` adds up the phases and costs and checks they fit the time available: *"Phases add up to 7 weeks of the 1-2 months available. Running cost at the start: $1/month."*

![save_plan confirms seven weeks of the time available at $1 a month](showcase/screenshots/11-plan.jpg)

### 3.3 The SRS and the other Hand-off documents

Ask for the documents and your AI writes them part by part, with the server checking each one:

| Tool | What the server checks or computes |
|---|---|
| `save_overall` | The four answers (Yes, Partly or No) and their reasoning: *"1. Yes, 2. Partly, 3. Partly, 4. Yes."* |
| `save_brief` | Numbers the user stories (US-1, US-2, …) into the plan's versions: *"6 stories in 3 activities, 3 in the first release (v0.1)."* |
| `save_wireframes` | Keeps only screens that cite real story IDs: *"4 screens."* |
| `save_srs_overview`, `save_srs_features`, `save_srs_quality` | Assembles the SRS from its three parts, numbers the requirements, and traces them: *"4 features, 8 functional and 7 non-functional requirements, 5 data entities. Traceability: every one of the 6 user stories is covered by at least one requirement."* |

![The document tools tick by and the SRS reports full traceability](showcase/screenshots/12-srs-written.jpg)

**What's in the SRS.** It follows the IEEE 830 / ISO/IEC/IEEE 29148 outline:

1. **Introduction**: purpose, scope (in and out), definitions, references, overview
2. **Overall description**: product perspective with the vision statement, product functions, user classes, operating environment, constraints, assumptions and dependencies
3. **External interface requirements**: user interfaces (the wireframes, with the stories each screen serves), hardware, software and communications interfaces
4. **System features**: each feature with numbered, testable *"The system shall …"* requirements, priorities and the stories they cite
5. **Non-functional requirements**: performance, safety, security, software quality attributes, business rules
6. **Data requirements**: the data model, drawn as a diagram, with every entity's fields; data retention
7. **Appendices**: the user story map by release, the traceability table (requirement → story → screen), and open questions

![The SRS pages fanned out: IEEE 830 SRS, user story map, wireframes, data model, idea as an overall](showcase/screenshots/13-srs-parts.jpg)

**Take it away.** Every stage is saved to one link. The Hand-off page downloads both documents as **PDF or Word** and can send the plan to **Linear** as a roadmap: a project per version, phases as milestones, deliverables and user stories as issues.

![The Hand-off page with Download PDF, Download Word and Connect Linear](showcase/screenshots/14-hand-off.jpg)

![The Idea Evaluator, in your own AI: Claude, ChatGPT, Gemini](showcase/screenshots/15-outro.jpg)

---

## 4. On the website: the four stages

Without an AI of your own, the website runs the same four stages with its own AI router.

1. **Write it down.** Describe the idea and answer four questions: what it is for (MVP, full product, prototype, API, mobile or web app), the domain, your experience, and the time you have. Press **Mark my idea**.
2. **Snapshot.** `/api/analyze` asks the AI router for the marks and checks the reply against a schema. Too vague to mark? It asks up to three follow-up questions first.
3. **Summary.** On **Continue**, three requests run in parallel: the full assessment (`/api/analyze`), discussions and news (`/api/discussions`), and similar repositories (`/api/github-repos`).
4. **Plan.** `/api/stage-data` writes the plan; `lib/plan-math.ts` adds up phase weeks and costs and checks them against your time.
5. **Hand-off.** The document routes (`/api/overall`, `/api/brief`, `/api/wireframes`, `/api/srs`) write each document from everything the earlier stages learned. PDF and Word files are built in the browser when you download them.

Every stage is kept in `localStorage`, so a refresh doesn't lose anything.

---

## 5. How it works

The diagrams below are made with [Archify](showcase/diagrams/) from typed JSON, checked for crossings, readability and layout, and published as interactive pages (pan, zoom, search, guided views, light and dark) on the [showcase site](https://iabdullahslash.github.io/idea-evaluator/). Click a picture to open its interactive version.

### 5.1 System architecture

[![System architecture](showcase/diagrams/system-architecture.png)](https://iabdullahslash.github.io/idea-evaluator/diagrams/system-architecture.html?present=1)

**[▶ Open the interactive diagram ↗](https://iabdullahslash.github.io/idea-evaluator/diagrams/system-architecture.html?present=1)** · [JSON source](showcase/diagrams/system-architecture.architecture.json)

Two ways in, one method. On the website, the Next.js pages call API routes, which ask the AI router for schema-checked JSON and call the research helpers for live sources. Through the connector, your own AI calls the MCP server at `/api/mcp`, which runs no AI: it supplies the method, the same research helpers, the checks and the arithmetic, and saves each stage to Upstash Redis for 90 days. A saved evaluation opens read-only at `/e/<id>` in the same Snapshot, Summary, Plan and Hand-off pages.

### 5.2 The four-stage workflow

[![The four-stage evaluation on the website](showcase/diagrams/four-stage-evaluation.png)](https://iabdullahslash.github.io/idea-evaluator/diagrams/four-stage-evaluation.html?present=1)

**[▶ Open the interactive diagram ↗](https://iabdullahslash.github.io/idea-evaluator/diagrams/four-stage-evaluation.html?present=1)** · [JSON source](showcase/diagrams/four-stage-evaluation.workflow.json)

Each stage is a page on `/analysis` that unlocks only when you continue. Behind each one is a single server call (or three in parallel for the Summary), and every AI reply is checked against a zod schema, with one retry on a different model if it comes back incomplete.

### 5.3 One evaluation through the connector

[![One evaluation through the MCP connector](showcase/diagrams/mcp-connector.png)](https://iabdullahslash.github.io/idea-evaluator/diagrams/mcp-connector.html?present=1)

**[▶ Open the interactive diagram ↗](https://iabdullahslash.github.io/idea-evaluator/diagrams/mcp-connector.html?present=1)** · [JSON source](showcase/diagrams/mcp-connector.sequence.json)

Your AI asks before it marks, then calls the tools in order. The server saves each stage, computes the mark, searches the live sources and quotes the results back as data (never as instructions), adds up weeks and costs, and numbers and traces the SRS. Your AI writes the result up in the chat with the evaluation's link.

### 5.4 How the SRS is written

[![How the Hand-off documents and the SRS are written](showcase/diagrams/srs-generation.png)](https://iabdullahslash.github.io/idea-evaluator/diagrams/srs-generation.html?present=1)

**[▶ Open the interactive diagram ↗](https://iabdullahslash.github.io/idea-evaluator/diagrams/srs-generation.html?present=1)** · [JSON source](showcase/diagrams/srs-generation.dataflow.json)

Stories come first. The product brief numbers the user stories (US-1…) into the plan's versions; the wireframes cite those IDs. The SRS is then written in three parts at once (overview, features, quality), each in its own request so each gets its own function time; a part that fails is asked for once more, and parts that finished are cached. The page puts them together, numbers the requirements, and traces each one to its stories and screens. Uncovered stories are flagged. The plan goes to Linear separately, as a roadmap.

### 5.5 The AI router

All website AI calls go through `lib/llm.ts`:

```
"quality" tier: gemini-3.5-flash → gemini-3.8-flash → Groq gpt-oss-120b
"light" tier:   gemini-3.5-flash-lite → 3.1-flash-lite → Groq gpt-oss-20b
```

Every Gemini model is tried with every configured key before moving on. A key that hits a quota or rate limit is skipped until it recovers; a model that is overloaded, retired or timing out is skipped on every key at once. Identical prompts are cached for a day. Each request is budgeted to finish inside Vercel's 60-second function limit, and keys never reach the browser.

---

## 6. MCP tools reference

| Tool | What the server does |
|------|----------------------|
| `start_evaluation` | Checks the idea and the four context answers, starts a stored evaluation, returns the marking method |
| `save_snapshot` | Computes the overall mark from the six criteria |
| `research_market` | Searches Hacker News, Stack Exchange, Google News, and GitHub |
| `save_summary` | Keeps only discussions and news from the research, checks solution links |
| `save_plan` | Adds up the weeks and costs, and checks the phases fit the time available |
| `save_overall` | Checks the four answers (Yes, Partly, or No) and their reasoning |
| `save_brief`, `save_wireframes` | Numbers the stories into the plan's versions; keeps only real story ids |
| `save_srs_overview`, `save_srs_features`, `save_srs_quality` | Assembles the SRS, numbers requirements, and checks every story is traced |
| `get_evaluation` | Which stages are saved, and the link |

Every stage is saved for 90 days and viewable, read-only, at `/e/<id>`. Requests are rate-limited per IP.

---

## 7. Getting started

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

Create `.env.local` (see [Configuration](#8-configuration)), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and write down your idea. The MCP server runs locally at `http://localhost:3000/api/mcp` once the Upstash variables are set.

---

## 8. Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` or `GEMINI_API_KEY_1` | Yes | Gemini API key |
| `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, … | No | More keys, each from a different Google project (quota is per project) |
| `GEMINI_API_KEYS` | No | Alternatively, a comma-separated list of keys |
| `GROQ_API_KEY` | No | Groq key, used when no Gemini model is available |
| `GITHUB_TOKEN` | No | Raises the GitHub search rate limit; search works without it |
| `STACKEXCHANGE_KEY` | No | Raises the Stack Exchange limit from 300 to 10,000 requests a day (free at stackapps.com) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | For MCP | Upstash Redis for saved evaluations and rate limits; added by Vercel's Upstash integration |
| `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET` | For Linear | The site's Linear OAuth app, for sending plans to Linear (see below) |

A system-wide environment variable with the same name takes priority over `.env.local`.

### Sending plans to Linear

The Hand-off page builds the plan in the person's own Linear workspace. To turn it on, create an OAuth application in Linear (**Settings → API → OAuth applications → New**) with these callback URLs, one per address the site runs on:

```
https://idea-evaluator-slash.vercel.app/api/linear/callback
http://localhost:3000/api/linear/callback
```

Then set its client ID and secret as `LINEAR_CLIENT_ID` and `LINEAR_CLIENT_SECRET` in Vercel and in `.env.local`. Without them the page says sending to Linear isn't set up. People sign in with Linear (OAuth with PKCE); their token is kept in an httpOnly cookie for its 24-hour lifetime and never stored on the server.

In development, `GET /api/llm-status` shows which model/key pairs are available or cooling down (never the keys themselves).

---

## 9. Project structure

```
app/
├── layout.tsx               # Root layout: fonts and theme
├── page.tsx                 # Landing page
├── login/page.tsx           # Sign-in screen (accounts are not built yet)
├── analysis/page.tsx        # The four-stage evaluation
└── api/
    ├── analyze/             # Snapshot and Summary
    ├── stage-data/          # Plan
    ├── overall/             # Idea as an overall
    ├── brief/               # Product vision and user story map
    ├── wireframes/          # Key screens, described as standard parts
    ├── srs/                 # Requirements document, one of three parts per request
    ├── discussions/         # Discussions and news
    ├── github-repos/        # Similar repositories
    ├── linear/              # Connect to Linear (OAuth), list teams, send the plan as a roadmap
    ├── google-search/       # Web search (needs Google Custom Search keys; not used by the UI yet)
    ├── mcp/                 # MCP server for people's own AI
    ├── evaluations/[id]/    # A saved evaluation, for the read-only view
    └── llm-status/          # Dev-only router status
e/[id]/                      # Short link to a saved evaluation
components/
├── script/                  # The marked-script design system: sheet, margin notes, marks, stage tabs
├── ui/                      # Radix-based primitives (button, input, label, textarea, dropdown menu)
├── ConnectAI.tsx            # "Or use it in your own AI": the connector address and per-app steps
└── *.tsx                    # Other landing page sections
lib/
├── llm.ts                   # Multi-key, multi-model AI router
├── llm-checked.ts           # Ask, check against a schema, retry once on another model
├── mcp/                     # MCP tools, their input contracts, and the method guidance they return
├── evaluation/              # Finishing each stage's data, shared by the website and the MCP tools
├── store.ts                 # Saved evaluations in Upstash Redis
├── rate-limit.ts            # Per-IP limits on the MCP endpoint
├── market.ts, github.ts     # Market research and similar-project search, shared by both
├── schemas/                 # Schemas: snapshot, plan, overall answers, product brief, SRS, and the questions asked with the idea
├── documents/               # Document template (fixed outline), the Idea-as-an-overall and SRS layouts, the wireframe drawing, and the PDF and Word exporters
├── evaluation-context.ts    # What earlier pages learned, as prompt text for the Plan and SRS
├── plan-math.ts             # Phase durations and costs added up
├── handoff.ts               # Hiring searches, downloads
├── linear/                  # Sending the plan to Linear: OAuth, the roadmap's structure, the GraphQL calls
├── hackernews.ts            # Hacker News search and comments
├── stackexchange.ts         # Stack Exchange questions and answers
├── news.ts                  # Google News search
└── validation.ts            # Idea input checks shared by client and server
showcase/                    # Published to GitHub Pages (see section 10)
├── index.html               # The showcase page: video and diagram cards
├── media/                   # Walkthrough video and its poster
├── screenshots/             # Frames from the video, used in this README
└── diagrams/                # Archify sources (.json), interactive pages (.html) and previews (.png)
.github/workflows/pages.yml  # Checks the showcase and deploys it to GitHub Pages
```

---

## 10. The showcase and GitHub Actions

The app deploys to Vercel. The **showcase** (the walkthrough video, the interactive diagrams and the README screenshots) lives in `showcase/` and is published to GitHub Pages by a GitHub Actions workflow, [`.github/workflows/pages.yml`](.github/workflows/pages.yml):

| Job | What it does |
|---|---|
| **Check the showcase files** | Every diagram's JSON source parses and has its `.html` page and `.png` preview; every `showcase/…` path this README points to exists |
| **Deploy to GitHub Pages** | Uploads `showcase/` as the Pages artifact and deploys it to [iabdullahslash.github.io/idea-evaluator](https://iabdullahslash.github.io/idea-evaluator/) |

It runs on every push to `main` that changes `showcase/` or the workflow, and can be run by hand from the **Actions** tab. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

**Updating a diagram.** Edit its JSON source, then validate and render it with Archify's CLI (`node bin/archify.mjs` from an Archify install), and refresh its `.png` preview from the rendered page:

```bash
node bin/archify.mjs validate workflow showcase/diagrams/four-stage-evaluation.workflow.json --quality showcase
node bin/archify.mjs deliver workflow showcase/diagrams/four-stage-evaluation.workflow.json showcase/diagrams/four-stage-evaluation.html --quality showcase
```

Commit the `.json`, `.html` and `.png` together; the check job fails if one is missing.

---

## 11. Key design decisions

- **Honest over encouraging.** The mark is the average of six explained criteria, so every score can be traced to its reasons.
- **Progressive stages.** Each stage unlocks only when you choose to continue.
- **Real sources, labelled.** Discussions and repositories come from live searches; existing solutions come from the model's knowledge with every link checked, and are labelled as such.
- **The server checks, the AI writes.** Through MCP, the server does the arithmetic, the link checks and the traceability, so the result doesn't depend on the model getting sums right.
- **Search results are data.** Quoted results are marked as data, not instructions, in every tool reply.
- **Spread the AI load.** A router walks models and keys so one exhausted quota doesn't stop an evaluation.
- **Server-side keys.** API keys never reach the browser.

---

## 12. Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS 3, Radix UI primitives, Geist and Kalam fonts |
| AI | Google Gemini via `@google/generative-ai`, Groq (OpenAI-compatible API) as fallback |
| Validation | zod |
| Discussions | Hacker News (Algolia search and the official API) and Stack Exchange (Software Recommendations, Web Applications, Academia); no keys needed |
| News | Google News RSS search (no key needed; Google offers it for non-commercial use) |
| Repos | GitHub search API |
| State | localStorage on the website (every stage survives a refresh); Upstash Redis for evaluations made through MCP |
| Documents | `pdfmake` (PDF) and `docx` (Word), built in the browser when downloaded |
| MCP | `mcp-handler` with the MCP SDK v2, rate limits with `@upstash/ratelimit` |
| Hosting | Vercel (app); GitHub Pages via GitHub Actions (showcase) |
| Diagrams | [Archify](showcase/diagrams/) (validated JSON → interactive HTML) |

---

## 13. License

MIT
