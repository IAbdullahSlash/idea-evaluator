"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateIdea } from "@/lib/validation"
import { buildReport } from "@/lib/documents/report"
import { buildSrsDocument } from "@/lib/documents/srs"
import { downloadText, fileSlug, hireLinks, jiraCsv, openHtml } from "@/lib/handoff"
import { numberRequirements, srsFeaturesSchema, srsOverviewSchema, srsQualitySchema, srsSchema, tidySrs, type Srs } from "@/lib/schemas/srs"
import { briefSchema, numberStories, type Brief } from "@/lib/schemas/brief"
import { wireframesSchema, type Wireframes } from "@/lib/schemas/wireframes"
import { planSchema } from "@/lib/schemas/plan"
import { splitPlan } from "@/lib/evaluation/plan"
import { CONTEXT_QUESTIONS, missingContext } from "@/lib/schemas/context"
import { availableWeeks, formatMoney, formatWeeks, sumCosts, totalWeeks } from "@/lib/plan-math"
import { cn } from "@/lib/utils"
import { CRITERIA } from "@/lib/schemas/snapshot"
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  MoreHorizontal,
  Download,
  Edit3,
  FileText,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Star,
} from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppBar } from "@/components/script/app-bar"
import { Chip, Fact, MarginNote, Sheet, SheetHeading, SheetRow } from "@/components/script/sheet"
import { CircledScore, Cross, Query, Tick } from "@/components/script/marks"
import { Markdown } from "@/components/script/markdown"
import { StageTabs, type StageTab } from "@/components/script/stage-tabs"

// 🚀 STAGE DEFINITIONS
enum AnalysisStage {
  INPUT = 0,
  QUICK_SNAPSHOT = 1,
  EXECUTIVE_SUMMARY = 2,
  PLAN = 3,
  HAND_OFF = 4
}



interface AnalysisData {
  feasibilityScore: number
  difficultyLevel: string
  estimatedTimeframe: string
  successProbability: number
  
  // NEW STRUCTURED ANALYSIS FIELDS
  honestAiFeedback: string
  keyStrengths: {
    valueProposition: string
    marketFit: string
  }
  potentialChallenges: {
    technicalRisks: string
    usabilityIssues: string
    marketRisks: string
  }
  requirementsScope: {
    mustHaveFeatures: string[]
    niceToHaveFeatures: string[]
    constraints: string[]
  }
  targetUsersMarketFit: {
    primaryUsers: string
    marketDemand: string
    userValidation: string
  }
  
  // EXISTING FIELDS
  detectedDomain: string
  requiredExperience: string
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
    tools: string[]
  }
  roadmap: {
    phase1: { title: string; duration: string; tasks: string[] }
    phase2: { title: string; duration: string; tasks: string[] }
    phase3: { title: string; duration: string; tasks: string[] }
  }
  recommendations: string[]
  similarProjects: string[]
  aiVerdict?: string
  honestRealityCheck?: string
  selfQuestions?: GuidingQuestion[]
  // Snapshot marking: six criteria out of 10, averaged into the overall mark
  rubric?: Partial<Record<string, { score: number; reason: string }>>
  recommendation?: string
  shortTitle?: string
  // Summary stage
  executiveSummary?: string
  pros?: string[]
  cons?: string[]
  scoreChange?: string
  riskSeverity?: Partial<Record<"technical" | "usability" | "market", string>>
  quickWins?: QuickWin[]
  existingSolutions?: ExistingSolution[]
  // `reddit` is the older name of the discussions query, kept for saved results
  searchQueries?: { github?: string; discussions?: string; reddit?: string }
  projectTitle?: string
  projectDescription?: string
  contextAdjustment?: {
    multiplier: string
    reason: string
  }
  validationApplied?: {
    adjustments: string
    confidence: string
  }
}

// 🚀 NEW INTERFACES FOR STAGED DATA
// A question with a one-line reason: used for follow-up questions and "questions to ask yourself".
interface GuidingQuestion {
  question: string
  why: string
}

interface Clarification {
  question: string
  answer: string
}

// A Hacker News discussion and what people said in it
// A discussion (Hacker News or a Stack Exchange site) and what people said in it
interface DiscussionThread {
  source: "Hacker News" | "Stack Exchange"
  // Where exactly: "Hacker News", or the Stack Exchange site's name
  where: string
  title: string
  url: string
  points: number
  replies: number
  year: number | null
  says: string | null
  topComment: string | null
}

interface NewsStory {
  title: string
  url: string
  source: string
  publishedAt: string
  note: string | null
}

interface DiscussionResult {
  status: "ok" | "error"
  takeaway?: string | null
  threads: DiscussionThread[]
  news?: NewsStory[]
}

interface ExistingSolution {
  name: string
  url: string
  description: string
  // How the evaluated idea differs from this one
  difference?: string
}

interface QuickWin {
  title: string
  description: string
  timeEstimate: string
}

interface TeamRole {
  role: string
  fteEstimate: number
  skills: string[]
  description: string
}

interface ProjectMilestone {
  phase: string
  deliverables: string[]
  duration: string
  dependencies: string[]
}

interface TechRoadmapItem {
  category: string
  technologies: string[]
  timeline: string
  trl: number // Tech Readiness Level 1-9
}

interface SecurityConsideration {
  area: string
  requirements: string[]
  compliance: string[]
}

interface CostEstimate {
  category: string
  items: { name: string; cost: string; justification: string }[]
  total: string
}

interface VersionMilestone {
  version: string
  features: string[]
  timeline: string
  description: string
}

interface GitHubRepo {
  name: string
  description: string
  stars: number
  forks: number
  language: string
  url: string
  owner: string
}

// The documents the Hand-off page writes on request, and where
type HandOffDoc = "brief" | "wireframes" | "srs"
const HAND_OFF_DOCS = {
  brief: { url: "/api/brief", name: "product vision and story map" },
  wireframes: { url: "/api/wireframes", name: "wireframes" },
  srs: { url: "/api/srs", name: "requirements document" },
} as const

// The server's AI routes stop at 60 s (Vercel's limit); a little more allows for the network
const REQUEST_TIMEOUT_MS = 70_000

class RequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message)
  }
}

/** POST JSON and return the reply; server failures and timeouts are marked retryable. */
async function postJson(url: string, body: unknown, failed: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw error instanceof DOMException && error.name === "TimeoutError"
      ? new RequestError("This took too long. Please try again.", true)
      : new RequestError("Couldn't reach the server. Check your connection and try again.", false)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new RequestError((data as any)?.error || failed, response.status >= 500)
  return data
}

// The SRS is written in three parts, each its own request with its own function time
const SRS_PARTS = [
  { part: "overview", schema: srsOverviewSchema },
  { part: "features", schema: srsFeaturesSchema },
  { part: "quality", schema: srsQualitySchema },
] as const

// Loose match between a scope feature and the plan's copy of it in scopeCuts
const sameFeature = (a: string, b: string) => {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  const x = norm(a)
  const y = norm(b)
  return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x))
}

/**
 * Saved stage data, made safe to show: a plan or document saved by an older
 * version (or missing fields) is dropped so it can be made again. Used for data
 * from the browser's storage and for evaluations loaded from the server.
 */
function normalizeStages(input: unknown): Record<string, any> {
  const stages: Record<string, any> = input && typeof input === "object" ? { ...(input as Record<string, any>) } : {}
  if (stages.stage3 || stages.stage4) {
    const plan = planSchema.safeParse({ ...stages.stage3, ...stages.stage4 })
    if (plan.success) Object.assign(stages, splitPlan(plan.data))
    else {
      delete stages.stage3
      delete stages.stage4
      delete stages.stage5
    }
  }
  // Older versions saved other hand-off data; keep only documents that still match their schema
  if (stages.stage5) {
    const brief = briefSchema.safeParse(stages.stage5.brief)
    const wireframes = wireframesSchema.safeParse(stages.stage5.wireframes)
    const srs = srsSchema.safeParse(stages.stage5.srs)
    stages.stage5 = {
      ...(brief.success ? { brief: brief.data } : {}),
      ...(wireframes.success ? { wireframes: wireframes.data } : {}),
      ...(srs.success ? { srs: srs.data } : {}),
    }
  }
  return stages
}

// Everything an evaluation keeps in localStorage across refreshes
const SAVED_KEYS = ["projectAnalysis", "stageData", "evaluationInput", "currentStage", "taskProgress"]


