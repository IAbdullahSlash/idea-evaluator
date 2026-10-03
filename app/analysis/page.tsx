"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateIdea } from "@/lib/validation"
import { fetchWithFallback } from "@/lib/fetch-with-fallback"
import { cn } from "@/lib/utils"
import { CRITERIA } from "@/lib/schemas/snapshot"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
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
  redditQuery?: string
  scoreChange?: string
  riskSeverity?: Partial<Record<"technical" | "usability" | "market", string>>
  quickWins?: QuickWin[]
  existingSolutions?: ExistingSolution[]
  searchQueries?: { github?: string; reddit?: string }
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

interface RedditThreadSummary {
  title: string
  subreddit: string
  url: string
  score: number
  numComments: number
  says: string | null
  topComment: string | null
}

interface RedditResult {
  status: "ok" | "error" | "not-configured"
  takeaway?: string | null
  threads: RedditThreadSummary[]
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
  category: "Infrastructure" | "Dev Stack" | "Integrations" | "Testing" | "Scalability"
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

interface TaskProgress {
  [key: string]: boolean
}


export default function AnalysisPage() {
  // 🚀 STAGED ANALYSIS STATE
  const [currentStage, setCurrentStage] = useState<AnalysisStage>(AnalysisStage.INPUT)
  const [stageData, setStageData] = useState<{
    stage1?: AnalysisData
    stage2?: {
      quickWins: QuickWin[]
      existingSolutions: ExistingSolution[]
      githubRepos: GitHubRepo[]
      reddit?: RedditResult
      analysis?: AnalysisData
    }
    stage3?: {
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
    stage5?: {
      jiraIntegration: boolean
      shareableLink: string
      freelancerLinks: any[]
      srsDocument: any
    }
  }>({})

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [taskProgress, setTaskProgress] = useState<TaskProgress>({})
  const [exportLoading, setExportLoading] = useState(false)
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
  // Why the next page failed to load, shown under its Continue button
  const [stageError, setStageError] = useState<string | null>(null)
  // Saved stage data is only written back once it has been read on load
  const [hydrated, setHydrated] = useState(false)
  // Follow-up questions, asked when the idea is too vague to mark
  const [clarifyQuestions, setClarifyQuestions] = useState<GuidingQuestion[] | null>(null)
  const [clarifyAnswers, setClarifyAnswers] = useState<string[]>([])
  // The answers the idea was marked with; later stages receive them too
  const [clarifications, setClarifications] = useState<Clarification[] | null>(null)

  // 🚀 LOCAL STORAGE HYDRATION — restore progress after page refresh
  useEffect(() => {
    try {
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
        if (stages && typeof stages === "object") setStageData(prev => ({ ...prev, ...stages }))
      }
      const savedInput = localStorage.getItem("evaluationInput")
      if (savedInput) {
        const input = JSON.parse(savedInput)
        if (input?.formData?.idea) setFormData(prev => ({ ...prev, ...input.formData }))
        if (Array.isArray(input?.clarifications)) setClarifications(input.clarifications)
      }
      const savedProgress = localStorage.getItem("taskProgress")
      if (savedProgress) {
        setTaskProgress(JSON.parse(savedProgress))
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

  // Keep the later stages across a refresh (the snapshot is saved separately)
  useEffect(() => {
    if (!hydrated) return
    try {
      const { stage1: _snapshot, ...laterStages } = stageData
      localStorage.setItem("stageData", JSON.stringify(laterStages))
    } catch (e) {
      console.warn("Failed to save stage data:", e)
    }
  }, [stageData, hydrated])

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
        signal: AbortSignal.timeout(100_000),
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
      localStorage.setItem("currentStage", targetStage.toString())
    } catch (error) {
      console.error(`Failed to load stage ${targetStage}:`, error)
      setStageError(error instanceof Error && error.message ? error.message : "Couldn't load the next page. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // 🔥 STAGE 2: Load the Summary. The detailed marking, GitHub and Reddit run in parallel;
  // GitHub and Reddit use search terms the Snapshot already produced.
  const loadStage2Data = async () => {
    const fallbackQuery = analysis?.projectTitle || formData.idea.slice(0, 80)

    const summaryPromise: Promise<AnalysisData | null> = fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(100_000),
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

    const redditPromise: Promise<RedditResult> = fetch("/api/reddit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: analysis?.searchQueries?.reddit || fallbackQuery, idea: formData.idea }),
    })
      .then((r) => (r.ok ? r.json() : { status: "error", threads: [] }))
      .catch(() => ({ status: "error", threads: [] }))

    const [summary, reddit, repos] = await Promise.all([
      summaryPromise,
      redditPromise,
      fetchGitHubRepos(analysis?.searchQueries?.github || fallbackQuery),
    ])
    if (!summary) throw new Error("The summary couldn't be written this time. Please try again.")

    setStageData(prev => ({
      ...prev,
      stage2: {
        quickWins: summary.quickWins ?? [],
        existingSolutions: summary.existingSolutions ?? [],
        githubRepos: repos,
        reddit,
        analysis: summary,
      },
    }))
  }

  // The plan's two halves: the roadmap (milestones, team, process) and the tech plan.
  const splitPlan = (data: any) => ({
    stage3: {
      projectMilestones: data.projectMilestones,
      teamRoles: data.teamRoles,
      sdlcMapping: data.sdlcMapping,
      qaApproach: data.qaApproach,
    },
    stage4: {
      techRoadmap: data.techRoadmap,
      versionMilestones: data.versionMilestones,
      securityConsiderations: data.securityConsiderations,
      costEstimates: data.costEstimates,
    },
  })

  const fetchPlan = () =>
    fetchWithFallback(
      () => fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 3, analysis }),
      }),
      async () => ({
        projectMilestones: generateProjectMilestones(),
        teamRoles: generateTeamRoles(),
        sdlcMapping: generateSDLCMapping(),
        qaApproach: generateQAApproach(),
        techRoadmap: generateTechRoadmap(),
        versionMilestones: generateVersionMilestones(),
        securityConsiderations: generateSecurityConsiderations(),
        costEstimates: generateCostEstimates(),
      }),
      "Plan data"
    )

  // 🔥 STAGE 3: Load the plan (roadmap + tech plan in one request)
  const loadPlanData = async () => {
    const data = await fetchPlan()
    setStageData(prev => ({ ...prev, ...splitPlan(data) }))
  }

  // 🔥 STAGE 4: Load Hand-off Data
  const loadHandOffData = async () => {
    const handOffData = await fetchWithFallback(
      () => fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 4, analysis }),
      }),
      async () => ({
        jiraIntegration: false,
        shareableLink: generateShareableLink(),
        freelancerLinks: generateFreelancerLinks(),
        srsDocument: null,
      }),
      "Hand-off data"
    )
    setStageData(prev => ({ ...prev, stage5: handOffData }))
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

  const ContinueButton = ({ to, label, hint }: { to: AnalysisStage; label: string; hint?: string }) => (
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
    <form onSubmit={handleAnalyzeIdea}>
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
                <p className="mt-1 text-meta text-pencil">Optional. It changes how strictly the idea is marked.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="projectType" className="text-meta font-medium text-ink-soft">What is it for?</Label>
                <div className="relative">
                  <select
                    id="projectType"
                    className={selectClass}
                    value={formData.projectType}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectType: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    <option value="MVP">MVP</option>
                    <option value="Full Product">Full product</option>
                    <option value="Prototype">Prototype</option>
                    <option value="API/Service">API / service</option>
                    <option value="Mobile App">Mobile app</option>
                    <option value="Web App">Web app</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="domain" className="text-meta font-medium text-ink-soft">Domain</Label>
                <div className="relative">
                  <select
                    id="domain"
                    className={selectClass}
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    <option value="AI/ML">AI / machine learning</option>
                    <option value="FinTech">FinTech</option>
                    <option value="EdTech">EdTech</option>
                    <option value="HealthTech">HealthTech</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Social">Social</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Productivity">Productivity</option>
                    <option value="IoT">IoT</option>
                    <option value="Other">Other</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="experience" className="text-meta font-medium text-ink-soft">Your experience</Label>
                <div className="relative">
                  <select
                    id="experience"
                    className={selectClass}
                    value={formData.experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeline" className="text-meta font-medium text-ink-soft">Time you have</Label>
                <div className="relative">
                  <select
                    id="timeline"
                    className={selectClass}
                    value={formData.timeline}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    <option value="1-2 weeks">1–2 weeks</option>
                    <option value="1-2 months">1–2 months</option>
                    <option value="3-6 months">3–6 months</option>
                    <option value="6+ months">6+ months</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
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
    const reddit = stageData.stage2.reddit
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
            Pros and cons, the real risks, what people are saying, and what already exists.
          </p>
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
            !reddit || reddit.status === "not-configured" ? (
              <MarginNote mark={<Query />} title="Reddit not connected">Real threads appear here once Reddit is connected.</MarginNote>
            ) : reddit.status === "error" ? (
              <MarginNote mark={<Query />} title="Reddit unavailable">Couldn&apos;t reach Reddit this time.</MarginNote>
            ) : reddit.threads.length === 0 ? (
              <MarginNote mark={<Query />} title="No threads found">Nobody is discussing this problem on Reddit, or it is phrased differently there.</MarginNote>
            ) : (
              <MarginNote mark={<Query />} title={`${plural(reddit.threads.length, "thread")} on Reddit`}>
                {reddit.takeaway || "Read what people say before you decide."}
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

          <p className="label-caps mt-7">Top Reddit threads</p>
          {!reddit || reddit.status === "not-configured" ? (
            <EmptyLine>Reddit isn&apos;t connected yet, so no threads are shown.</EmptyLine>
          ) : reddit.status === "error" ? (
            <EmptyLine>Reddit couldn&apos;t be reached. Try again later.</EmptyLine>
          ) : reddit.threads.length === 0 ? (
            <EmptyLine>No Reddit threads found for this idea.</EmptyLine>
          ) : (
            <ol className="mt-2 divide-y divide-rule">
              {reddit.threads.map((t, i) => (
                <li key={i} className="py-4 first:pt-1 last:pb-0">
                  <LinkTitle href={t.url}>{t.title}</LinkTitle>
                  <p className="mt-0.5 text-meta text-pencil tabular">
                    r/{t.subreddit} · {t.score.toLocaleString()} upvotes · {t.numComments.toLocaleString()} comments
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
    const s2 = stageData.stage2?.analysis
    const scope = s2?.requirementsScope
    const stack = s2?.techStack
    const stackGroups = stack
      ? ([
          ["Frontend", stack.frontend],
          ["Backend", stack.backend],
          ["Database", stack.database],
          ["Tools", stack.tools],
        ] as const).filter(([, items]) => items && items.length > 0)
      : []

    return (
      <Sheet>
        <SheetRow marginFirstOnMobile margin={<MarginNote mark={<Tick />} title={`${stageData.stage3.projectMilestones.length} phases`}>Each phase starts when the one before it is done.</MarginNote>}>
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">The plan</h1>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink-soft">What to build first, how to build it, who you need, and what to build it with.</p>
        </SheetRow>

        {scope && (scope.mustHaveFeatures?.length || scope.niceToHaveFeatures?.length || scope.constraints?.length) ? (
          <SheetRow
            margin={
              (scope.mustHaveFeatures?.length || 0) > 5 ? (
                <MarginNote mark={<Query />} title={`${scope.mustHaveFeatures?.length} must-haves is a lot`}>
                  Cut to the five that prove the idea. The rest waits until users ask.
                </MarginNote>
              ) : (
                <MarginNote mark={<Tick />} title={`${plural(scope.mustHaveFeatures?.length || 0, "must-have")}`}>
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
                    {(items || []).map((item, i) => (
                      <li key={i} className="flex gap-2"><span className="text-pencil">–</span><span>{item}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SheetRow>
        ) : null}

        {stageData.stage3.projectMilestones.map((milestone, index) => (
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

        <SheetRow>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <SheetHeading level={3}>Way of working</SheetHeading>
              <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{stageData.stage3.sdlcMapping}</p>
            </div>
            <div>
              <SheetHeading level={3}>Testing and release</SheetHeading>
              <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink">{stageData.stage3.qaApproach}</p>
            </div>
          </div>
        </SheetRow>

        <SheetRow
          margin={
            <div>
              <p className="font-hand text-[1.6rem] font-bold leading-none text-marker tabular">{totalFte.toFixed(1)} FTE</p>
              <p className="mt-2 text-meta text-pencil">
                {totalFte > 2
                  ? "More than two people working full time. A student team will need to cut scope or stretch the timeline."
                  : "Full-time people in total. For a student team, treat this as share of effort."}
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

        {stackGroups.length > 0 ? (
          <SheetRow
            margin={(() => {
              const total = stackGroups.reduce((n, [, items]) => n + items.length, 0)
              return total > 10 ? (
                <MarginNote mark={<Query />} title={`${total} technologies`}>A lot to learn at once. Drop anything you haven&apos;t used before unless it is essential.</MarginNote>
              ) : (
                <MarginNote mark={<Tick />} title={`${total} technologies`}>A manageable stack to learn and build with.</MarginNote>
              )
            })()}
          >
            <SheetHeading>Suggested stack</SheetHeading>
            <dl className="grid gap-4 sm:grid-cols-2">
              {stackGroups.map(([label, items]) => (
                <div key={label}>
                  <dt className="label-caps">{label}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((t, i) => <Chip key={i}>{t}</Chip>)}
                  </dd>
                </div>
              ))}
            </dl>
          </SheetRow>
        ) : null}

        <SheetRow
          margin={(() => {
            const unproven = stageData.stage4.techRoadmap.filter((t) => t.trl < 7).length
            return unproven > 0 ? (
              <MarginNote mark={<Cross />} title={`${plural(unproven, "layer")} below 7`}>Budget time for research and a fallback.</MarginNote>
            ) : (
              <MarginNote mark={<Tick />} title="All proven">Every layer is established technology.</MarginNote>
            )
          })()}
        >
          <SheetHeading aside="Readiness 1–9: 9 is proven in production">Technology layers</SheetHeading>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-rule">
                  <th scope="col" className="label-caps py-2 pr-4 font-semibold">Layer</th>
                  <th scope="col" className="label-caps py-2 pr-4 font-semibold">Technologies</th>
                  <th scope="col" className="label-caps py-2 pr-4 font-semibold">When</th>
                  <th scope="col" className="label-caps py-2 text-right font-semibold">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {stageData.stage4.techRoadmap.map((item, index) => (
                  <tr key={index} className="border-b border-rule align-top last:border-b-0">
                    <td className="py-3 pr-4 font-semibold text-ink">{item.category}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.technologies.map((tech, idx) => <Chip key={idx}>{tech}</Chip>)}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-ink-soft">{item.timeline}</td>
                    <td className={cn("py-3 text-right font-mono text-sm tabular", item.trl < 7 ? "text-marker" : "text-ink")}>
                      {item.trl}/9
                    </td>
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

        <SheetRow
          margin={
            <div className="space-y-3">
              {stageData.stage4.costEstimates.map((c, i) => (
                <div key={i}>
                  <p className="text-meta text-pencil">{c.category}</p>
                  <p className="font-hand text-[1.4rem] font-bold leading-tight text-marker tabular">{c.total}</p>
                </div>
              ))}
            </div>
          }
        >
          <SheetHeading>Costs</SheetHeading>
          <div className="space-y-6">
            {stageData.stage4.costEstimates.map((category, index) => (
              <div key={index}>
                <p className="label-caps">{category.category}</p>
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
  const renderDeepResources = () => {
    if (!analysis || !stageData.stage5) return null

    return (
      <Sheet>
        <SheetRow marginFirstOnMobile margin={<MarginNote mark={<Tick />} title="All four pages marked">Export the report to show your supervisor or team.</MarginNote>}>
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">Take it further</h1>
        </SheetRow>

        <SheetRow
          margin={
            <Button onClick={exportToPDF} disabled={exportLoading} size="lg" className="h-11 w-full justify-between px-4">
              {exportLoading ? "Preparing report…" : "Export PDF report"}
              {exportLoading ? <Loader2 className="animate-spin" /> : <Download />}
            </Button>
          }
        >
          <SheetHeading>The report</SheetHeading>
          <p className="max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-soft">
            A printable copy of the evaluation. It opens in a new tab; use your browser&apos;s print dialog to save it as a PDF.
          </p>
        </SheetRow>

        <SheetRow>
          <SheetHeading>Find people to build it</SheetHeading>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            {stageData.stage5.freelancerLinks.map((link, index) => (
              <li key={index}>
                <LinkTitle href={link.url}>{link.platform}</LinkTitle>
                <p className="mt-1 text-sm text-ink-soft">{link.description}</p>
              </li>
            ))}
          </ul>
        </SheetRow>

        <SheetRow margin={<MarginNote title="Not available yet">These need saved reports and accounts, which are on the roadmap.</MarginNote>}>
          <SheetHeading>Coming later</SheetHeading>
          <ul className="divide-y divide-rule">
            {[
              { icon: LinkIcon, title: "Shareable report link", text: "A permanent link to this evaluation." },
              { icon: FileText, title: "Requirements document (SRS)", text: "An IEEE-style software requirements specification." },
              { icon: BarChart3, title: "Jira export", text: "Milestones and deliverables as Jira issues." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 text-pencil">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-medium text-ink-soft">{title}</p>
                  <p className="text-sm">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </SheetRow>
      </Sheet>
    )
  }

  const exportToPDF = async () => {
    if (!analysis) return

    setExportLoading(true)
    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          taskProgress,
          overallProgress: getOverallProgress(),
        }),
      })

      if (response.ok) {
        const html = await response.text()
        const blob = new Blob([html], { type: "text/html" })
        const url = window.URL.createObjectURL(blob)
        const printWindow = window.open(url, "_blank")
        if (!printWindow) {
          // Fallback if popup blocked
          alert("Please allow popups to export PDF, or use your browser's print function (Ctrl+P)")
        }
      } else {
        throw new Error("Export failed")
      }
    } catch (error) {
      console.error("PDF export failed:", error)
      alert("Failed to export PDF. Please try again.")
    } finally {
      setExportLoading(false)
    }
  }

  const handleTaskToggle = (taskId: string) => {
    const newProgress = { ...taskProgress, [taskId]: !taskProgress[taskId] }
    setTaskProgress(newProgress)
    localStorage.setItem("taskProgress", JSON.stringify(newProgress))
  }

  // 🔧 PROTECTED HELPER FUNCTIONS
  const getPhaseProgress = (phaseTasks: string[], phaseKey: string) => {
    if (!phaseTasks || phaseTasks.length === 0) return 0
    const completedTasks = phaseTasks.filter((_, index) => taskProgress[`${phaseKey}-${index}`]).length
    return (completedTasks / phaseTasks.length) * 100
  }

  const getOverallProgress = () => {
    if (!analysis || !analysis.roadmap) return 0
    
    const phase1Tasks = analysis.roadmap.phase1?.tasks || []
    const phase2Tasks = analysis.roadmap.phase2?.tasks || []
    const phase3Tasks = analysis.roadmap.phase3?.tasks || []
    
    const allTasks = [...phase1Tasks, ...phase2Tasks, ...phase3Tasks]
    
    if (allTasks.length === 0) return 0
    
    const completedTasks = allTasks.filter((_, globalIndex) => {
      const phase1Length = phase1Tasks.length
      const phase2Length = phase2Tasks.length

      if (globalIndex < phase1Length) {
        return taskProgress[`phase1-${globalIndex}`]
      } else if (globalIndex < phase1Length + phase2Length) {
        return taskProgress[`phase2-${globalIndex - phase1Length}`]
      } else {
        return taskProgress[`phase3-${globalIndex - phase1Length - phase2Length}`]
      }
    }).length
    
    return (completedTasks / allTasks.length) * 100
  }

  const getFeasibilityColor = (score: number) => {
    if (score >= 8) return "text-green-500"
    if (score >= 6) return "text-yellow-500"
    return "text-red-500"
  }

  const getFeasibilityBadge = (score: number) => {
    if (score >= 8) return { variant: "default" as const, text: "Highly Feasible" }
    if (score >= 6) return { variant: "secondary" as const, text: "Feasible" }
    return { variant: "destructive" as const, text: "Challenging" }
  }

  const getRealityCheckColor = (score: number) => {
    if (score >= 8) return "border-green-500 bg-green-500/10"
    if (score >= 6) return "border-yellow-500 bg-yellow-500/10"
    return "border-red-500 bg-red-500/10"
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

  // 🔥 STAGE DATA GENERATORS
  const generateProjectMilestones = (): ProjectMilestone[] => {
    const ideaText = formData.idea || analysis?.projectDescription || ""
    const isApp = ideaText.toLowerCase().includes('app') || ideaText.toLowerCase().includes('mobile')
    const isWeb = ideaText.toLowerCase().includes('web') || ideaText.toLowerCase().includes('website')
    const isAI = ideaText.toLowerCase().includes('ai') || ideaText.toLowerCase().includes('machine learning')
    
    const baseDeliverables = {
      initiation: ["Project charter", "Stakeholder analysis", "Initial requirements", "Market research"],
      planning: ["Detailed requirements", "Technical architecture", "UI/UX design", "Development plan"],
      execution: ["MVP development", "Core features", "Testing & QA", "Beta user feedback"],
      launch: ["Production deployment", "User onboarding", "Marketing launch", "Performance monitoring"]
    }

    // Customize deliverables based on project type
    if (isApp) {
      baseDeliverables.planning.push("Mobile app wireframes", "App store requirements")
      baseDeliverables.execution.push("App store submission", "Device testing")
    }
    
    if (isWeb) {
      baseDeliverables.planning.push("Web hosting setup", "SEO strategy")
      baseDeliverables.execution.push("Responsive design", "Browser compatibility testing")
    }
    
    if (isAI) {
      baseDeliverables.planning.push("Data collection strategy", "Model architecture design")
      baseDeliverables.execution.push("Model training", "Performance optimization")
    }

    return [
      {
        phase: "Project Initiation",
        deliverables: baseDeliverables.initiation,
        duration: "1-2 weeks",
        dependencies: []
      },
      {
        phase: "Planning & Design",
        deliverables: baseDeliverables.planning,
        duration: "2-4 weeks",
        dependencies: ["Project Initiation"]
      },
      {
        phase: "Development & Testing",
        deliverables: baseDeliverables.execution,
        duration: "6-10 weeks",
        dependencies: ["Planning & Design"]
      },
      {
        phase: "Launch & Deployment",
        deliverables: baseDeliverables.launch,
        duration: "1-2 weeks",
        dependencies: ["Development & Testing"]
      }
    ]
  }

  const generateTeamRoles = (): TeamRole[] => {
    const ideaText = formData.idea || analysis?.projectDescription || ""
    const isApp = ideaText.toLowerCase().includes('app') || ideaText.toLowerCase().includes('mobile')
    const isWeb = ideaText.toLowerCase().includes('web') || ideaText.toLowerCase().includes('website')
    const isAI = ideaText.toLowerCase().includes('ai') || ideaText.toLowerCase().includes('machine learning')
    const isEcommerce = ideaText.toLowerCase().includes('ecommerce') || ideaText.toLowerCase().includes('marketplace') || ideaText.toLowerCase().includes('shop')
    
    const baseRoles = [
      {
        role: "Project Manager",
        fteEstimate: 0.5,
        skills: ["Agile", "Stakeholder management", "Risk assessment"],
        description: "Oversees project timeline, coordinates team, manages stakeholders"
      },
      {
        role: "Frontend Developer",
        fteEstimate: 1,
        skills: ["React", "TypeScript", "CSS", "Responsive design"],
        description: "Responsible for user interface and user experience development"
      },
      {
        role: "Backend Developer",
        fteEstimate: 1,
        skills: ["Node.js", "Database design", "API development", "Security"],
        description: "Handles server-side logic, database, and API development"
      },
      {
        role: "UI/UX Designer",
        fteEstimate: 0.5,
        skills: ["Figma", "User research", "Prototyping", "Design systems"],
        description: "Creates user-centered designs and ensures optimal user experience"
      }
    ]

    // Add specialized roles based on project type
    if (isApp) {
      baseRoles.push({
        role: "Mobile Developer",
        fteEstimate: 1,
        skills: ["React Native", "iOS/Android", "App Store deployment"],
        description: "Specializes in mobile app development and platform-specific features"
      })
    }
    
    if (isAI) {
      baseRoles.push({
        role: "ML Engineer",
        fteEstimate: 1,
        skills: ["Python", "TensorFlow", "Data preprocessing", "Model optimization"],
        description: "Develops and optimizes machine learning models and algorithms"
      })
    }
    
    if (isEcommerce) {
      baseRoles.push({
        role: "E-commerce Specialist",
        fteEstimate: 0.5,
        skills: ["Payment integration", "Inventory management", "Analytics"],
        description: "Handles e-commerce specific features and business logic"
      })
    }

    // Always add QA role for larger projects
    baseRoles.push({
      role: "QA Engineer",
      fteEstimate: 0.5,
      skills: ["Test automation", "Manual testing", "Bug tracking", "Performance testing"],
      description: "Ensures product quality through comprehensive testing strategies"
    })

    return baseRoles
  }

  const generateSDLCMapping = (): string => {
    const ideaText = formData.idea || analysis?.projectDescription || ""
    const isComplex = ideaText.toLowerCase().includes('ai') || ideaText.toLowerCase().includes('enterprise') || ideaText.toLowerCase().includes('large scale')
    const isStartup = ideaText.toLowerCase().includes('startup') || ideaText.toLowerCase().includes('mvp') || ideaText.toLowerCase().includes('prototype')
    
    if (isComplex) {
      return "Hybrid Agile-Waterfall approach with 3-week sprints, detailed documentation requirements, comprehensive testing phases, and milestone-based reviews for complex system integration"
    }
    
    if (isStartup) {
      return "Lean Startup methodology with rapid prototyping, 1-week sprints, continuous user feedback, pivot-ready architecture, and MVP-focused development cycles"
    }
    
    return "Agile Scrum methodology with 2-week sprints, daily standups, sprint retrospectives, continuous integration, and regular stakeholder demonstrations"
  }

  const generateQAApproach = (): string => {
    const ideaText = formData.idea || analysis?.projectDescription || ""
    const isApp = ideaText.toLowerCase().includes('app') || ideaText.toLowerCase().includes('mobile')
    const isAI = ideaText.toLowerCase().includes('ai') || ideaText.toLowerCase().includes('machine learning')
    const isEcommerce = ideaText.toLowerCase().includes('ecommerce') || ideaText.toLowerCase().includes('payment')
    
    let qaApproach = "Comprehensive testing strategy including:\n"
    
    qaApproach += "• Unit testing with Jest/Vitest for component-level validation\n"
    qaApproach += "• Integration testing for API and database interactions\n"
    qaApproach += "• End-to-end testing with Playwright/Cypress for user workflows\n"
    
    if (isApp) {
      qaApproach += "• Mobile device testing across iOS and Android platforms\n"
      qaApproach += "• App store validation and submission testing\n"
    }
    
    if (isAI) {
      qaApproach += "• Model accuracy validation and performance benchmarking\n"
      qaApproach += "• Data quality testing and bias detection\n"
    }
    
    if (isEcommerce) {
      qaApproach += "• Payment gateway testing and security validation\n"
      qaApproach += "• Load testing for high-traffic scenarios\n"
    }
    
    qaApproach += "• Security testing and vulnerability assessments\n"
    qaApproach += "• Performance testing and optimization\n"
    qaApproach += "• User acceptance testing with beta user group\n"
    qaApproach += "• Staged deployment with blue-green deployment strategy"
    
    return qaApproach
  }

  const generateTechRoadmap = (): TechRoadmapItem[] => {
    return [
      {
        category: "Infrastructure",
        technologies: ["AWS/Vercel", "Docker", "CI/CD"],
        timeline: "Week 1-2",
        trl: 8
      },
      {
        category: "Dev Stack",
        technologies: ["React", "Node.js", "PostgreSQL"],
        timeline: "Week 2-6",
        trl: 9
      }
    ]
  }

  const generateVersionMilestones = (): VersionMilestone[] => {
    return [
      {
        version: "v0.1 (MVP)",
        features: ["Core functionality", "Basic UI", "User authentication"],
        timeline: "Month 1-2",
        description: "Minimum viable product for initial testing"
      },
      {
        version: "v1.0 (Launch)",
        features: ["Full feature set", "Polished UI", "Performance optimization"],
        timeline: "Month 3-4",
        description: "Production-ready version"
      }
    ]
  }

  const generateSecurityConsiderations = (): SecurityConsideration[] => {
    return [
      {
        area: "Authentication",
        requirements: ["JWT tokens", "Password hashing", "Session management"],
        compliance: ["GDPR", "Data encryption"]
      }
    ]
  }

  const generateCostEstimates = (): CostEstimate[] => {
    return [
      {
        category: "Development",
        items: [
          { name: "Developer salaries", cost: "$8,000-12,000/month", justification: "2 developers for 3-4 months" },
          { name: "Design tools", cost: "$100-200/month", justification: "Figma Pro, Adobe Creative Suite" }
        ],
        total: "$25,000-50,000"
      },
      {
        category: "Infrastructure",
        items: [
          { name: "Cloud hosting", cost: "$50-200/month", justification: "AWS/Vercel for hosting and storage" },
          { name: "Third-party APIs", cost: "$100-500/month", justification: "Payment processing, analytics" }
        ],
        total: "$600-2,400/year"
      }
    ]
  }

  const generateShareableLink = (): string => {
    const reportId = Math.random().toString(36).substring(2, 15)
    return `${window.location.origin}/shared-report/${reportId}`
  }

  const generateFreelancerLinks = () => {
    if (!analysis) return []
    const domain = analysis.detectedDomain.toLowerCase()
    return [
      {
        platform: "Fiverr",
        url: `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(domain)}%20development`,
        description: `Find ${domain} experts on Fiverr`
      },
      {
        platform: "Upwork",
        url: `https://www.upwork.com/freelance-jobs/${domain.replace(/\s+/g, '-')}/`,
        description: `Browse ${domain} freelancers on Upwork`
      },
      {
        platform: "Freelancer.com",
        url: `https://www.freelancer.com/jobs/${domain.replace(/\s+/g, '-')}/`,
        description: `Hire ${domain} developers on Freelancer`
      }
    ]
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
      localStorage.setItem("currentStage", n.toString())
    } else if (n === currentStage + 1) {
      proceedToStage(n as AnalysisStage)
    }
  }

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
  const canEditIdea = currentStage === AnalysisStage.QUICK_SNAPSHOT

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

      <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 sm:py-10">
        <div key={`${currentStage}-${analyzing}`} className="animate-ink-in">
          {analyzing ? renderMarking() : (renderStageContent() ?? renderMissingStage())}
        </div>
      </main>
    </div>
  )
}