export default function AnalysisPage() {
  // 🚀 STAGED ANALYSIS STATE
  const [currentStage, setCurrentStage] = useState<AnalysisStage>(AnalysisStage.INPUT)
  const [stageData, setStageData] = useState<{
    stage1?: AnalysisData
    stage2?: {
      quickWins: QuickWin[]
      existingSolutions: ExistingSolution[]
      githubRepos: GitHubRepo[]
      discussions?: DiscussionResult
      analysis?: AnalysisData
    }
    stage3?: {
      // Whether the must-have scope fits the time the builder has (older plans lack it)
      timelineFit?: { verdict: "fits" | "tight" | "too much"; note: string }
      // Scope features this plan leaves out to fit the time
      scopeCuts?: string[]
      projectMilestones: ProjectMilestone[]
      teamRoles: TeamRole[]
      sdlcMapping: string
      qaApproach: string
    }
    stage4?: {
      techRoadmap: TechRoadmapItem[]
      versionMilestones: VersionMilestone[]
      securityConsiderations: SecurityConsideration[]
      costEstimates: CostEstimate[]
    }
    // Hand-off: everything else on the page is built from the earlier stages
    stage5?: {
      // The Report's product vision and story map, and the key screens drawn from its stories
      brief?: Brief
      wireframes?: Wireframes
      srs?: Srs
    }
  }>({})

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [githubLoading, setGithubLoading] = useState(false)

  // Simplified form data - only idea description needed
  const [formData, setFormData] = useState({
    idea: '',
    domain: '',
    projectType: '',
    experience: '',
    timeline: '',
  })
  const [analyzing, setAnalyzing] = useState(false)
  // Why the last attempt to mark the idea failed, shown on the page with a retry
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  // The Hand-off document being written, and why the last attempt at each failed
  const [writing, setWriting] = useState<HandOffDoc | null>(null)
  const [writeErrors, setWriteErrors] = useState<Partial<Record<HandOffDoc, string>>>({})
  // A document saved as a file because the browser blocked its new tab
  const [savedInstead, setSavedInstead] = useState<"report" | "srs" | null>(null)
  // Remaking the plan from the Plan page, and why it failed
  const [remakingPlan, setRemakingPlan] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  // Set once the idea is submitted, so unanswered questions are only flagged after a try
  const [showMissing, setShowMissing] = useState(false)
  // Why the next page failed to load, shown under its Continue button
  const [stageError, setStageError] = useState<string | null>(null)
  // Saved stage data is only written back once it has been read on load
  const [hydrated, setHydrated] = useState(false)
  // Set when showing a saved evaluation read-only (/analysis?e=<id>) instead of the visitor's own
  const [viewing, setViewing] = useState<
    { id: string; status: "loading" } | { id: string; status: "error"; message: string } | { id: string; status: "ready"; source?: string } | null
  >(null)
  // Follow-up questions, asked when the idea is too vague to mark
  const [clarifyQuestions, setClarifyQuestions] = useState<GuidingQuestion[] | null>(null)
  const [clarifyAnswers, setClarifyAnswers] = useState<string[]>([])
  // The answers the idea was marked with; later stages receive them too
  const [clarifications, setClarifications] = useState<Clarification[] | null>(null)

  // 🚀 LOCAL STORAGE HYDRATION — restore progress after page refresh
  useEffect(() => {
    // A saved evaluation (/e/<id>, e.g. made in someone's AI through the MCP tools) is shown
    // read-only from the server; the visitor's own evaluation in this browser is left alone.
    const viewId = new URLSearchParams(window.location.search).get("e")
    if (viewId) {
      setViewing({ id: viewId, status: "loading" })
      setHydrated(true)
      fetch(`/api/evaluations/${encodeURIComponent(viewId)}`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => null)
          if (!response.ok || !data?.analysis) {
            setViewing({ id: viewId, status: "error", message: data?.error || "This evaluation couldn't be loaded." })
            return
          }
          const snapshot = validateAnalysisData(data.analysis)
          const stages = normalizeStages(data.stageData)
          setAnalysis(snapshot)
          setStageData({ stage1: snapshot, ...stages })
          setFormData(prev => ({ ...prev, ...data.formData }))
          setClarifications(Array.isArray(data.clarifications) ? data.clarifications : null)
          // Open on the furthest stage that has been saved
          setCurrentStage(
            stages.stage5 ? AnalysisStage.HAND_OFF
              : stages.stage3 && stages.stage4 ? AnalysisStage.PLAN
                : stages.stage2 ? AnalysisStage.EXECUTIVE_SUMMARY
                  : AnalysisStage.QUICK_SNAPSHOT
          )
          setViewing({ id: viewId, status: "ready", source: data.source })
        })
        .catch(() => setViewing({ id: viewId, status: "error", message: "Couldn't reach the server. Check your connection and try again." }))
      return
    }
    try {
      // "Evaluate an idea" links add ?new: start on a blank page instead of the last evaluation.
      // The flag is removed at once so a refresh keeps the new evaluation's progress.
      if (new URLSearchParams(window.location.search).has("new")) {
        for (const key of SAVED_KEYS) localStorage.removeItem(key)
        window.history.replaceState(null, "", window.location.pathname)
      }
      const savedStage = localStorage.getItem("currentStage")
      if (savedStage !== null) {
        const stageNum = parseInt(savedStage, 10) as AnalysisStage
        if (stageNum >= AnalysisStage.QUICK_SNAPSHOT) {
          setCurrentStage(stageNum <= AnalysisStage.HAND_OFF ? stageNum : AnalysisStage.QUICK_SNAPSHOT)
        }
      }
      const savedAnalysis = localStorage.getItem("projectAnalysis")
      if (savedAnalysis) {
        const parsed = JSON.parse(savedAnalysis) as AnalysisData
        setAnalysis(parsed)
      }
      const savedStages = localStorage.getItem("stageData")
      if (savedStages) {
        const stages = JSON.parse(savedStages)
        if (stages && typeof stages === "object") setStageData(prev => ({ ...prev, ...normalizeStages(stages) }))
      }
      const savedInput = localStorage.getItem("evaluationInput")
      if (savedInput) {
        const input = JSON.parse(savedInput)
        if (input?.formData?.idea) setFormData(prev => ({ ...prev, ...input.formData }))
        if (Array.isArray(input?.clarifications)) setClarifications(input.clarifications)
      }
      // An idea started on the landing page opens on the blank script, pre-filled.
      const draftIdea = sessionStorage.getItem("draftIdea")
      if (draftIdea) {
        setFormData(prev => ({ ...prev, idea: draftIdea }))
        setCurrentStage(AnalysisStage.INPUT)
        sessionStorage.removeItem("draftIdea")
      }
    } catch (e) {
      console.warn("Failed to restore from localStorage:", e)
    }
    setHydrated(true)
  }, [])

  // Keep the later stages across a refresh (the snapshot is saved separately); never while viewing a saved evaluation
  useEffect(() => {
    if (!hydrated || viewing) return
    try {
      const { stage1: _snapshot, ...laterStages } = stageData
      localStorage.setItem("stageData", JSON.stringify(laterStages))
    } catch (e) {
      console.warn("Failed to save stage data:", e)
    }
  }, [stageData, hydrated, viewing])

  // Navigation helper - go back one stage without clearing the prompt/idea
  const goToPreviousStage = () => {
    setCurrentStage(prev => {
      if (prev === AnalysisStage.INPUT) return prev
      return (prev - 1) as AnalysisStage
    })
  }

  // 🔧 ALTERNATIVE QUICK FIX - Data Validation Helper
  const validateAnalysisData = (analysisData: any): AnalysisData => {
    // Add this safety check at the top of your component
    if (analysisData && (
      !analysisData.honestAiFeedback ||
      !analysisData.keyStrengths ||
      !analysisData.potentialChallenges ||
      !analysisData.requirementsScope ||
      !analysisData.targetUsersMarketFit ||
      !analysisData.techStack ||
      !analysisData.roadmap ||
      !analysisData.recommendations ||
      !analysisData.similarProjects
    )) {
      console.warn("Analysis data incomplete, some fields may be missing - applying fallbacks")
    }

    return {
      ...analysisData,
      honestAiFeedback: analysisData.honestAiFeedback || "Analysis feedback not available",
      keyStrengths: {
        valueProposition: analysisData.keyStrengths?.valueProposition || "Value proposition assessment needed",
        marketFit: analysisData.keyStrengths?.marketFit || "Market fit analysis needed"
      },
      potentialChallenges: {
        technicalRisks: analysisData.potentialChallenges?.technicalRisks || "Technical risk assessment needed",
        usabilityIssues: analysisData.potentialChallenges?.usabilityIssues || "Usability review needed",
        marketRisks: analysisData.potentialChallenges?.marketRisks || "Market risk analysis needed"
      },
      requirementsScope: {
        mustHaveFeatures: analysisData.requirementsScope?.mustHaveFeatures || [],
        niceToHaveFeatures: analysisData.requirementsScope?.niceToHaveFeatures || [],
        constraints: analysisData.requirementsScope?.constraints || []
      },
      targetUsersMarketFit: {
        primaryUsers: analysisData.targetUsersMarketFit?.primaryUsers || "User analysis needed",
        marketDemand: analysisData.targetUsersMarketFit?.marketDemand || "Market demand assessment needed",
        userValidation: analysisData.targetUsersMarketFit?.userValidation || "User validation strategy needed"
      },
      recommendations: analysisData.recommendations || [],
      similarProjects: analysisData.similarProjects || [],
      techStack: {
        frontend: analysisData.techStack?.frontend || [],
        backend: analysisData.techStack?.backend || [],
        database: analysisData.techStack?.database || [],
        tools: analysisData.techStack?.tools || []
      },
      roadmap: {
        phase1: {
          title: analysisData.roadmap?.phase1?.title || "Phase 1",
          duration: analysisData.roadmap?.phase1?.duration || "TBD",
          tasks: analysisData.roadmap?.phase1?.tasks || []
        },
        phase2: {
          title: analysisData.roadmap?.phase2?.title || "Phase 2", 
          duration: analysisData.roadmap?.phase2?.duration || "TBD",
          tasks: analysisData.roadmap?.phase2?.tasks || []
        },
        phase3: {
          title: analysisData.roadmap?.phase3?.title || "Phase 3",
          duration: analysisData.roadmap?.phase3?.duration || "TBD", 
          tasks: analysisData.roadmap?.phase3?.tasks || []
        }
      }
    }
  }

  // Small helper to clean AI-generated markdown text so ReactMarkdown renders correctly
  const sanitizeMarkdown = (raw: string | undefined) => {
    if (!raw) return ""
    let s = raw
    // Remove wrapping code fences ``` or ```json
    s = s.replace(/^\s*```(?:[a-zA-Z0-9_-]+)?\s*/g, "")
    s = s.replace(/\s*```\s*$/g, "")
    // Unescape escaped asterisks/backticks/slashes that sometimes appear
    s = s.replace(/\\\*/g, "*")
    s = s.replace(/\\`/g, "`")
    s = s.replace(/\\n/g, "\n")
    // Trim excessive whitespace
    s = s.trim()
    return s
  }

  const fetchGitHubRepos = async (searchQuery: string) => {
    setGithubLoading(true)
    try {
      const response = await fetch("/api/github-repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      })

      if (response.ok) {
        const data = await response.json()
        const repos = data.repositories || []
        setGithubRepos(repos)
        return repos
      }
    } catch (error) {
      console.error("Failed to fetch GitHub repositories:", error)
    } finally {
      setGithubLoading(false)
    }
    return []
  }

  // 🛡️ Client-side guardrail check is handled by validateIdea (imported from lib/validation)

  // 🚀 STAGE 1: QUICK SNAPSHOT
  const handleAnalyzeIdea = async (e?: React.FormEvent, answered?: Clarification[]) => {
    if (e) e.preventDefault()

    if (!formData.idea.trim()) return

    // The four questions are required; flag the unanswered ones and start at the first
    const missing = missingContext(formData)
    if (missing.length > 0) {
      setShowMissing(true)
      setAnalyzeError(
        missing.length === 1
          ? `Answer "${missing[0].label}" so the idea can be marked for you.`
          : `Answer the ${missing.length} questions beside the idea so it can be marked for you.`
      )
      document.getElementById(missing[0].id)?.focus()
      return
    }

    // 🛡️ Client-side guardrail check (validateIdea is shared with the server)
    const clientError = validateIdea(formData.idea)
    if (clientError) {
      setAnalyzeError(clientError)
      return
    }

    setAnalyzeError(null)
    setAnalyzing(true)
    try {
      const response = await fetch("/api/analyze", {
        // The server may retry once, so allow a little over two Gemini timeouts
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: formData.idea,
          stage: 'stage1',
          domain: formData.domain,
          projectType: formData.projectType,
          experience: formData.experience,
          timeline: formData.timeline,
          clarifications: answered,
        }),
      })

      if (response.ok) {
        const rawAnalysisData = await response.json()

        // Too vague to mark: show the follow-up questions and stay on the input page
        if (rawAnalysisData.needsClarification && !answered) {
          const questions: GuidingQuestion[] = rawAnalysisData.questions || []
          setClarifyQuestions(questions)
          setClarifyAnswers(questions.map(() => ""))
          return
        }
        setClarifications(answered ?? null)
        setClarifyQuestions(null)
        
        // 🔧 Apply validation and fallbacks
        const validatedAnalysisData = validateAnalysisData(rawAnalysisData)
        
        const enhancedAnalysis = {
          ...validatedAnalysisData,
          projectTitle: rawAnalysisData.shortTitle || formData.idea.slice(0, 60),
          projectDescription: formData.idea,
        }

        setAnalysis(enhancedAnalysis)
        setStageData({ stage1: enhancedAnalysis })
        localStorage.setItem("projectAnalysis", JSON.stringify(enhancedAnalysis))
        // #1: keep what was submitted, so later stages still have the idea after a refresh
        localStorage.setItem("evaluationInput", JSON.stringify({ formData, clarifications: answered ?? null }))
        localStorage.setItem("currentStage", AnalysisStage.QUICK_SNAPSHOT.toString())
        
        // Move to Stage 1
        setCurrentStage(AnalysisStage.QUICK_SNAPSHOT)
      } else {
        const errorData = await response.json().catch(() => null)
        setAnalyzeError(
          errorData?.error ||
            (response.status === 422
              ? "That doesn't look like a project idea yet. Describe what it does and who it is for."
              : "The idea couldn't be marked this time. Please try again.")
        )
      }
    } catch (error) {
      console.error("[Analysis] Error:", error)
      setAnalyzeError(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "Marking took too long. Please try again."
          : "Couldn't reach the server. Check your connection and try again."
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // 🚀 STAGE PROGRESSION FUNCTIONS
  const proceedToStage = async (targetStage: AnalysisStage) => {
    if (!analysis) return

    setLoading(true)
    setStageError(null)
    try {
      switch (targetStage) {
        case AnalysisStage.EXECUTIVE_SUMMARY:
          await loadStage2Data()
          break
        case AnalysisStage.PLAN:
          await loadPlanData()
          break
        case AnalysisStage.HAND_OFF:
          await loadHandOffData()
          break
      }
      setCurrentStage(targetStage)
      if (!viewing) localStorage.setItem("currentStage", targetStage.toString())
    } catch (error) {
      console.error(`Failed to load stage ${targetStage}:`, error)
      setStageError(error instanceof Error && error.message ? error.message : "Couldn't load the next page. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // 🔥 STAGE 2: Load the Summary. The detailed marking, GitHub and Hacker News run in parallel;
  // GitHub and Hacker News use search terms the Snapshot already produced.
  const loadStage2Data = async () => {
    const fallbackQuery = analysis?.projectTitle || formData.idea.slice(0, 80)

    const summaryPromise: Promise<AnalysisData | null> = fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        idea: formData.idea,
        stage: 'stage2',
        domain: formData.domain,
        projectType: formData.projectType,
        experience: formData.experience,
        timeline: formData.timeline,
        clarifications: clarifications ?? [],
        snapshotScore: analysis?.feasibilityScore,
        snapshotRecommendation: analysis?.recommendation,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)

    const discussionsQuery = analysis?.searchQueries?.discussions || analysis?.searchQueries?.reddit || fallbackQuery
    const discussionsPromise: Promise<DiscussionResult> = fetch("/api/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: discussionsQuery, altQuery: analysis?.shortTitle || analysis?.projectTitle, idea: formData.idea }),
    })
      .then((r) => (r.ok ? r.json() : { status: "error", threads: [] }))
      .catch(() => ({ status: "error", threads: [] }))

    const [summary, discussions, repos] = await Promise.all([
      summaryPromise,
      discussionsPromise,
      fetchGitHubRepos(analysis?.searchQueries?.github || fallbackQuery),
    ])
    if (!summary) throw new Error("The summary couldn't be written this time. Please try again.")

    setStageData(prev => ({
      ...prev,
      stage2: {
        quickWins: summary.quickWins ?? [],
        existingSolutions: summary.existingSolutions ?? [],
        githubRepos: repos,
        discussions,
        analysis: summary,
      },
    }))
  }

  // 🔥 STAGE 3: Load the plan. It gets everything the earlier pages learned, so it
  // fits the time and experience given and agrees with the Summary's scope and stack.
  const loadPlanData = async ({ fresh = false } = {}) => {
    let response: Response
    try {
      response = await fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          stage: 3,
          fresh,
          ...evaluationBody(),
        }),
      })
    } catch (error) {
      throw new Error(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "Writing the plan took too long. Please try again."
          : "Couldn't reach the server. Check your connection and try again."
      )
    }
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || "The plan couldn't be written this time. Please try again.")
    const plan = planSchema.safeParse(data)
    if (!plan.success) throw new Error("The plan came back incomplete. Please try again.")
    setStageData(prev => ({ ...prev, ...splitPlan(plan.data) }))
  }

  // "Make a new plan": asks again without the cached reply; the current plan stays until the new one arrives
  const remakePlan = async () => {
    setRemakingPlan(true)
    setPlanError(null)
    try {
      await loadPlanData({ fresh: true })
    } catch (error) {
      setPlanError(error instanceof Error && error.message ? error.message : "The plan couldn't be written this time. Please try again.")
    } finally {
      setRemakingPlan(false)
    }
  }

  // 🔥 STAGE 4: Load Hand-off Data
  const loadHandOffData = async () => {
    setStageData(prev => ({ ...prev, stage5: prev.stage5 ?? {} }))
  }

  // What the earlier pages learned, as sent to the Plan and the requirements document
  const evaluationBody = () => {
    const s2 = stageData.stage2?.analysis
    return {
      idea: formData.idea,
      projectType: formData.projectType,
      domain: formData.domain,
      experience: formData.experience,
      timeline: formData.timeline,
      clarifications: clarifications ?? [],
      snapshot: analysis && {
        projectTitle: analysis.projectTitle,
        detectedDomain: analysis.detectedDomain,
        estimatedTimeframe: analysis.estimatedTimeframe,
        feasibilityScore: analysis.feasibilityScore,
        recommendation: analysis.recommendation,
        primaryUsers: analysis.targetUsersMarketFit?.primaryUsers,
      },
      summary: s2 && {
        feasibilityScore: s2.feasibilityScore,
        estimatedTimeframe: s2.estimatedTimeframe,
        requirementsScope: s2.requirementsScope,
        techStack: s2.techStack,
        potentialChallenges: s2.potentialChallenges,
      },
    }
  }

  // Write (or rewrite) a Hand-off document from the evaluation and the plan, and keep it with them
  const writeDocument = async (doc: HandOffDoc) => {
    const { url, name } = HAND_OFF_DOCS[doc]
    const failed = `The ${name} couldn't be written this time. Please try again.`
    setWriting(doc)
    setWriteErrors(prev => ({ ...prev, [doc]: undefined }))
    const stories = stageData.stage5?.brief ? numberStories(stageData.stage5.brief) : []
    const screens = stageData.stage5?.wireframes?.screens.map((sc) => ({ name: sc.name, purpose: sc.purpose, stories: sc.stories })) ?? []
    const body = {
      ...evaluationBody(),
      // Writing it again asks for a new version instead of the cached one
      fresh: Boolean(stageData.stage5?.[doc]),
      existingSolutions: stageData.stage2?.existingSolutions,
      // The story map's stories and the screens, so later documents can cite them (US-1, "Dashboard", …)
      stories,
      screens,
      plan: stageData.stage3 && stageData.stage4 && {
        scopeCuts: stageData.stage3.scopeCuts,
        versionMilestones: stageData.stage4.versionMilestones,
        techRoadmap: stageData.stage4.techRoadmap,
        securityConsiderations: stageData.stage4.securityConsiderations,
      },
    }
    try {
      let value: Brief | Wireframes | Srs
      if (doc === "srs") {
        // All three parts at once; a part that fails on the server or times out is asked for once more.
        // Parts that did finish are cached on the server, so the retry only redoes the missing one.
        const parts = await Promise.all(
          SRS_PARTS.map(async ({ part, schema }) => {
            const ask = () => postJson(url, { ...body, part }, failed)
            const data = await ask().catch((error) => (error instanceof RequestError && error.retryable ? ask() : Promise.reject(error)))
            const parsed = schema.safeParse(data)
            if (!parsed.success) throw new RequestError(`The ${name} came back incomplete. Please try again.`, false)
            return parsed.data
          })
        )
        const [overview, features, quality] = parts as [
          ReturnType<typeof srsOverviewSchema.parse>,
          ReturnType<typeof srsFeaturesSchema.parse>,
          ReturnType<typeof srsQualitySchema.parse>,
        ]
        value = tidySrs({ overview, features: features.features, quality }, stories.map((st) => st.id), screens.map((sc) => sc.name))
      } else {
        const schema = doc === "brief" ? briefSchema : wireframesSchema
        const parsed = schema.safeParse(await postJson(url, body, failed))
        if (!parsed.success) throw new RequestError(`The ${name} came back incomplete. Please try again.`, false)
        value = parsed.data
      }
      setStageData(prev => ({
        ...prev,
        // A new story map renumbers its stories, so wireframes citing the old numbers are dropped
        stage5: { ...prev.stage5, [doc]: value, ...(doc === "brief" ? { wireframes: undefined } : {}) },
      }))
    } catch (error) {
      setWriteErrors(prev => ({ ...prev, [doc]: error instanceof Error && error.message ? error.message : failed }))
    } finally {
      setWriting(null)
    }
  }

  // 🎨 STAGE RENDERING COMPONENTS
  const renderStageContent = () => {
    switch (currentStage) {
      case AnalysisStage.INPUT:
        return clarifyQuestions ? renderClarify() : renderInputStage()
      case AnalysisStage.QUICK_SNAPSHOT:
        return renderQuickSnapshot()
      case AnalysisStage.EXECUTIVE_SUMMARY:
        return renderExecutiveSummary()
      case AnalysisStage.PLAN:
        return renderPlan()
      case AnalysisStage.HAND_OFF:
        return renderDeepResources()
      default:
        return renderInputStage()
    }
  }

  // 🎨 SHARED PIECES FOR THE MARKED SCRIPT

  const selectClass =
    "h-10 w-full appearance-none rounded-md border border-input bg-sheet pl-3 pr-9 text-sm text-ink transition-colors hover:border-pencil focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marker/40 focus-visible:border-marker"

  const SelectChevron = () => (
    <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-pencil" />
  )

  const scoreMark = (score: number) =>
    score >= 8 ? <Tick title="Strong" /> : score >= 6 ? <Query title="Workable, with conditions" /> : <Cross title="Weak" />

  // Placeholder copy the API fills in when a field is missing: never counted as a judgment.
  const isPlaceholder = (t?: string) => !t || /assessment needed|review needed|analysis needed|strategy needed|not available/i.test(t)
  const isSerious = (t?: string) =>
    /critical|severe|serious|major|significant|fatal|legal|regulat|privacy|compliance|high risk|biggest/i.test(t || "")
  const isWeakDemand = (t?: string) =>
    /\b(?:low|limited|niche|saturat\w*|crowded|competit\w*|declin\w*|uncertain|retention|threat\w*|but)\b/i.test(t || "")
  const DoubleCross = ({ title }: { title?: string }) => (
    <span className="flex -space-x-2.5" role="img" aria-label={title}>
      <Cross /> <Cross />
    </span>
  )
  const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

  /** The highlighter: marks the opening sentence of AI prose as the part the margin judges. */
  const HighlightLead = ({ text, className }: { text: string; className?: string }) => {
    const clean = sanitizeMarkdown(text)
    const [first = "", ...rest] = clean.split(/\n\s*\n/)
    const isPlain = first && !/[*_`#[\]>|]|^\s*(?:[-+]|\d+\.)\s/m.test(first)
    if (!isPlain) return <Markdown className={className}>{clean}</Markdown>
    const m = first.match(/^([\s\S]+?[.!?])(\s[\s\S]*)?$/)
    const lead = m ? m[1] : first
    const tail = m?.[2] ?? ""
    return (
      <div className={className}>
        <p className="mb-3 text-[0.9375rem] leading-[1.7] text-ink last:mb-0">
          <mark className="hl bg-transparent text-ink">{lead}</mark>
          {tail}
        </p>
        {rest.length ? <Markdown>{rest.join("\n\n")}</Markdown> : null}
      </div>
    )
  }

  /** Highlights the opening clause of a short judgment (up to the first comma, colon or full stop). */
  const ClauseLead = ({ text }: { text: string }) => {
    const m = text.match(/^(.{12,140}?[,;:.\u2014])(\s[\s\S]*)?$/)
    if (!m || isPlaceholder(text)) return <>{text}</>
    return (
      <>
        <mark className="hl bg-transparent text-ink">{m[1]}</mark>
        {m[2] ?? ""}
      </>
    )
  }

  const ContinueButton = ({ to, label, hint }: { to: AnalysisStage; label: string; hint?: string }) =>
    viewing ? (
      stageHasData(to) ? (
        <Button size="lg" onClick={() => selectStage(to)} className="h-11 w-full justify-between px-4 text-[0.9375rem]">
          {label} <ArrowRight />
        </Button>
      ) : (
        <MarginNote mark={<Query />} title="Not saved yet">
          This evaluation is being made in an AI chat. Ask your AI to continue to the {stageLabels[to] ?? "next page"}, then refresh.
        </MarginNote>
      )
    ) : (
    <div className="space-y-3">
      <Button
        size="lg"
        onClick={() => proceedToStage(to)}
        disabled={loading}
        className="h-11 w-full justify-between px-4 text-[0.9375rem]"
      >
        {loading ? "Marking the next page…" : label}
        {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
      </Button>
      {hint ? <p className="text-meta text-pencil">{hint}</p> : null}
      {stageError && !loading ? (
        <p role="alert" className="text-meta font-medium text-marker">{stageError}</p>
      ) : null}
    </div>
  )

  const EmptyLine = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm italic text-pencil">{children}</p>
  )

  const LinkTitle = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-start gap-1 font-medium text-ink underline decoration-rule decoration-1 underline-offset-[3px] transition-colors hover:decoration-marker"
    >
      <span>{children}</span>
      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-pencil transition-colors group-hover:text-marker" />
    </a>
  )

  // A failed attempt to mark the idea: what went wrong and a way to retry
  const AnalyzeErrorNote = () =>
    analyzeError ? (
      <div role="alert" className="mb-5 border-b border-rule pb-5">
        <MarginNote mark={<Cross />} title="Couldn't mark it">
          {analyzeError}
        </MarginNote>
      </div>
    ) : null

  // 🎨 STAGE 0: THE BLANK SCRIPT
  const renderInputStage = () => (
    // noValidate: the missing answers are flagged beside each question instead of in browser popups
    <form onSubmit={handleAnalyzeIdea} noValidate>
      <Sheet>
        <SheetRow
          divider={false}
          marginLabel="Context for the examiner"
          bodyClassName="sm:py-9"
          margin={
            <div className="space-y-5">
              <AnalyzeErrorNote />
              <div>
                <p className="text-sm font-semibold text-marker">Context for the examiner</p>
                <p className="mt-1 text-meta text-pencil">All four are required. They set how strictly the idea is marked and how the plan is sized.</p>
              </div>
              {CONTEXT_QUESTIONS.map((q) => {
                const invalid = showMissing && !q.options.some((o) => o.value === formData[q.id])
                return (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={q.id} className="text-meta font-medium text-ink-soft">
                      {q.label} <span className="text-marker" aria-hidden>*</span>
                    </Label>
                    <div className="relative">
                      <select
                        id={q.id}
                        required
                        aria-invalid={invalid || undefined}
                        aria-describedby={invalid ? `${q.id}-missing` : undefined}
                        className={cn(selectClass, !formData[q.id] && "text-pencil", invalid && "border-marker")}
                        value={formData[q.id]}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, [q.id]: e.target.value }))
                          if (showMissing) setAnalyzeError(null)
                        }}
                      >
                        <option value="" disabled>Choose one</option>
                        {q.options.map((o) => (
                          <option key={o.value} value={o.value} className="text-ink">{o.label}</option>
                        ))}
                      </select>
                      <SelectChevron />
                    </div>
                    {invalid ? <p id={`${q.id}-missing`} className="text-meta text-marker">Required</p> : null}
                  </div>
                )
              })}
            </div>
          }
        >
          <div className="flex h-full flex-col">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[2rem]">
              Write down your idea
            </h1>
            <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-soft">
              Say what it does, who it is for, and anything technical you already know. It gets marked as honestly as an
              examiner would, then planned if it is worth building.
            </p>
            <Label htmlFor="project-idea" className="sr-only">Your project idea</Label>
            <Textarea
              id="project-idea"
              placeholder="e.g. A campus app that matches students into study groups by course and free periods, with a shared timetable and chat."
              className="ruled mt-6 min-h-[16rem] flex-1 resize-none rounded-none border-0 border-b border-rule bg-transparent px-0 py-1.5 text-[1.0625rem] leading-8 md:text-[1.0625rem] dark:bg-transparent text-ink shadow-none placeholder:text-pencil/80 focus-visible:border-marker focus-visible:ring-0"
              value={formData.idea}
              onChange={(e) => setFormData(prev => ({ ...prev, idea: e.target.value }))}
            />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-meta text-pencil tabular">
                {formData.idea.trim().length} characters{formData.idea.trim().length < 15 ? " · at least 15 needed" : ""}
              </p>
              <Button
                type="submit"
                size="lg"
                className="h-11 px-5 text-[0.9375rem]"
                disabled={!formData.idea.trim() || analyzing}
              >
                {analyzing ? <Loader2 className="animate-spin" /> : null}
                {analyzing ? "Marking your idea…" : "Mark my idea"}
                {!analyzing ? <ArrowRight /> : null}
              </Button>
            </div>
          </div>
        </SheetRow>
      </Sheet>
    </form>
  )

  // 🎨 FOLLOW-UP QUESTIONS: the idea was too vague to mark
  const renderClarify = () => {
    if (!clarifyQuestions) return null
    const withAnswers = (answers: string[]): Clarification[] =>
      clarifyQuestions.map((q, i) => ({ question: q.question, answer: answers[i] ?? "" }))

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAnalyzeIdea(undefined, withAnswers(clarifyAnswers))
        }}
      >
        <Sheet>
          <SheetRow
            marginFirstOnMobile
            marginLabel="Examiner's note"
            margin={
              <div>
                <AnalyzeErrorNote />
                <MarginNote mark={<Query />} title="Not enough to mark yet">
                  Answer what you can. Anything you leave blank is marked as unknown.
                </MarginNote>
              </div>
            }
          >
            <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
              A few questions before it&apos;s marked
            </h1>
            <p className="label-caps mt-6">Your idea</p>
            <p className="mt-2 max-w-[65ch] text-[1.0625rem] leading-8 text-ink-soft">{formData.idea}</p>
          </SheetRow>

          {clarifyQuestions.map((q, i) => (
            <SheetRow
              key={i}
              marginDesktopOnly
              margin={q.why ? <MarginNote>{q.why}</MarginNote> : null}
            >
              <Label htmlFor={`clarify-${i}`} className="flex gap-3 text-[1.0625rem] font-semibold leading-snug text-ink">
                <span className="font-hand text-[1.35rem] font-bold leading-none text-marker tabular">{i + 1}</span>
                <span>{q.question}</span>
              </Label>
              {q.why ? <p className="mt-1.5 pl-7 text-meta text-pencil lg:hidden">{q.why}</p> : null}
              <Textarea
                id={`clarify-${i}`}
                rows={2}
                placeholder="Your answer"
                value={clarifyAnswers[i] ?? ""}
                onChange={(e) => {
                  const value = e.target.value
                  setClarifyAnswers((prev) => prev.map((a, j) => (j === i ? value : a)))
                }}
                className="ruled mt-3 min-h-[4rem] resize-none rounded-none border-0 border-b border-rule bg-transparent px-0 py-1.5 text-[1.0625rem] leading-8 text-ink shadow-none placeholder:text-pencil/80 focus-visible:border-marker focus-visible:ring-0 md:text-[1.0625rem] dark:bg-transparent"
              />
            </SheetRow>
          ))}

          <SheetRow
            divider={false}
            marginLabel="Next"
            margin={
              <div className="space-y-2">
                <Button type="submit" size="lg" disabled={analyzing} className="h-11 w-full justify-between px-4 text-[0.9375rem]">
                  {analyzing ? "Marking your idea…" : "Mark with these answers"}
                  {analyzing ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={analyzing}
                  className="w-full"
                  onClick={() => handleAnalyzeIdea(undefined, withAnswers([]))}
                >
                  Mark it anyway
                </Button>
              </div>
            }
          >
            <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
              Rather rewrite the idea itself?
            </p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => setClarifyQuestions(null)} disabled={analyzing}>
              <Edit3 /> Edit the idea
            </Button>
          </SheetRow>
        </Sheet>
      </form>
    )
  }

  // 🎨 WHILE THE EXAMINER READS
  const renderMarking = () => (
    <Sheet aria-busy="true" aria-live="polite">
      <SheetRow
        divider={false}
        marginFirstOnMobile
        margin={
          <div className="space-y-4">
            <p className="font-hand text-2xl font-bold text-marker">Marking…</p>
            <div className="relative h-px w-full overflow-hidden bg-rule">
              <div className="absolute inset-0 animate-pencil-scan bg-marker" />
            </div>
            <p className="text-meta text-pencil">Reading the idea, checking feasibility, and weighing the risks.</p>
          </div>
        }
      >
        <p className="label-caps">Your idea</p>
        <p className="mt-3 max-w-[65ch] text-[1.0625rem] leading-8 text-ink">{formData.idea}</p>
        <div className="ruled mt-6 h-40" aria-hidden />
      </SheetRow>
    </Sheet>
  )

  // 🎨 STAGE 1: QUICK SNAPSHOT
  const renderQuickSnapshot = () => {
    if (!analysis) return null
    // Older saved results have no recommendation; fall back to a label from the score.
    const verdictLabel = analysis.recommendation || getFeasibilityBadge(analysis.feasibilityScore).text
    const users = analysis.targetUsersMarketFit
    const audience = [
      ["Primary users", users?.primaryUsers],
      ["Demand", users?.marketDemand],
      ["How to validate", users?.userValidation],
    ].filter((pair): pair is [string, string] => Boolean(pair[1]) && !isPlaceholder(pair[1]))
    const verdict = analysis.aiVerdict || generateAIVerdict(analysis.feasibilityScore, analysis.successProbability, analysis.difficultyLevel)

    return (
      <Sheet>
        <SheetRow
          marginFirstOnMobile
          marginLabel="Mark"
          margin={
            <div className="space-y-5">
              <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                <CircledScore score={analysis.feasibilityScore} />
                <div>
                  <p className="text-[1.0625rem] font-semibold text-marker">{verdictLabel}</p>
                  <p className="text-meta text-pencil">Mark out of 10</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 border-t border-rule pt-4">
                <Fact label="Odds of success"><span className="tabular">{analysis.successProbability}%</span></Fact>
                <Fact label="Difficulty">{analysis.difficultyLevel}</Fact>
              </dl>
            </div>
          }
        >
          <h1 className="max-w-[40ch] text-[1.5rem] font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-[1.75rem]">
            {analysis.projectDescription}
          </h1>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
            {analysis.detectedDomain ? <Fact label="Domain">{analysis.detectedDomain}</Fact> : null}
            {analysis.requiredExperience ? <Fact label="Experience needed">{analysis.requiredExperience}</Fact> : null}
          </dl>
          {clarifications && clarifications.some((c) => c.answer) ? (
            <dl className="mt-6 space-y-3 border-t border-rule pt-4">
              {clarifications
                .filter((c) => c.answer)
                .map((c, i) => (
                  <div key={i}>
                    <dt className="text-meta text-pencil">{c.question}</dt>
                    <dd className="mt-0.5 text-[0.9375rem] text-ink">{c.answer}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </SheetRow>

        {analysis.rubric ? (
          <SheetRow
            marginLabel="Examiner's note"
            margin={
              <MarginNote mark={scoreMark(analysis.feasibilityScore)} title={`How the ${analysis.feasibilityScore} is worked out`}>
                Each criterion is marked out of 10. The mark is their average.
              </MarginNote>
            }
          >
            <SheetHeading>How it was marked</SheetHeading>
            <ul className="divide-y divide-rule">
              {CRITERIA.map((criterion) => {
                const m = analysis.rubric?.[criterion.id]
                if (!m) return null
                return (
                  <li
                    key={criterion.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-baseline"
                  >
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      <span className="text-marker">
                        {m.score >= 7 ? <Tick className="size-4" /> : m.score >= 4 ? <Query className="size-4" /> : <Cross className="size-4" />}
                      </span>
                      {criterion.name}
                    </p>
                    <p className="col-span-2 row-start-2 text-[0.9375rem] leading-relaxed text-ink-soft sm:col-span-1 sm:col-start-2 sm:row-start-1">
                      {m.reason}
                    </p>
                    <p className="col-start-2 row-start-1 font-hand text-xl font-bold leading-none text-marker tabular sm:col-start-3">
                      {m.score}/10
                    </p>
                  </li>
                )
              })}
            </ul>
          </SheetRow>
        ) : null}

        <SheetRow
          marginLabel="Examiner's note"
          margin={
            <MarginNote mark={scoreMark(analysis.feasibilityScore)} title="The honest read">
              The highlighted line is what decides the mark.
            </MarginNote>
          }
        >
          <SheetHeading>Reality check</SheetHeading>
          <HighlightLead className="max-w-[68ch]" text={analysis.honestRealityCheck || analysis.honestAiFeedback} />
        </SheetRow>

        {audience.length > 0 ? (
        <SheetRow
          margin={
            isWeakDemand(analysis.targetUsersMarketFit?.marketDemand) ? (
              <MarginNote mark={<Query title="Unproven" />} title="Demand is unproven">
                The demand comes with a catch. Talk to five of these users before you build.
              </MarginNote>
            ) : (
              <MarginNote mark={<Tick title="Clear" />} title="Clear audience">
                Still talk to five of these users before you build.
              </MarginNote>
            )
          }
        >
          <SheetHeading>Who it is for</SheetHeading>
          <dl className="grid gap-5 sm:grid-cols-3">
            {audience.map(([label, value]) => (
              <div key={label}>
                <dt className="label-caps">{label}</dt>
                <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </SheetRow>
        ) : null}

        {analysis.selfQuestions && analysis.selfQuestions.length > 0 ? (
          <SheetRow
            marginLabel="Examiner's note"
            margin={
              <MarginNote mark={<Query />} title={`${plural(analysis.selfQuestions.length, "question")} for you`}>
                If you can&apos;t answer one, that is the next thing to find out.
              </MarginNote>
            }
          >
            <SheetHeading>Questions to ask yourself</SheetHeading>
            <ol className="max-w-[68ch] space-y-4">
              {analysis.selfQuestions.map((q, i) => (
                <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
                  <span className="font-hand text-[1.35rem] font-bold leading-none text-marker tabular">{i + 1}</span>
                  <div>
                    <p className="text-base font-medium leading-snug text-ink">{q.question}</p>
                    {q.why ? <p className="mt-1 text-sm leading-relaxed text-ink-soft">{q.why}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </SheetRow>
        ) : null}

        <SheetRow
          marginLabel="Next"
          margin={
            <ContinueButton
              to={AnalysisStage.EXECUTIVE_SUMMARY}
              label="Continue to summary"
              hint="Next: pros and cons, risks, what people say, and existing projects like yours."
            />
          }
        >
          <SheetHeading>Verdict</SheetHeading>
          <HighlightLead className="max-w-[68ch]" text={verdict} />
        </SheetRow>
      </Sheet>
    )
  }

  // 🎨 STAGE 2: SUMMARY
  const renderExecutiveSummary = () => {
    if (!analysis || !stageData.stage2) return null
    const s2 = stageData.stage2.analysis
    const s2Score = typeof s2?.feasibilityScore === "number" ? s2.feasibilityScore : null
    const challenges = s2?.potentialChallenges || analysis.potentialChallenges
    const riskTexts = [challenges?.technicalRisks, challenges?.usabilityIssues, challenges?.marketRisks].filter((t) => !isPlaceholder(t))
    // Severity comes from the model; older results fall back to a word check
    const severity = s2?.riskSeverity
    const seriousCount = severity && Object.keys(severity).length
      ? (["technical", "usability", "market"] as const).filter((k) => severity[k] === "high").length
      : riskTexts.filter(isSerious).length
    // Older results have strengths instead of pros; show those rather than nothing.
    const pros = s2?.pros?.length
      ? s2.pros
      : [s2?.keyStrengths?.valueProposition, s2?.keyStrengths?.marketFit].filter((t): t is string => !isPlaceholder(t))
    const cons = s2?.cons ?? []
    const discussions = stageData.stage2.discussions
    const users = stageData.stage1?.targetUsersMarketFit?.primaryUsers || analysis.targetUsersMarketFit?.primaryUsers
    const demand = stageData.stage1?.targetUsersMarketFit?.marketDemand || analysis.targetUsersMarketFit?.marketDemand
    const executiveSummary = s2?.executiveSummary || s2?.honestAiFeedback

    return (
      <Sheet>
        <SheetRow
          marginFirstOnMobile
          marginLabel="Mark"
          margin={
            <div className="space-y-4">
              {s2Score !== null ? (
                <>
                  <CircledScore score={s2Score} size="md" />
                  <p className="text-sm text-ink-soft">
                    Re-marked with more detail. Snapshot gave{" "}
                    <span className="font-semibold text-ink tabular">{analysis.feasibilityScore}/10</span>
                    {s2Score !== analysis.feasibilityScore ? (
                      <>, this page gives <span className="font-semibold text-marker tabular">{s2Score}/10</span>.</>
                    ) : "; this page agrees."}
                  </p>
                  {s2Score !== analysis.feasibilityScore && s2?.scoreChange ? (
                    <p className="text-sm text-ink-soft">{s2.scoreChange}</p>
                  ) : null}
                </>
              ) : (
                <MarginNote mark={scoreMark(analysis.feasibilityScore)} title={`Snapshot mark: ${analysis.feasibilityScore}/10`}>
                  The detailed re-mark didn&apos;t load; the summary below uses the snapshot.
                </MarginNote>
              )}
              <p className="border-t border-rule pt-3 text-meta text-ink-soft tabular">
                {plural(pros.length, "pro")} · {plural(cons.length, "con")} · {plural(riskTexts.length, "risk")}
                {seriousCount > 0 ? <span className="font-semibold text-marker"> · {seriousCount} serious</span> : null}
              </p>
            </div>
          }
        >
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">The full assessment</h1>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-soft">
            What people are saying, the real risks, what already exists, and the pros and cons.
          </p>
        </SheetRow>

        <SheetRow
          margin={
            !discussions || discussions.status === "error" ? (
              <MarginNote mark={<Query />} title="Sources unavailable">Couldn&apos;t load discussions or news this time.</MarginNote>
            ) : discussions.threads.length === 0 && !discussions.news?.length ? (
              <MarginNote mark={<Query />} title="Nothing found">Nobody seems to be discussing this problem online, or they phrase it differently.</MarginNote>
            ) : (
              <MarginNote
                mark={<Query />}
                title={[
                  discussions.threads.length ? plural(discussions.threads.length, "discussion") : "",
                  discussions.news?.length ? plural(discussions.news.length, "news story", "news stories") : "",
                ].filter(Boolean).join(" · ")}
              >
                {discussions.takeaway || "Read what people said before you decide."}
              </MarginNote>
            )
          }
        >
          <SheetHeading>Market: what people are saying</SheetHeading>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="label-caps">Users</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">{users || "User analysis needed"}</dd>
            </div>
            <div>
              <dt className="label-caps">Demand</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink">{demand || "Market demand assessment needed"}</dd>
            </div>
          </dl>

          <p className="label-caps mt-7">What people are discussing</p>
          {!discussions || discussions.status === "error" ? (
            <EmptyLine>Discussions couldn&apos;t be loaded. Try again later.</EmptyLine>
          ) : discussions.threads.length === 0 ? (
            <EmptyLine>No relevant discussions found on Hacker News or Stack Exchange.</EmptyLine>
          ) : (
            <ol className="mt-2 divide-y divide-rule">
              {discussions.threads.map((t, i) => (
                <li key={i} className="py-4 first:pt-1 last:pb-0">
                  <LinkTitle href={t.url}>{t.title}</LinkTitle>
                  <p className="mt-0.5 text-meta text-pencil tabular">
                    {t.where} · {t.points.toLocaleString()} {t.source === "Hacker News" ? "points" : "votes"} ·{" "}
                    {t.replies.toLocaleString()} {t.source === "Hacker News" ? "comments" : t.replies === 1 ? "answer" : "answers"}
                    {t.year ? ` · ${t.year}` : ""}
                  </p>
                  {t.says ? (
                    <p className="mt-1.5 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink">{t.says}</p>
                  ) : t.topComment ? (
                    <blockquote className="mt-1.5 max-w-[70ch] border-l border-marker pl-3 text-sm leading-relaxed text-ink-soft line-clamp-3">
                      {t.topComment}
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          {discussions && discussions.status === "ok" ? (
            <>
              <p className="label-caps mt-7">In the news</p>
              {!discussions.news?.length ? (
                <EmptyLine>No relevant news coverage found.</EmptyLine>
              ) : (
                <ul className="mt-2 divide-y divide-rule">
                  {discussions.news.map((n, i) => (
                    <li key={i} className="py-3 first:pt-1 last:pb-0">
                      <LinkTitle href={n.url}>{n.title}</LinkTitle>
                      <p className="mt-0.5 text-meta text-pencil tabular">
                        {n.source}
                        {n.publishedAt
                          ? ` · ${new Date(n.publishedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
                          : ""}
                      </p>
                      {n.note ? <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ink-soft">{n.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </SheetRow>

        <SheetRow
          margin={
            <MarginNote
              mark={seriousCount > 0 ? <DoubleCross title="Serious risk" /> : <Cross />}
              title={seriousCount > 0 ? `${plural(seriousCount, "serious risk")}` : plural(riskTexts.length, "risk")}
            >
              The highlighted part of each is what to solve first.
            </MarginNote>
          }
        >
          <SheetHeading>Risks</SheetHeading>
          <dl className="grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="label-caps">Technical</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink"><ClauseLead text={challenges?.technicalRisks || "Technical risk assessment needed"} /></dd>
            </div>
            <div>
              <dt className="label-caps">Usability</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink"><ClauseLead text={challenges?.usabilityIssues || "Usability review needed"} /></dd>
            </div>
            <div>
              <dt className="label-caps">Market</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink"><ClauseLead text={challenges?.marketRisks || "Market risk analysis needed"} /></dd>
            </div>
          </dl>
        </SheetRow>

        <SheetRow
          margin={
            stageData.stage2.existingSolutions.length > 0 ? (
              <MarginNote mark={<Query />} title={`${stageData.stage2.existingSolutions.length} already out there`}>
                From the AI&apos;s knowledge, not a live search. Check each one before you claim yours is new.
              </MarginNote>
            ) : (
              <MarginNote mark={<Query />} title="None named">Search for alternatives yourself before you claim it is new.</MarginNote>
            )
          }
        >
          <SheetHeading>Existing solutions</SheetHeading>
          {stageData.stage2.existingSolutions.length === 0 ? (
            <EmptyLine>No existing solutions were named for this idea.</EmptyLine>
          ) : (
            <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {stageData.stage2.existingSolutions.map((solution, index) => (
                <li key={index}>
                  {solution.url ? (
                    <LinkTitle href={solution.url}>{solution.name}</LinkTitle>
                  ) : (
                    <p className="font-medium text-ink">{solution.name}</p>
                  )}
                  {solution.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{solution.description}</p>
                  ) : null}
                  {solution.difference ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink">
                      <span className="font-semibold">Yours differs: </span>
                      {solution.difference}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SheetRow>

        <SheetRow
          margin={
            stageData.stage2.githubRepos.length > 0 ? (
              <MarginNote mark={<Query />} title={plural(Math.min(stageData.stage2.githubRepos.length, 4), "similar repo")}>Read their code before you design yours. Reuse is allowed; copying isn&apos;t.</MarginNote>
            ) : (
              <MarginNote mark={<Query />} title="None found">No similar repositories came back.</MarginNote>
            )
          }
        >
          <SheetHeading>Similar projects on GitHub</SheetHeading>
          {stageData.stage2.githubRepos.length === 0 ? (
            <EmptyLine>No repositories found. GitHub search may be unavailable right now.</EmptyLine>
          ) : (
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {stageData.stage2.githubRepos.slice(0, 4).map((repo, index) => (
                <li key={index}>
                  <LinkTitle href={repo.url}>{repo.owner}/{repo.name}</LinkTitle>
                  <p className="mt-0.5 flex items-center gap-3 text-meta text-pencil tabular">
                    <span>{repo.language}</span>
                    <span className="inline-flex items-center gap-1"><Star className="size-3" aria-hidden />{repo.stars.toLocaleString()}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">{repo.description}</p>
                </li>
              ))}
            </ul>
          )}
        </SheetRow>

        <SheetRow
          margin={
            pros.length > cons.length ? (
              <MarginNote mark={<Tick />} title="More for than against">Lead with the pros when you pitch it.</MarginNote>
            ) : pros.length === 0 ? (
              <MarginNote mark={<Query />} title="No clear pro">The analysis couldn&apos;t name one. That is a finding in itself.</MarginNote>
            ) : (
              <MarginNote mark={<Query />} title="Evenly weighed">Make sure the pros are worth the cons before you plan.</MarginNote>
            )
          }
        >
          <SheetHeading>Pros and cons</SheetHeading>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="label-caps">Pros</p>
              <ul className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-ink">
                {pros.map((p, i) => (
                  <li key={i} className="flex gap-2.5"><Tick className="mt-0.5 size-4 text-marker" /><span>{p}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-caps">Cons</p>
              {cons.length === 0 ? (
                <EmptyLine>No cons listed for this result.</EmptyLine>
              ) : (
                <ul className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-ink">
                  {cons.map((c, i) => (
                    <li key={i} className="flex gap-2.5"><Cross className="mt-0.5 size-4 text-marker" /><span>{c}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SheetRow>

        {stageData.stage2.quickWins.length > 0 ? (
        <SheetRow
          margin={
            <MarginNote mark={<Tick />} title={plural(stageData.stage2.quickWins.length, "quick win")}>
              Start here in the next week or two.
            </MarginNote>
          }
        >
          <SheetHeading>Quick wins</SheetHeading>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {stageData.stage2.quickWins.map((win, index) => (
              <li key={index} className="text-[0.9375rem] leading-relaxed">
                <span className="font-semibold text-ink">{win.title}</span>
                {win.timeEstimate ? <span className="text-pencil tabular"> · {win.timeEstimate}</span> : null}
                <p className="text-ink-soft">{win.description}</p>
              </li>
            ))}
          </ul>
        </SheetRow>
        ) : null}

        {executiveSummary ? (
          <SheetRow
            marginLabel="Examiner's note"
            margin={<MarginNote mark={scoreMark(s2Score ?? analysis.feasibilityScore)} title="The bottom line">The highlighted line is the verdict.</MarginNote>}
          >
            <SheetHeading>Executive summary</SheetHeading>
            <HighlightLead className="max-w-[68ch]" text={executiveSummary} />
          </SheetRow>
        ) : null}

        <SheetRow
          marginLabel="Next"
          margin={
            <ContinueButton
              to={AnalysisStage.PLAN}
              label="Continue to the plan"
              hint="Next: scope, stack, phases, team, and costs."
            />
          }
        >
          <SheetHeading>Still worth it?</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
            If the cons and risks above outweigh the pros, go back to the snapshot, edit the idea, and mark it again before planning it.
          </p>
        </SheetRow>
      </Sheet>
    )
  }

  // 🎨 STAGE 3: PLAN (roadmap and tech plan on one sheet)
  const renderPlan = () => {
    if (!analysis || !stageData.stage3 || !stageData.stage4) return null
    const totalFte = stageData.stage3.teamRoles.reduce((sum, r) => sum + (Number(r.fteEstimate) || 0), 0)
    const fit = stageData.stage3.timelineFit
    const phases = stageData.stage3.projectMilestones
    const s2 = stageData.stage2?.analysis
    const scope = s2?.requirementsScope
    const cuts = stageData.stage3.scopeCuts ?? []
    const isCut = (feature: string) => cuts.some((c) => sameFeature(c, feature))
    const scopeFeatures = [...(scope?.mustHaveFeatures ?? []), ...(scope?.niceToHaveFeatures ?? [])]
    // Cuts the scope lists don't show (the model reworded them)
    const otherCuts = cuts.filter((c) => !scopeFeatures.some((f) => sameFeature(c, f)))
    const keptMustHaves = (scope?.mustHaveFeatures ?? []).filter((f) => !isCut(f)).length
    const neededWeeks = totalWeeks(phases.map((p) => p.duration))
    const hasWeeks = availableWeeks(formData.timeline)
    const techCount = stageData.stage4.techRoadmap.reduce((n, t) => n + t.technologies.length, 0)
    const unproven = stageData.stage4.techRoadmap.filter((t) => t.trl < 7)
    const costTotals = stageData.stage4.costEstimates.map((c) => sumCosts(c.items.map((i) => i.cost)))
    // Only when every cost could be read; otherwise the model's own totals are shown
    const overallCost = costTotals.every(Boolean)
      ? costTotals.reduce<{ monthly: number; oneOff: number }>(
          (sum, c) => ({ monthly: sum.monthly + c!.monthly, oneOff: sum.oneOff + c!.oneOff }),
          { monthly: 0, oneOff: 0 }
        )
      : null

    return (
      <Sheet>
        <SheetRow
          marginFirstOnMobile
          margin={
            <div className="space-y-4">
              {fit ? (
                <MarginNote
                  mark={fit.verdict === "fits" ? <Tick /> : fit.verdict === "tight" ? <Query /> : <Cross />}
                  title={
                    fit.verdict === "fits"
                      ? `Fits ${formData.timeline ? `your ${formData.timeline}` : "the time you have"}`
                      : fit.verdict === "tight"
                        ? "Tight for the time you have"
                        : "More than the time you have"
                  }
                >
                  {fit.note || `${plural(phases.length, "phase")}, each starting when the one before it is done.`}
                </MarginNote>
              ) : (
                <MarginNote mark={<Tick />} title={plural(phases.length, "phase")}>Each phase starts when the one before it is done.</MarginNote>
              )}
              {neededWeeks !== null ? (
                <p className="border-t border-rule pt-3 text-meta text-pencil tabular">
                  {plural(phases.length, "phase")} adding up to {formatWeeks(neededWeeks)}
                  {hasWeeks !== null ? ` of the ${formData.timeline} you have` : ""}.
                </p>
              ) : null}
              {!viewing ? <div className="space-y-2">
                <Button variant="outline" onClick={remakePlan} disabled={remakingPlan} className="w-full justify-between">
                  {remakingPlan ? "Writing a new plan…" : "Make a new plan"}
                  {remakingPlan ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                </Button>
                {planError && !remakingPlan ? <p role="alert" className="text-meta font-medium text-marker">{planError}</p> : null}
              </div> : null}
            </div>
          }
        >
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">The plan</h1>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-soft">What to build first, how to build it, who you need, and what to build it with.</p>
        </SheetRow>

        {scope && (scope.mustHaveFeatures?.length || scope.niceToHaveFeatures?.length || scope.constraints?.length) ? (
          <SheetRow
            margin={
              cuts.length > 0 ? (
                <MarginNote mark={<Cross />} title={`${plural(cuts.length, "feature")} cut to fit`}>
                  Struck through below. Build {cuts.length === 1 ? "it" : "them"} after the first version, if users ask.
                </MarginNote>
              ) : (scope.mustHaveFeatures?.length || 0) > 5 ? (
                <MarginNote mark={<Query />} title={`${scope.mustHaveFeatures?.length} must-haves is a lot`}>
                  Cut to the five that prove the idea. The rest waits until users ask.
                </MarginNote>
              ) : (
                <MarginNote mark={<Tick />} title={`${plural(keptMustHaves, "must-have")}`}>
                  A buildable core. Everything else waits until users ask for it.
                </MarginNote>
              )
            }
          >
            <SheetHeading>Scope</SheetHeading>
            <div className="grid gap-6 sm:grid-cols-3">
              {([
                ["Must have", scope.mustHaveFeatures],
                ["Nice to have", scope.niceToHaveFeatures],
                ["Constraints", scope.constraints],
              ] as const).map(([label, items]) => (
                <div key={label}>
                  <p className="label-caps">{label}</p>
                  <ul className="mt-2 space-y-1.5 text-[0.9375rem] text-ink">
                    {(items || []).map((item, i) =>
                      label !== "Constraints" && isCut(item) ? (
                        <li key={i} className="flex gap-2 text-pencil">
                          <span>–</span>
                          <span><s>{item}</s> <span className="text-meta font-medium text-marker">cut</span></span>
                        </li>
                      ) : (
                        <li key={i} className="flex gap-2"><span className="text-pencil">–</span><span>{item}</span></li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
            {otherCuts.length > 0 ? (
              <p className="mt-5 text-sm text-ink-soft">
                <span className="font-semibold text-ink">Also left out: </span>
                {otherCuts.join("; ")}
              </p>
            ) : null}
          </SheetRow>
        ) : null}

        {phases.map((milestone, index) => (
          <SheetRow
            key={index}
            marginDesktopOnly
            margin={
              <div>
                <p className="font-hand text-[1.6rem] font-bold leading-none text-marker">{milestone.duration}</p>
                {milestone.dependencies.length > 0 ? (
                  <p className="mt-2 text-meta text-pencil">After {milestone.dependencies.join(", ")}</p>
                ) : (
                  <p className="mt-2 text-meta text-pencil">Starts first</p>
                )}
              </div>
            }
          >
            <div className="flex gap-4">
              <span className="font-mono text-meta text-pencil tabular pt-1">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2 className="text-[1.125rem] font-semibold text-ink">{milestone.phase}</h2>
                <p className="mt-0.5 font-hand text-lg font-bold leading-tight text-marker lg:hidden">{milestone.duration}</p>
                <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-[0.9375rem] text-ink sm:grid-cols-2">
                  {milestone.deliverables.map((deliverable, idx) => (
                    <li key={idx} className="flex gap-2"><span className="text-pencil">–</span><span>{deliverable}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </SheetRow>
        ))}

        {stageData.stage3.sdlcMapping || stageData.stage3.qaApproach ? (
        <SheetRow>
          <div className="grid gap-8 sm:grid-cols-2">
            {stageData.stage3.sdlcMapping ? (
              <div>
                <SheetHeading level={3}>Way of working</SheetHeading>
                <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{stageData.stage3.sdlcMapping}</p>
              </div>
            ) : null}
            {stageData.stage3.qaApproach ? (
              <div>
                <SheetHeading level={3}>Testing and release</SheetHeading>
                <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{stageData.stage3.qaApproach}</p>
              </div>
            ) : null}
          </div>
        </SheetRow>
        ) : null}

        {stageData.stage3.teamRoles.length > 0 ? (
        <SheetRow
          margin={
            <div>
              <p className="font-hand text-[1.6rem] font-bold leading-none text-marker tabular">{totalFte.toFixed(1)} FTE</p>
              <p className="mt-2 text-meta text-pencil">
                {totalFte > 1.5
                  ? "More than one person can give. Find help, cut scope, or stretch the timeline."
                  : "Share of one person's full time, across all the roles below."}
              </p>
            </div>
          }
        >
          <SheetHeading>Team</SheetHeading>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-rule">
                  <th scope="col" className="label-caps py-2 pr-4 font-semibold">Role</th>
                  <th scope="col" className="label-caps py-2 pr-4 text-right font-semibold">FTE</th>
                  <th scope="col" className="label-caps py-2 font-semibold">Skills</th>
                </tr>
              </thead>
              <tbody>
                {stageData.stage3.teamRoles.map((role, index) => (
                  <tr key={index} className="border-b border-rule align-top last:border-b-0">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-ink">{role.role}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{role.description}</p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-sm text-ink tabular">{role.fteEstimate}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {role.skills.map((skill, idx) => <Chip key={idx}>{skill}</Chip>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SheetRow>
        ) : null}

        <SheetRow
          margin={
            unproven.length > 0 ? (
              <MarginNote mark={<Cross />} title={`${plural(unproven.length, "unproven layer")}`}>
                {unproven.map((t) => t.category).join(", ")} {unproven.length === 1 ? "isn't" : "aren't"} established yet. Budget time to try it early, and have a fallback.
              </MarginNote>
            ) : techCount > 10 ? (
              <MarginNote mark={<Query />} title={`${techCount} technologies`}>A lot to learn at once. Drop anything you haven&apos;t used before unless it is essential.</MarginNote>
            ) : (
              <MarginNote mark={<Tick />} title={`${techCount} technologies`}>A manageable stack to learn and build with.</MarginNote>
            )
          }
        >
          <SheetHeading>Stack</SheetHeading>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-rule">
                  <th scope="col" className="label-caps py-2 pr-4 font-semibold">Layer</th>
                  <th scope="col" className="label-caps py-2 pr-4 font-semibold">Technologies</th>
                  <th scope="col" className="label-caps py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {stageData.stage4.techRoadmap.map((item, index) => (
                  <tr key={index} className="border-b border-rule align-top last:border-b-0">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-ink">{item.category}</p>
                      {item.trl < 7 ? <p className="text-meta font-medium text-marker">Unproven</p> : null}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.technologies.map((tech, idx) => <Chip key={idx}>{tech}</Chip>)}
                      </div>
                    </td>
                    <td className="py-3 text-sm text-ink-soft">{item.timeline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SheetRow>

        <SheetRow
          margin={
            <MarginNote mark={<Tick />} title={plural(stageData.stage4.versionMilestones.length, "version")}>
              Ship the first one before starting the next.
            </MarginNote>
          }
        >
          <SheetHeading>Versions</SheetHeading>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stageData.stage4.versionMilestones.map((version, index) => (
              <li key={index} className="min-w-0">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">{version.version}</span>
                  <span className="text-meta text-pencil">{version.timeline}</span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">{version.description}</p>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {version.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-2"><span className="text-pencil">–</span><span>{feature}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </SheetRow>

        {stageData.stage4.securityConsiderations.length > 0 ? (
        <SheetRow
          margin={(() => {
            const reqs = stageData.stage4.securityConsiderations.reduce((n, c) => n + c.requirements.length, 0)
            const standards = new Set(stageData.stage4.securityConsiderations.flatMap((c) => c.compliance)).size
            return (
              <MarginNote mark={<Cross />} title={plural(reqs, "requirement")}>
                {standards > 0 ? `${plural(standards, "standard")} to comply with. ` : ""}Easy to postpone, expensive to add later.
              </MarginNote>
            )
          })()}
        >
          <SheetHeading>Security and compliance</SheetHeading>
          <ul className="space-y-5">
            {stageData.stage4.securityConsiderations.map((security, index) => (
              <li key={index} className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <p className="font-semibold text-ink">{security.area}</p>
                <div>
                  <ul className="space-y-1 text-[0.9375rem] text-ink">
                    {security.requirements.map((req, idx) => (
                      <li key={idx} className="flex gap-2"><span className="text-pencil">–</span><span>{req}</span></li>
                    ))}
                  </ul>
                  {security.compliance.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {security.compliance.map((c, idx) => <Chip key={idx}>{c}</Chip>)}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </SheetRow>
        ) : null}

        {stageData.stage4.costEstimates.length > 0 ? (
        <SheetRow
          margin={
            overallCost ? (
              <div>
                <p className="text-meta text-pencil">Total to run it</p>
                <p className="font-hand text-[1.6rem] font-bold leading-tight text-marker tabular">{formatMoney(overallCost)}</p>
                <p className="mt-2 text-meta text-pencil">Added up from the costs listed, at the start. Paid tiers come later.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stageData.stage4.costEstimates.map((c, i) => (
                  <div key={i}>
                    <p className="text-meta text-pencil">{c.category}</p>
                    <p className="font-hand text-[1.4rem] font-bold leading-tight text-marker tabular">{c.total}</p>
                  </div>
                ))}
              </div>
            )
          }
        >
          <SheetHeading>Costs</SheetHeading>
          <div className="space-y-6">
            {stageData.stage4.costEstimates.map((category, index) => (
              <div key={index}>
                <p className="flex items-baseline justify-between gap-3">
                  <span className="label-caps">{category.category}</span>
                  <span className="font-mono text-meta text-pencil tabular">{costTotals[index] ? formatMoney(costTotals[index]!) : category.total}</span>
                </p>
                <table className="mt-2 w-full border-collapse text-left text-[0.9375rem]">
                  <tbody>
                    {category.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-rule align-top last:border-b-0">
                        <td className="py-2 pr-4">
                          <p className="font-medium text-ink">{item.name}</p>
                          <p className="text-sm text-ink-soft">{item.justification}</p>
                        </td>
                        <td className="whitespace-nowrap py-2 text-right font-mono text-sm text-ink tabular">{item.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </SheetRow>
        ) : null}

        <SheetRow
          marginLabel="Next"
          margin={
            <ContinueButton
              to={AnalysisStage.HAND_OFF}
              label="Continue to hand-off"
              hint="Next: export the report and find help."
            />
          }
        >
          <SheetHeading>Take it with you</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
            The hand-off page collects the report and links to find people who can help build it.
          </p>
        </SheetRow>
      </Sheet>
    )
  }

  // 🎨 STAGE 4: HAND-OFF
  const projectTitle = () => analysis?.projectTitle || analysis?.shortTitle || "Project idea"

  // Every page in one printable document, opened in a new tab
  const openReport = () => {
    if (!analysis) return
    const html = buildReport({
      idea: formData.idea,
      context: CONTEXT_QUESTIONS.map((q) => ({
        label: q.label,
        value: q.options.find((o) => o.value === formData[q.id])?.label ?? "",
      })),
      snapshot: analysis,
      summary: stageData.stage2?.analysis,
      discussions: stageData.stage2?.discussions,
      githubRepos: stageData.stage2?.githubRepos,
      existingSolutions: stageData.stage2?.existingSolutions,
      quickWins: stageData.stage2?.quickWins,
      plan: stageData.stage3 && stageData.stage4 ? { stage3: stageData.stage3, stage4: stageData.stage4 } : undefined,
      brief: stageData.stage5?.brief,
      wireframes: stageData.stage5?.wireframes,
    })
    setSavedInstead(openHtml(html, `${fileSlug(projectTitle())}-report.html`) ? null : "report")
  }

  const openSrs = (srs: Srs) => {
    const brief = stageData.stage5?.brief
    const html = buildSrsDocument(srs, projectTitle(), {
      wireframes: stageData.stage5?.wireframes,
      stories: brief ? numberStories(brief) : [],
    })
    setSavedInstead(openHtml(html, `${fileSlug(projectTitle())}-srs.html`) ? null : "srs")
  }

  const SavedInsteadNote = ({ doc }: { doc: "report" | "srs" }) =>
    savedInstead === doc ? (
      <p role="status" className="text-meta text-ink-soft">The browser blocked the new tab, so it was saved as a file instead. Open the file to print it.</p>
    ) : null

  // "Write …" / "Write it again", with its progress and error lines
  const WriteButton = ({ doc, label, again = "Write it again" }: { doc: HandOffDoc; label: string; again?: string }) => {
    const written = Boolean(stageData.stage5?.[doc])
    const busy = writing === doc
    // A viewed evaluation isn't changed from the website; its documents come from the AI chat
    if (viewing) return null
    return (
      <>
        <Button
          variant={written ? "outline" : "default"}
          size={written ? "default" : "lg"}
          onClick={() => writeDocument(doc)}
          disabled={writing !== null}
          className={cn("w-full justify-between", !written && "h-11 px-4")}
        >
          {busy ? "Writing…" : written ? again : label}
          {busy ? <Loader2 className="animate-spin" /> : written ? <RefreshCw /> : <ArrowRight />}
        </Button>
        {busy ? <p className="text-meta text-pencil">This can take up to a minute.</p> : null}
        {writeErrors[doc] && !busy ? <p role="alert" className="text-meta font-medium text-marker">{writeErrors[doc]}</p> : null}
      </>
    )
  }

  const renderDeepResources = () => {
    if (!analysis || !stageData.stage5) return null
    const srs = stageData.stage5.srs
    const brief = stageData.stage5.brief
    const wireframes = stageData.stage5.wireframes
    const stories = brief ? numberStories(brief) : []
    const phases = stageData.stage3?.projectMilestones ?? []
    const taskCount = phases.reduce((n, p) => n + p.deliverables.length, 0)
    const hiring = hireLinks(stageData.stage3?.teamRoles ?? [])
    const requirements = srs ? numberRequirements(srs) : []
    const nfrCount = srs ? [srs.quality.performance, srs.quality.safety, srs.quality.security, srs.quality.quality, srs.quality.businessRules].reduce((n, l) => n + l.length, 0) : 0
    // Stories no requirement traces to, the same check as the SRS's Appendix A
    const traced = new Set(requirements.flatMap((r) => r.stories))
    const untraced = stories.filter((st) => !traced.has(st.id))

    return (
      <Sheet>
        <SheetRow marginFirstOnMobile margin={<MarginNote mark={<Tick />} title="All four pages marked">Take the report to your supervisor or team, and the plan into your tracker.</MarginNote>}>
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">Take it further</h1>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-soft">The whole evaluation as a report, the requirements written up, and the plan ready to track.</p>
        </SheetRow>

        <SheetRow
          margin={
            <div className="space-y-2">
              {brief ? (
                <Button onClick={openReport} size="lg" className="h-11 w-full justify-between px-4">
                  Open the report <FileText />
                </Button>
              ) : null}
              <WriteButton doc="brief" label="Write the vision and story map" again="Rewrite the vision and map" />
              {brief ? <WriteButton doc="wireframes" label="Draw the wireframes" again="Redraw the wireframes" /> : null}
              {!brief ? (
                <Button variant="ghost" onClick={openReport} className="w-full justify-between text-ink-soft">
                  {viewing ? "Open the report" : "Open the report without them"} <FileText />
                </Button>
              ) : null}
              <SavedInsteadNote doc="report" />
            </div>
          }
        >
          <SheetHeading>The report</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
            The evaluation and product brief as a paged document: executive summary, product vision, the marking and
            market, a user story map, wireframes of the key screens, the plan with costs, and next steps, with a contents page. It opens in a new tab;
            save it as a PDF from the print dialog.
          </p>
          {brief ? (
            <div className="mt-5 space-y-3">
              <p className="max-w-[68ch] border-l-2 border-marker pl-3 text-[0.9375rem] leading-relaxed text-ink">
                For {brief.vision.targetUsers} who {brief.vision.need}, <span className="font-semibold">{brief.vision.productName}</span> is a{" "}
                {brief.vision.category} that {brief.vision.benefit}.
              </p>
              <p className="text-meta text-pencil tabular">
                {plural(brief.personas.length, "persona")} · {plural(brief.goals.length, "goal")} ·{" "}
                {plural(stories.length, "user story", "user stories")} in {plural(brief.activities.length, "activity", "activities")} ·{" "}
                {stories.filter((st) => st.release === stories[0]?.release).length} in the first release
              </p>
              {wireframes ? (
                <p className="text-meta text-pencil">
                  Wireframes: {wireframes.screens.map((sc) => sc.name).join(", ")}
                </p>
              ) : (
                <p className="text-meta text-pencil">
                  {viewing
                    ? "Wireframes of the key screens are drawn in the AI chat, after the story map."
                    : "Draw the wireframes next to add the key screens, sketched from these stories."}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 max-w-[60ch] text-sm text-pencil">
              {viewing
                ? "The product vision, story map, and wireframes are written in the AI chat; until then the report covers the evaluation and the plan."
                : "Write the product vision and the user story map first, so the report includes them."}
            </p>
          )}
        </SheetRow>

        <SheetRow
          margin={
            <div className="space-y-2">
              {srs ? (
                <Button size="lg" className="h-11 w-full justify-between px-4" onClick={() => openSrs(srs)}>
                  Open the SRS <FileText />
                </Button>
              ) : null}
              <WriteButton doc="srs" label="Write the SRS" />
              <SavedInsteadNote doc="srs" />
            </div>
          }
        >
          <SheetHeading>Requirements document (SRS)</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
            A detailed software requirements specification on the IEEE 830 outline, written from this evaluation, the plan,
            the story map, and the wireframes: users and interfaces, features with numbered requirements and acceptance
            criteria, measurable quality requirements, the data model, and a traceability table back to the user stories
            and screens. It opens as a paged document; save it as a PDF from the print dialog.
          </p>
          {!srs && (!brief || !wireframes) ? (
            <p className="mt-3 max-w-[60ch] text-sm text-pencil">
              {viewing
                ? "The requirements document is written in the AI chat, once the evaluation has a story map."
                : `Write the vision and story map${wireframes ? "" : " and draw the wireframes"} first, so the requirements can trace to them.`}
            </p>
          ) : null}
          {srs ? (
            <div className="mt-5">
              <p className="text-meta text-pencil tabular">
                {plural(srs.features.length, "feature")} · {plural(requirements.length, "functional requirement")} ·{" "}
                {plural(nfrCount, "non-functional requirement")} · {plural(srs.quality.entities.length, "data entity", "data entities")} ·{" "}
                {plural(srs.quality.openQuestions.length, "open question")}
              </p>
              <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-[0.9375rem] text-ink sm:grid-cols-2">
                {srs.features.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-meta text-pencil tabular pt-0.5">4.{i + 1}</span>
                    <span>
                      {f.name}
                      {f.priority !== "Must" ? <span className="text-meta text-pencil"> · {f.priority.toLowerCase()}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
              {stories.length ? (
                <p className={cn("mt-3 text-meta", untraced.length ? "font-medium text-marker" : "text-pencil")}>
                  {untraced.length
                    ? `${plural(untraced.length, "user story", "user stories")} with no requirement: ${untraced.map((st) => st.id).join(", ")}. Write it again or add them by hand.`
                    : `Every user story traces to a requirement.`}
                </p>
              ) : null}
            </div>
          ) : null}
        </SheetRow>

        {phases.length > 0 ? (
          <SheetRow
            margin={
              <Button
                size="lg"
                variant="outline"
                className="h-11 w-full justify-between px-4"
                onClick={() => downloadText(`${fileSlug(projectTitle())}-jira.csv`, jiraCsv(phases, projectTitle()), "text/csv")}
              >
                Download CSV <Download />
              </Button>
            }
          >
            <SheetHeading>The plan as tasks</SheetHeading>
            <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
              {plural(phases.length, "epic")} and {plural(taskCount, "task")}: each phase of the plan becomes an epic and each
              of its deliverables a task under it. Import it with Jira&apos;s CSV importer and map the <span className="font-medium text-ink">Issue ID</span> and{" "}
              <span className="font-medium text-ink">Parent ID</span> columns so the tasks land under their epics. Trello,
              Linear, and GitHub Projects can import the same file.
            </p>
          </SheetRow>
        ) : null}

        {hiring.length > 0 ? (
          <SheetRow margin={<MarginNote mark={<Query />} title="Searches, not endorsements">Check reviews and past work before you hire anyone.</MarginNote>}>
            <SheetHeading>Find people to build it</SheetHeading>
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {hiring.map((h) => (
                <li key={h.role}>
                  <p className="font-semibold text-ink">{h.role}</p>
                  {h.skills ? <p className="text-meta text-pencil">{h.skills}</p> : null}
                  <p className="mt-1 flex gap-4 text-sm">
                    {h.sites.map((site) => <LinkTitle key={site.name} href={site.url}>{site.name}</LinkTitle>)}
                  </p>
                </li>
              ))}
            </ul>
          </SheetRow>
        ) : null}

        <SheetRow margin={<MarginNote title="Not available yet">It needs saved reports and accounts, which are on the roadmap.</MarginNote>}>
          <SheetHeading>Coming later</SheetHeading>
          <p className="flex items-start gap-3 text-pencil">
            <LinkIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="block font-medium text-ink-soft">Shareable report link</span>
              <span className="text-sm">A permanent link to this evaluation, to send instead of a file.</span>
            </span>
          </p>
        </SheetRow>
      </Sheet>
    )
  }

  const getFeasibilityBadge = (score: number) => {
    if (score >= 8) return { variant: "default" as const, text: "Highly Feasible" }
    if (score >= 6) return { variant: "secondary" as const, text: "Feasible" }
    return { variant: "destructive" as const, text: "Challenging" }
  }

  // Generate AI verdict based on scores
  const generateAIVerdict = (feasibility: number, successProbability: number, difficulty: string) => {
    const feasibilityLevel = feasibility >= 8 ? "strong" : feasibility >= 6 ? "moderate" : "limited"
    const successLevel = successProbability >= 70 ? "high" : successProbability >= 50 ? "moderate" : "low"
    const difficultyLevel = difficulty.toLowerCase()

    const verdicts = [
      { condition: feasibility >= 8 && successProbability >= 70, text: "💡 This idea shows excellent potential with strong technical feasibility and market opportunity." },
      { condition: feasibility >= 7 && successProbability >= 60, text: "💡 This idea demonstrates solid viability with good technical foundations and market potential." },
      { condition: feasibility >= 6 && successProbability >= 50, text: "💡 This idea shows moderate promise but may require careful planning and execution." },
      { condition: feasibility >= 6 && successProbability < 50, text: "⚠️ This idea has technical merit but faces significant market challenges." },
      { condition: feasibility < 6 && successProbability >= 60, text: "⚠️ This idea has market potential but presents notable technical challenges." },
      { condition: true, text: "🔍 This idea requires substantial development and market validation to succeed." }
    ]

    return verdicts.find(v => v.condition)?.text || verdicts[verdicts.length - 1].text
  }

  // Function to go back to input stage
  const goBackToInput = () => {
    setAnalyzeError(null)
    setClarifyQuestions(null)
    setClarifications(null)
    setCurrentStage(AnalysisStage.INPUT)
    setAnalysis(null)
  }

  const stageLabels: Record<number, string> = {
    1: "Snapshot",
    2: "Summary",
    3: "Plan",
    4: "Hand-off",
  }

  const stageHasData = (n: number) => {
    if (n === AnalysisStage.QUICK_SNAPSHOT) return !!analysis
    if (n === AnalysisStage.EXECUTIVE_SUMMARY) return !!stageData.stage2
    if (n === AnalysisStage.PLAN) return !!stageData.stage3 && !!stageData.stage4
    if (n === AnalysisStage.HAND_OFF) return !!stageData.stage5
    return false
  }

  const stageTabs: StageTab[] = [1, 2, 3, 4].map((n) => ({
    id: n,
    label: stageLabels[n],
    state:
      n === currentStage
        ? "current"
        : stageHasData(n)
          ? "marked"
          : n === currentStage + 1 && !loading
            ? "open"
            : "locked",
  }))

  const selectStage = (n: number) => {
    if (stageHasData(n)) {
      setCurrentStage(n as AnalysisStage)
      if (!viewing) localStorage.setItem("currentStage", n.toString())
    } else if (n === currentStage + 1 && !viewing) {
      proceedToStage(n as AnalysisStage)
    }
  }

  // A saved evaluation: still loading, not found, or a stage that hasn't been saved yet
  const renderViewingState = () =>
    viewing?.status === "loading" ? (
      <Sheet>
        <SheetRow divider={false} margin={<Loader2 className="size-5 animate-spin text-pencil" />}>
          <SheetHeading>Opening the evaluation…</SheetHeading>
        </SheetRow>
      </Sheet>
    ) : viewing?.status === "error" ? (
      <Sheet>
        <SheetRow divider={false} margin={<MarginNote mark={<Cross />} title="Not found">Links stay valid for 90 days.</MarginNote>}>
          <SheetHeading>This evaluation couldn&apos;t be opened</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] text-ink-soft">{viewing.message}</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/analysis?new">Evaluate an idea yourself</a>
          </Button>
        </SheetRow>
      </Sheet>
    ) : (
      <Sheet>
        <SheetRow divider={false} margin={<MarginNote mark={<Query />} title="Not saved yet">Refresh once your AI has saved it.</MarginNote>}>
          <SheetHeading>{stageLabels[currentStage] ?? "This page"} hasn&apos;t been saved yet</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] text-ink-soft">
            This evaluation is being made in an AI chat with the Idea Evaluator connector. Ask the AI to continue to this stage.
          </p>
        </SheetRow>
      </Sheet>
    )

  // A stage whose data is missing (e.g. after a page refresh) gets a clear way back.
  const renderMissingStage = () => (
    <Sheet>
      <SheetRow
        divider={false}
        margin={
          <Button onClick={() => proceedToStage(currentStage)} disabled={loading || !analysis} className="w-full justify-between">
            {loading ? "Marking…" : "Load this page"}
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        }
      >
        <SheetHeading>{stageLabels[currentStage] ?? "This page"} isn&apos;t loaded</SheetHeading>
        {stageError && !loading ? (
          <p role="alert" className="mb-2 text-sm font-medium text-marker">{stageError}</p>
        ) : null}
        <p className="max-w-[60ch] text-[0.9375rem] text-ink-soft">
          This page's data wasn't found. Load it again, or go back to the snapshot.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => selectStage(AnalysisStage.QUICK_SNAPSHOT)} disabled={!analysis}>
          Back to snapshot
        </Button>
      </SheetRow>
    </Sheet>
  )

  // The idea can only be edited while it is on the first page; later pages build on it.
  const canEditIdea = currentStage === AnalysisStage.QUICK_SNAPSHOT && !viewing

  return (
    <div className="min-h-screen bg-background">
      <AppBar
        wide
        actions={
          <>
            {analysis ? (
              <>
                {canEditIdea ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 sm:hidden" aria-label="More actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[11rem] rounded-md border-rule bg-sheet shadow-lift">
                    {canEditIdea ? (
                      <DropdownMenuItem onSelect={goBackToInput}>
                        <Edit3 /> Edit idea
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
                ) : null}
              </>
            ) : null}
            <ThemeToggle />
          </>
        }
      />

      {analysis && currentStage !== AnalysisStage.INPUT ? (
        <div className="sticky top-14 z-30 border-b border-rule bg-background">
          <div className="mx-auto flex max-w-[88rem] items-center gap-3 px-4 sm:px-6">
            <StageTabs stages={stageTabs} onSelect={selectStage} className="min-w-0 flex-1" />
            <div className="hidden shrink-0 items-center gap-0.5 sm:flex md:gap-1">
              {canEditIdea ? (
                <Button variant="ghost" size="sm" onClick={goBackToInput} aria-label="Edit idea">
                  <Edit3 /> <span className="hidden md:inline">Edit idea</span>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {viewing?.status === "ready" ? (
        <div className="border-b border-rule bg-sheet">
          <p className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-meta text-ink-soft sm:px-6">
            <span>
              {viewing.source === "mcp" ? "Made in an AI chat with the Idea Evaluator connector." : "A saved evaluation."} Read-only.
            </span>
            <a href="/analysis?new" className="font-medium text-ink underline decoration-rule underline-offset-[3px] hover:decoration-marker">
              Evaluate your own idea
            </a>
          </p>
        </div>
      ) : null}

      <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 sm:py-10">
        <div key={`${currentStage}-${analyzing}`} className="animate-ink-in">
          {viewing && viewing.status !== "ready"
            ? renderViewingState()
            : analyzing
              ? renderMarking()
              : (renderStageContent() ?? (viewing ? renderViewingState() : renderMissingStage()))}
        </div>
      </main>
    </div>
  )
}
