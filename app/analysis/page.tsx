"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SelectionTooltip } from "@/components/SelectionTooltip"
import { useAIAssistant } from "@/contexts/AIAssistantContext"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Code,
  Calendar,
  Download,
  Loader2,
  RefreshCw,
  Zap,
  Edit3,
  TrendingUp,
  ArrowRight,
  MessageCircle,
  Play,
  Unlock,
  Shield,
  Clock,
  Users,
  Target,
  FileText,
  ExternalLink,
  Star,
  GitBranch,
  BarChart3,
  MapPin,
  DollarSign,
  Link as LinkIcon,
  Briefcase,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeToggle"
import { AIAssistantChat } from "@/components/AIAssistantChat"

// 🚀 STAGE DEFINITIONS
enum AnalysisStage {
  INPUT = 0,
  QUICK_SNAPSHOT = 1,
  EXECUTIVE_SUMMARY = 2,
  ROADMAPS = 3,
  TECH_ROADMAP = 4,
  DEEP_RESOURCES = 5
}

// ✨ Shimmer loader for "Analyzing..." state
function ShimmerLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
      <div className="h-6 bg-muted rounded w-2/3 mx-auto" />
      <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
      <div className="h-32 bg-muted rounded" />
    </div>
  )
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
  estimatedTimeline: string
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
interface ExpertArticle {
  title: string
  url: string
  source: string
  summary: string
}

interface ExistingSolution {
  name: string
  url: string
  description: string
  category: string
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

// Typing Effect Component for Reality Check
interface TypingTextProps {
  text: string
  speed?: number
  className?: string
}

function TypingText({ text, speed = 30, className = "" }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setDisplayedText("")
    setIsComplete(false)
    
    let index = 0
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsComplete(true)
        clearInterval(timer)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed])

  return (
    <div className={className}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2">
              <span className="text-current mt-2 w-1 h-1 rounded-full bg-current flex-shrink-0"></span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>
    </div>
  )
}

export default function AnalysisPage() {
  // 🚀 STAGED ANALYSIS STATE
  const [currentStage, setCurrentStage] = useState<AnalysisStage>(AnalysisStage.INPUT)
  const [stageData, setStageData] = useState<{
    stage1?: AnalysisData
    stage2?: {
      quickWins: QuickWin[]
      expertArticles: ExpertArticle[]
      existingSolutions: ExistingSolution[]
      githubRepos: GitHubRepo[]
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
  const [showRefinementTools, setShowRefinementTools] = useState(false)
  const [refinementLoading, setRefinementLoading] = useState(false)
  const [refinementSuggestions, setRefinementSuggestions] = useState<string[]>([])
  const [exportLoading, setExportLoading] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [githubLoading, setGithubLoading] = useState(false)
  const [projectModifications, setProjectModifications] = useState({
    title: "",
    description: "",
  })
  const { setProjectContext, openAssistant } = useAIAssistant()

  // Simplified form data - only idea description needed
  const [formData, setFormData] = useState({
    idea: ""
  })
  const [analyzing, setAnalyzing] = useState(false)

  // 🚀 LOCAL STORAGE HYDRATION — restore progress after page refresh
  useEffect(() => {
    try {
      const savedStage = localStorage.getItem("currentStage")
      if (savedStage !== null) {
        const stageNum = parseInt(savedStage, 10) as AnalysisStage
        if (stageNum >= AnalysisStage.QUICK_SNAPSHOT) {
          setCurrentStage(stageNum)
        }
      }
      const savedAnalysis = localStorage.getItem("projectAnalysis")
      if (savedAnalysis) {
        const parsed = JSON.parse(savedAnalysis) as AnalysisData
        setAnalysis(parsed)
      }
      const savedProgress = localStorage.getItem("taskProgress")
      if (savedProgress) {
        setTaskProgress(JSON.parse(savedProgress))
      }
    } catch (e) {
      console.warn("Failed to restore from localStorage:", e)
    }
  }, [])

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

  // 🚀 STAGE 1: QUICK SNAPSHOT
  const handleAnalyzeIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!formData.idea.trim()) return

    setAnalyzing(true)
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: formData.idea, stage: 'stage1' }),
      })

      if (response.ok) {
        const rawAnalysisData = await response.json()
        
        // 🔧 Apply validation and fallbacks
        const validatedAnalysisData = validateAnalysisData(rawAnalysisData)
        
        const enhancedAnalysis = {
          ...validatedAnalysisData,
          projectTitle: `Project: ${formData.idea.substring(0, 50)}${formData.idea.length > 50 ? "..." : ""}`,
          projectDescription: formData.idea,
        }

        setAnalysis(enhancedAnalysis)
        setStageData(prev => ({ ...prev, stage1: enhancedAnalysis }))
        localStorage.setItem("projectAnalysis", JSON.stringify(enhancedAnalysis))
        localStorage.setItem("currentStage", AnalysisStage.QUICK_SNAPSHOT.toString())
        
        // Update AI Assistant context
        setProjectContext(`${enhancedAnalysis.projectTitle}: ${enhancedAnalysis.projectDescription}`)
        
        setProjectModifications({
          title: enhancedAnalysis.projectTitle || "",
          description: enhancedAnalysis.projectDescription || "",
        })
        
        // Move to Stage 1
        setCurrentStage(AnalysisStage.QUICK_SNAPSHOT)
      } else {
        const errorText = await response.text()
        alert(`Failed to generate analysis. Status: ${response.status}`)
      }
    } catch (error) {
      console.error("[Analysis] Error:", error)
      alert(`Network error occurred: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // 🚀 STAGE PROGRESSION FUNCTIONS
  const proceedToStage = async (targetStage: AnalysisStage) => {
    if (!analysis) return

    setLoading(true)
    try {
      switch (targetStage) {
        case AnalysisStage.EXECUTIVE_SUMMARY:
          await loadStage2Data()
          break
        case AnalysisStage.ROADMAPS:
          await loadStage3Data()
          break
        case AnalysisStage.TECH_ROADMAP:
          await loadStage4Data()
          break
        case AnalysisStage.DEEP_RESOURCES:
          await loadStage5Data()
          break
      }
      setCurrentStage(targetStage)
      localStorage.setItem("currentStage", targetStage.toString())
    } catch (error) {
      console.error(`Failed to load stage ${targetStage}:`, error)
      alert("Failed to load next stage. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // 🔥 STAGE 2: Load Executive Summary Data
  const loadStage2Data = async () => {
    try {
      // 🚀 Get Stage 2 Analysis Data  
      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: formData.idea, stage: 'stage2' }),
      })

      let stage2Analysis = null
      if (analysisResponse.ok) {
        stage2Analysis = await analysisResponse.json()
      }

      // 🚀 Get Stage 2 Content Data
      const response = await fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 2, analysis, idea: formData.idea }),
      })

      if (response.ok) {
        const data = await response.json()
        const repos = await fetchGitHubRepos(analysis?.projectTitle || formData.idea)
        
        setStageData(prev => ({
          ...prev,
          stage2: { 
            ...data, 
            githubRepos: repos,
            analysis: stage2Analysis // Add stage2-specific analysis
          }
        }))
      } else {
        // Fallback to local generation
        const [quickWins, expertArticles, existingSolutions, repos] = await Promise.all([
          generateQuickWins(),
          fetchExpertArticles(),
          fetchExistingSolutions(),
          fetchGitHubRepos(analysis?.projectTitle || formData.idea)
        ])

        setStageData(prev => ({
          ...prev,
          stage2: { 
            quickWins, 
            expertArticles, 
            existingSolutions, 
            githubRepos: repos,
            analysis: stage2Analysis // Add stage2-specific analysis even in fallback
          }
        }))
      }
    } catch (error) {
      console.error("Failed to load Stage 2 data:", error)
      // Fallback to local generation
      const [quickWins, expertArticles, existingSolutions, repos] = await Promise.all([
        generateQuickWins(),
        fetchExpertArticles(),
        fetchExistingSolutions(),
        fetchGitHubRepos(analysis?.projectTitle || formData.idea)
      ])

      setStageData(prev => ({
        ...prev,
        stage2: { quickWins, expertArticles, existingSolutions, githubRepos: repos }
      }))
    }
  }

  // � REGENERATE FUNCTIONS
  const regenerateStage1 = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: formData.idea, stage: 'stage1' }),
      })

      if (response.ok) {
        const rawAnalysisData = await response.json()

        const validatedAnalysisData = validateAnalysisData(rawAnalysisData)
        const enhancedAnalysis = {
          ...validatedAnalysisData,
          projectTitle: `Project: ${formData.idea.substring(0, 50)}${formData.idea.length > 50 ? "..." : ""}`,
          projectDescription: formData.idea,
        }

        setAnalysis(enhancedAnalysis)
        setStageData(prev => ({ ...prev, stage1: enhancedAnalysis }))
      } else {
        throw new Error('Failed to regenerate Stage 1')
      }
    } catch (error) {
      console.error("[Regenerate] Stage 1 regeneration failed:", error)
      alert("Failed to regenerate Stage 1. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const regenerateStage2 = async () => {
    setLoading(true)
    try {
      // Regenerate Stage 2 Analysis
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: formData.idea, stage: 'stage2' }),
      })

      let stage2Analysis = null
      if (analysisResponse.ok) {
        stage2Analysis = await analysisResponse.json()
      }

      // Regenerate Stage 2 Content
      const [quickWins, expertArticles, existingSolutions, repos] = await Promise.all([
        generateQuickWins(),
        fetchExpertArticles(),
        fetchExistingSolutions(),
        fetchGitHubRepos(analysis?.projectTitle || formData.idea)
      ])

      setStageData(prev => ({
        ...prev,
        stage2: { 
          quickWins, 
          expertArticles, 
          existingSolutions, 
          githubRepos: repos,
          analysis: stage2Analysis
        }
      }))
    } catch (error) {
      console.error("[Regenerate] Stage 2 regeneration failed:", error)
      alert("Failed to regenerate Stage 2. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const regenerateStage3 = async () => {
    setLoading(true)
    try {
      // Regenerate Stage 3 Data
      const projectMilestones = generateProjectMilestones()
      const teamRoles = generateTeamRoles()
      const sdlcMapping = generateSDLCMapping()
      const qaApproach = generateQAApproach()

      setStageData(prev => ({
        ...prev,
        stage3: { projectMilestones, teamRoles, sdlcMapping, qaApproach }
      }))
    } catch (error) {
      console.error("[Regenerate] Stage 3 regeneration failed:", error)
      alert("Failed to regenerate Stage 3. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // �🔥 STAGE 3: Load Roadmaps Data
  const loadStage3Data = async () => {
    try {
      const response = await fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 3, analysis }),
      })

      if (response.ok) {
        const data = await response.json()
        setStageData(prev => ({ ...prev, stage3: data }))
      } else {
        // Fallback to local generation
        const projectMilestones = generateProjectMilestones()
        const teamRoles = generateTeamRoles()
        const sdlcMapping = generateSDLCMapping()
        const qaApproach = generateQAApproach()

        setStageData(prev => ({
          ...prev,
          stage3: { projectMilestones, teamRoles, sdlcMapping, qaApproach }
        }))
      }
    } catch (error) {
      console.error("Failed to load Stage 3 data:", error)
      // Fallback to local generation
      const projectMilestones = generateProjectMilestones()
      const teamRoles = generateTeamRoles()
      const sdlcMapping = generateSDLCMapping()
      const qaApproach = generateQAApproach()

      setStageData(prev => ({
        ...prev,
        stage3: { projectMilestones, teamRoles, sdlcMapping, qaApproach }
      }))
    }
  }

  // 🔥 STAGE 4: Load Technology Roadmap Data
  const loadStage4Data = async () => {
    try {
      const response = await fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 4, analysis }),
      })

      if (response.ok) {
        const data = await response.json()
        setStageData(prev => ({ ...prev, stage4: data }))
      } else {
        // Fallback to local generation
        const techRoadmap = generateTechRoadmap()
        const versionMilestones = generateVersionMilestones()
        const securityConsiderations = generateSecurityConsiderations()
        const costEstimates = generateCostEstimates()

        setStageData(prev => ({
          ...prev,
          stage4: { techRoadmap, versionMilestones, securityConsiderations, costEstimates }
        }))
      }
    } catch (error) {
      console.error("Failed to load Stage 4 data:", error)
      // Fallback to local generation
      const techRoadmap = generateTechRoadmap()
      const versionMilestones = generateVersionMilestones()
      const securityConsiderations = generateSecurityConsiderations()
      const costEstimates = generateCostEstimates()

      setStageData(prev => ({
        ...prev,
        stage4: { techRoadmap, versionMilestones, securityConsiderations, costEstimates }
      }))
    }
  }

  // 🔥 STAGE 5: Load Deep Resources Data  
  const loadStage5Data = async () => {
    try {
      const response = await fetch("/api/stage-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: 5, analysis }),
      })

      if (response.ok) {
        const data = await response.json()
        setStageData(prev => ({ ...prev, stage5: data }))
      } else {
        // Fallback to local generation
        const jiraIntegration = false
        const shareableLink = generateShareableLink()
        const freelancerLinks = generateFreelancerLinks()
        const srsDocument = null

        setStageData(prev => ({
          ...prev,
          stage5: { jiraIntegration, shareableLink, freelancerLinks, srsDocument }
        }))
      }
    } catch (error) {
      console.error("Failed to load Stage 5 data:", error)
      // Fallback to local generation
      const jiraIntegration = false
      const shareableLink = generateShareableLink()
      const freelancerLinks = generateFreelancerLinks()
      const srsDocument = null

      setStageData(prev => ({
        ...prev,
        stage5: { jiraIntegration, shareableLink, freelancerLinks, srsDocument }
      }))
    }
  }

  // 🎨 STAGE RENDERING COMPONENTS
  const renderStageContent = () => {
    switch (currentStage) {
      case AnalysisStage.INPUT:
        return renderInputStage()
      case AnalysisStage.QUICK_SNAPSHOT:
        return renderQuickSnapshot()
      case AnalysisStage.EXECUTIVE_SUMMARY:
        return renderExecutiveSummary()
      case AnalysisStage.ROADMAPS:
        return renderRoadmaps()
      case AnalysisStage.TECH_ROADMAP:
        return renderTechRoadmap()
      case AnalysisStage.DEEP_RESOURCES:
        return renderDeepResources()
      default:
        return renderInputStage()
    }
  }

  const renderInputStage = () => (
    <Card className="shadow-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">Analyze Your Project Idea</CardTitle>
        <CardDescription>
          Describe your project concept - our AI will provide progressive analysis across 5 detailed stages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAnalyzeIdea} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-idea">Project Idea</Label>
            <Textarea
              id="project-idea"
              placeholder="Describe your project idea in detail... (e.g., A mobile app that helps students find study groups with location-based matching and real-time chat features)"
              className="min-h-32 text-base"
              value={formData.idea}
              onChange={(e) => setFormData(prev => ({ ...prev, idea: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: Be specific about features, target users, and technical requirements for better analysis
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-lg py-6"
            disabled={!formData.idea.trim() || analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                Analyzing Your Idea...
              </>
            ) : (
              <>
                Get an Overview
                <Play className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )

  const renderQuickSnapshot = () => {
    if (!analysis) return null

    return (
      <div className="space-y-16">
        {/* Centered Header with Edit Button */}
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>
          <div className="text-center">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
              <Zap className="w-8 h-8 text-blue-500" />
              IS IT WORTH IT?
            </h1>
          </div>
          <div className="flex-1 flex justify-end items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousStage}>
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goBackToInput}
              className="flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Prompt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateStage1}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
          </div>
        </div>

        {/* Main Layout: Left Elements + Right Reality Check */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEFT SIDE - All elements as in wireframe */}
          <div className="space-y-8">
            
            {/* Project Details */}
            <div className="space-y-6">
              {/* Centered Project Title */}
              <div className="text-center">
                <h3 className="text-3xl font-bold">{analysis.projectTitle}</h3>
              </div>
              
              {/* Category and Targeted Audience - Side by side */}
              {(() => {
                const { category, tags } = analysis ? generateCategoryAndTags(analysis.projectDescription || "", analysis.projectTitle || "") : { category: "Tech", tags: [] }
                return (
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold mb-1">Category:</span>
                      <span className="text-lg text-muted-foreground">{category}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-lg font-semibold mb-1">Targeted Audience:</span>
                      <span className="text-lg text-muted-foreground">
                        {analysis.targetUsersMarketFit?.primaryUsers || "General users"}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>



            {/* Three Metric Boxes - Matching wireframe layout */}
            <div className="space-y-6">
              {/* Top row - 2 boxes */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg text-center bg-card">
                  <div className={`text-4xl font-bold mb-2 ${getFeasibilityColor(analysis.feasibilityScore)}`}>
                    {analysis.feasibilityScore}/10
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Feasibility Score</p>
                </div>
                
                <div className="p-6 border rounded-lg text-center bg-card">
                  <div className="text-4xl font-bold text-green-500 mb-2">{analysis.successProbability}%</div>
                  <p className="text-sm font-semibold text-muted-foreground">Success Probability</p>
                </div>
              </div>
              
              {/* Bottom row - 1 box centered */}
              <div className="flex justify-center">
                <div className="p-6 border rounded-lg text-center bg-card w-64">
                  <div className="text-4xl font-bold text-purple-500 mb-2">{analysis.difficultyLevel}</div>
                  <p className="text-sm font-semibold text-muted-foreground">Difficulty Level</p>
                </div>
              </div>
            </div>
          </div>

          {/* Honest Reality Check */}
          <div className="flex items-center justify-center">
            <div className={`p-8 rounded-xl w-full min-h-[500px] flex flex-col ${getRealityCheckColor(analysis.feasibilityScore)}`}>
              <div className="space-y-6 h-full">
                <h4 className="font-bold text-xl flex items-center justify-center gap-2">
                  <Shield className="w-6 h-6" />
                  Honest Reality Check
                </h4>
                
                <div className="flex-1 flex flex-col justify-center max-w-md mx-auto space-y-4">
                  <TypingText 
                    text={analysis.honestRealityCheck || analysis.honestAiFeedback}
                    speed={25}
                    className="text-sm text-left"
                  />
                  
                  {/* AI Verdict within Honest Reality Check */}
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <h5 className="font-semibold text-sm mb-2 text-white/90">AI Verdict:</h5>
                    <TypingText 
                      text={analysis.aiVerdict || generateAIVerdict(analysis.feasibilityScore, analysis.successProbability, analysis.difficultyLevel)}
                      speed={25}
                      className="text-sm text-left"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center pt-8 border-t-2 border-dashed">
          <Button
            size="lg"
            onClick={() => proceedToStage(AnalysisStage.EXECUTIVE_SUMMARY)}
            disabled={loading}
            className="text-xl px-12 py-6 h-auto"
          >
            {loading ? (
              <Loader2 className="mr-3 w-6 h-6 animate-spin" />
            ) : (
              <Unlock className="mr-3 w-6 h-6" />
            )}
            Still Convinced? Proceed
          </Button>
        </div>
      </div>
    )
  }

  const renderExecutiveSummary = () => {
    if (!analysis || !stageData.stage2) return null

    return (
      <div className="space-y-6">
        {/* Stage 2:Summary */}
        <Card className="bg-green-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="w-6 h-6 text-green-500" />
                  Elaborated Summary.
                </CardTitle>
                <CardDescription>
                  strategic overview
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousStage}>
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goBackToInput}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateStage2}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Honest Feedback */}
            <div className="border-l-4 border-red-500 pl-4 bg-red-500/5 p-4 rounded-r-lg">
              <h4 className="font-bold text-red-600 mb-3">Honest Feedback</h4>
              <div className="text-sm space-y-3">
                <TypingText
                  text={sanitizeMarkdown(stageData.stage2?.analysis?.honestAiFeedback || analysis?.honestAiFeedback || "Analysis feedback not available")}
                  speed={15}
                  className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-red-600 prose-strong:text-red-700 prose-li:text-gray-700 dark:prose-li:text-gray-300"
                />
              </div>
            </div>

            {/* Key Strengths and Challenges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-green-500 pl-4 bg-green-500/5 p-4 rounded-r-lg">
                <h4 className="font-bold text-green-600 mb-3">Key Strengths</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <div>
                      <strong>Value Proposition:</strong> {stageData.stage2?.analysis?.keyStrengths?.valueProposition || analysis?.keyStrengths?.valueProposition || "Value proposition assessment needed"}
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <div>
                      <strong>Market Fit:</strong> {stageData.stage2?.analysis?.keyStrengths?.marketFit || analysis?.keyStrengths?.marketFit || "Market fit analysis needed"}
                    </div>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4 bg-yellow-500/5 p-4 rounded-r-lg">
                <h4 className="font-bold text-yellow-600 mb-3">Potential Challenges</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 font-bold">⚠</span>
                    <div>
                      <strong>Technical:</strong> {stageData.stage2?.analysis?.potentialChallenges?.technicalRisks || analysis?.potentialChallenges?.technicalRisks || "Technical risk assessment needed"}
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 font-bold">⚠</span>
                    <div>
                      <strong>Usability:</strong> {stageData.stage2?.analysis?.potentialChallenges?.usabilityIssues || analysis?.potentialChallenges?.usabilityIssues || "Usability review needed"}
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Target Users & Quick Wins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/30">
                <h4 className="font-bold text-purple-600 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Target Users & Market
                </h4>
                <p className="text-sm mb-2"><strong>Primary Users:</strong> {stageData.stage1?.targetUsersMarketFit?.primaryUsers || analysis?.targetUsersMarketFit?.primaryUsers || "User analysis needed"}</p>
                    <p className="text-sm"><strong>Market Demand:</strong> {
                  stageData.stage1?.targetUsersMarketFit?.marketDemand ||
                  analysis?.targetUsersMarketFit?.marketDemand ||
                  (stageData.stage1?.detectedDomain ? `Growing demand in ${stageData.stage1.detectedDomain} sector` :
                   analysis?.detectedDomain ? `Growing demand in ${analysis.detectedDomain} sector` :
                   "Market demand assessment needed")
                }</p>
              </div>

              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                <h4 className="font-bold text-blue-600 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Quick Wins
                </h4>
                {stageData.stage2.quickWins.map((win, index) => (
                  <div key={index} className="mb-2 text-sm">
                    <strong>{win.title}:</strong> {win.description} ({win.timeEstimate})
                  </div>
                ))}
              </div>
            </div>

            {/* Expert Articles */}
            <div className="bg-slate-500/10 p-4 rounded-lg border border-slate-500/30">
              <h4 className="font-bold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                What Experts Say?
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageData.stage2.expertArticles.map((article, index) => (
                  <div key={index} className="border rounded p-3 bg-card">
                    <h5 className="font-semibold text-sm mb-1">
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {article.title}
                      </a>
                    </h5>
                    <p className="text-xs text-muted-foreground mb-1">{article.source}</p>
                    <p className="text-xs">{article.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Existing Solutions */}
            <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/30">
              <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Popular Existing Solutions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageData.stage2.existingSolutions.map((solution, index) => (
                  <div key={index} className="border rounded p-3 bg-card">
                    <h5 className="font-semibold text-sm mb-1">
                      <a href={solution.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {solution.name}
                      </a>
                    </h5>
                    <Badge variant="outline" className="text-xs mb-2">{solution.category}</Badge>
                    <p className="text-xs">{solution.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* GitHub Repositories */}
            <div className="bg-gray-500/10 p-4 rounded-lg border border-gray-500/30">
              <h4 className="font-bold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Similar GitHub Projects
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageData.stage2.githubRepos.slice(0, 4).map((repo, index) => (
                  <div key={index} className="border rounded p-3 bg-card">
                    <h5 className="font-semibold text-sm mb-1">
                      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {repo.owner}/{repo.name}
                      </a>
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant="outline">{repo.language}</Badge>
                      <span>⭐ {repo.stars.toLocaleString()}</span>
                    </div>
                    <p className="text-xs">{repo.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-4">
              <Button
                size="lg"
                onClick={() => proceedToStage(AnalysisStage.ROADMAPS)}
                disabled={loading}
                className="text-lg px-8 py-4"
              >
                {loading ? (
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 w-5 h-5" />
                )}
                Still Interested? Proceed to Roadmaps
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderRoadmaps = () => {
    if (!analysis || !stageData.stage3) return null

    return (
      <div className="space-y-6">
        {/* Stage 3: Roadmaps */}
        <Card className="bg-yellow-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-yellow-500" />
                  Stage 3: Project Roadmap + SDLC Summary
                </CardTitle>
                <CardDescription>
                  Execution plan and development flow tied to SDLC methodology
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousStage}>
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goBackToInput}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateStage3}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Milestones */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Project Roadmap
              </h4>
              {stageData.stage3.projectMilestones.map((milestone, index) => (
                <div key={index} className="border-l-4 border-yellow-500 pl-4 bg-yellow-500/10 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-yellow-600 dark:text-yellow-400">{milestone.phase}</h5>
                    <Badge variant="outline">{milestone.duration}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <strong className="text-sm">Deliverables:</strong>
                      <ul className="text-sm mt-1">
                        {milestone.deliverables.map((deliverable, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-yellow-500">•</span>
                            {deliverable}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {milestone.dependencies.length > 0 && (
                      <div>
                        <strong className="text-sm">Dependencies:</strong>
                        <span className="text-sm ml-2">{milestone.dependencies.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* SDLC Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-3">SDLC Methodology</h4>
                <p className="text-sm">{stageData.stage3.sdlcMapping}</p>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                <h4 className="font-bold text-green-600 dark:text-green-400 mb-3">QA & Deployment</h4>
                <p className="text-sm">{stageData.stage3.qaApproach}</p>
              </div>
            </div>

            {/* Team Roles */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Suggested Team Roles & FTE Estimates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageData.stage3.teamRoles.map((role, index) => (
                  <div key={index} className="border rounded p-4 bg-card">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold">{role.role}</h5>
                      <Badge variant="secondary">{role.fteEstimate} FTE</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {role.skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-4">
              <Button
                size="lg"
                onClick={() => proceedToStage(AnalysisStage.TECH_ROADMAP)}
                disabled={loading}
                className="text-lg px-8 py-4"
              >
                {loading ? (
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                ) : (
                  <Code className="mr-2 w-5 h-5" />
                )}
                Ready for Technical Details?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderTechRoadmap = () => {
    if (!analysis || !stageData.stage4) return null

    return (
      <div className="space-y-6">
        {/* Stage 4: Technology Roadmap */}
        <Card className="bg-purple-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Code className="w-6 h-6 text-purple-500" />
                  Stage 4: Technology Roadmap & Stack
                </CardTitle>
                <CardDescription>
                  Technical path, readiness advice, and cost analysis
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousStage}>
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goBackToInput}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Prompt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tech Roadmap */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Layered Technology Roadmap</h4>
              {stageData.stage4.techRoadmap.map((item, index) => (
                <div key={index} className="border-l-4 border-purple-500 pl-4 bg-purple-500/10 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-purple-600 dark:text-purple-400">{item.category}</h5>
                    <div className="flex gap-2">
                      <Badge variant="outline">{item.timeline}</Badge>
                      <Badge variant="secondary">TRL {item.trl}/9</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.technologies.map((tech, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{tech}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Version Milestones */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Version-Based Milestones</h4>
              {stageData.stage4.versionMilestones.map((version, index) => (
                <div key={index} className="border rounded p-4 bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold">{version.version}</h5>
                    <Badge variant="outline">{version.timeline}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{version.description}</p>
                  <div className="space-y-1">
                    {version.features.map((feature, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-purple-500">•</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Security Considerations */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Compliance
              </h4>
              {stageData.stage4.securityConsiderations.map((security, index) => (
                <div key={index} className="border rounded p-4 bg-card">
                  <h5 className="font-semibold mb-2">{security.area}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <strong className="text-sm">Requirements:</strong>
                      <ul className="text-sm mt-1">
                        {security.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong className="text-sm">Compliance:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {security.compliance.map((comp, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{comp}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Estimates */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Cost Analysis
              </h4>
              {stageData.stage4.costEstimates.map((category, index) => (
                <div key={index} className="border rounded p-4 bg-card">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-semibold">{category.category}</h5>
                    <Badge variant="secondary">{category.total}</Badge>
                  </div>
                  <div className="space-y-2">
                    {category.items.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between items-start">
                          <strong>{item.name}</strong>
                          <span className="text-muted-foreground">{item.cost}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.justification}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center pt-4">
              <Button
                size="lg"
                onClick={() => proceedToStage(AnalysisStage.DEEP_RESOURCES)}
                disabled={loading}
                className="text-lg px-8 py-4"
              >
                {loading ? (
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                ) : (
                  <Briefcase className="mr-2 w-5 h-5" />
                )}
                Access Deep Resources & Tools
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderDeepResources = () => {
    if (!analysis || !stageData.stage5) return null

    return (
      <div className="space-y-6">
        {/* Stage 5: Deep Resources */}
        <Card className="bg-red-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-red-500" />
                  Stage 5: Deep Resources & Interactive Tools
                </CardTitle>
                <CardDescription>
                  Practical handoff to execution - Premium features
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToPreviousStage}>
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goBackToInput}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Prompt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Shareable Report */}
            <div className="border rounded p-4 bg-card">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Shareable Idea Report
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Get a permanent link to access this analysis from anywhere
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stageData.stage5.shareableLink}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded text-sm bg-muted"
                />
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(stageData.stage5?.shareableLink || "")}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            {/* Freelancer Links */}
            <div className="border rounded p-4 bg-card">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Find Expert Developers
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Connect with freelance experts in your project domain
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stageData.stage5.freelancerLinks.map((link, index) => (
                  <div key={index} className="border rounded p-3 text-center bg-card">
                    <h5 className="font-semibold mb-2">{link.platform}</h5>
                    <p className="text-xs text-muted-foreground mb-3">{link.description}</p>
                    <Button size="sm" asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        Browse Experts
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Jira Integration */}
            <div className="border rounded p-4 bg-card opacity-50">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Jira Integration
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Connect directly with Jira to work on pre-built roadmap
              </p>
              <Button disabled size="sm">
                Coming Soon - Connect to Jira
              </Button>
            </div>

            {/* SRS Document Generator */}
            <div className="border rounded p-4 bg-card opacity-50">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                AI-Generated SRS Document
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Generate an IEEE standard Software Requirements Specification
              </p>
              <Button disabled size="sm">
                Coming Soon - Generate SRS
              </Button>
            </div>

            {/* Export Options */}
            <div className="border rounded p-4 bg-card">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Complete Analysis
              </h4>
              <div className="flex gap-2">
                <Button
                  onClick={exportToPDF}
                  disabled={exportLoading}
                  className="flex items-center gap-2"
                >
                  {exportLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PDF Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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

  const generateRefinementSuggestions = async () => {
    if (!analysis) return

    setRefinementLoading(true)
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAnalysis: analysis,
          projectTitle: analysis.projectTitle,
          projectDescription: analysis.projectDescription,
        }),
      })

      if (response.ok) {
        const suggestions = await response.json()
        setRefinementSuggestions(suggestions.suggestions || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || "Failed to generate refinement suggestions. Please try again.")
      }
    } catch (error) {
      console.error("Failed to generate refinement suggestions:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setRefinementLoading(false)
    }
  }

  const reAnalyzeProject = async () => {
    setRefinementLoading(true)
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: `${projectModifications.title}: ${projectModifications.description}`,
          stage: 'stage2'
        }),
      })

      if (response.ok) {
        const rawNewAnalysis = await response.json()
        // 🔧 Apply validation to re-analyzed data
        const validatedNewAnalysis = validateAnalysisData(rawNewAnalysis)

        const updatedAnalysis = {
          ...validatedNewAnalysis,
          projectTitle: projectModifications.title,
          projectDescription: projectModifications.description,
        }

        setAnalysis(updatedAnalysis)
        localStorage.setItem("projectAnalysis", JSON.stringify(updatedAnalysis))
        setShowRefinementTools(false)
        fetchGitHubRepos(projectModifications.title)
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || "Re-analysis failed. Please try again.")
      }
    } catch (error) {
      console.error("Re-analysis failed:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setRefinementLoading(false)
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

  // Generate category and tags based on project description
  const generateCategoryAndTags = (description: string, title: string) => {
    const text = `${title} ${description}`.toLowerCase()
    
    // Define categories with keywords
    const categoryMap = {
      "EdTech": ["education", "learning", "student", "teacher", "course", "school", "university", "training"],
      "FinTech": ["finance", "banking", "payment", "money", "investment", "trading", "wallet", "cryptocurrency"],
      "HealthTech": ["health", "medical", "healthcare", "doctor", "patient", "hospital", "wellness", "fitness"],
      "E-commerce": ["shop", "store", "marketplace", "buy", "sell", "retail", "product", "order"],
      "SaaS": ["software", "service", "platform", "tool", "dashboard", "api", "cloud", "subscription"],
      "Social": ["social", "community", "network", "chat", "messaging", "forum", "connect"],
      "Gaming": ["game", "gaming", "player", "entertainment", "virtual", "interactive"],
      "Productivity": ["productivity", "management", "organize", "task", "workflow", "efficiency"],
      "IoT": ["iot", "device", "sensor", "smart", "connected", "automation", "hardware"],
      "AI/ML": ["ai", "artificial intelligence", "machine learning", "ml", "neural", "algorithm"]
    }

    // Find matching category
    let category = "Tech"
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        category = cat
        break
      }
    }

    // Generate tags based on common tech keywords
    const possibleTags = [
      { keyword: ["dashboard", "admin", "panel"], tag: "Dashboard" },
      { keyword: ["api", "backend", "server"], tag: "API" },
      { keyword: ["mobile", "app", "ios", "android"], tag: "Mobile App" },
      { keyword: ["web", "website", "frontend"], tag: "Web App" },
      { keyword: ["database", "data", "storage"], tag: "Database" },
      { keyword: ["automation", "automatic", "auto"], tag: "Automation" },
      { keyword: ["portal", "platform", "system"], tag: "Portal" },
      { keyword: ["analytics", "analysis", "reporting"], tag: "Analytics" },
      { keyword: ["user", "customer", "client"], tag: "User Management" },
      { keyword: ["integration", "connect", "sync"], tag: "Integration" }
    ]

    const tags = possibleTags
      .filter(({ keyword }) => keyword.some(k => text.includes(k)))
      .map(({ tag }) => tag)
      .slice(0, 3) // Limit to 3 tags

    return { category, tags }
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
    setCurrentStage(AnalysisStage.INPUT)
    setAnalysis(null)
    setProjectModifications({ title: "", description: "" })
  }

  // 🔥 STAGE DATA GENERATORS
  const generateQuickWins = async (): Promise<QuickWin[]> => {
    if (!analysis) return []
    return [
      {
        title: "Start with MVP",
        description: "Focus on core features first to validate the concept quickly (1-2 weeks)",
        timeEstimate: "1-2 weeks"
      },
      {
        title: "User Research",
        description: "Conduct interviews with 5-10 potential users to validate assumptions (3-5 days)",
        timeEstimate: "3-5 days"
      },
      {
        title: "💡 Pro Tip: Landing Page",
        description: "Create a simple landing page to gauge interest and collect early signups before building",
        timeEstimate: "2-3 days"
      },
      {
        title: "🚀 Quick Win: No-Code Prototype",
        description: "Use tools like Figma + InVision or Bubble to create an interactive prototype without coding",
        timeEstimate: "1 week"
      },
      {
        title: "🎯 Bonus Idea: Community Building",
        description: "Start building a community around your idea on Discord/Slack to get early feedback and beta testers",
        timeEstimate: "Ongoing"
      },
      {
        title: "📊 Growth Hack: Analytics Setup",
        description: "Set up Google Analytics and user behavior tracking from day one to understand user patterns",
        timeEstimate: "1 day"
      }
    ]
  }

  const fetchExpertArticles = async (): Promise<ExpertArticle[]> => {
    try {
      const response = await fetch('/api/research-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: formData.idea || analysis?.projectTitle || '' })
      })

      if (response.ok) {
        const data = await response.json()
        return data.articles || []
      }
    } catch (error) {
      console.error('Failed to fetch research papers:', error)
    }

    // Fallback data if API fails
    const ideaLower = (formData.idea || analysis?.projectTitle || '').toLowerCase()
    
    if (ideaLower.includes('ai') || ideaLower.includes('machine learning')) {
      return [
        {
          title: "Deep Learning for Software Engineering: A Systematic Literature Review",
          url: "https://arxiv.org/abs/2103.09750",
          source: "arXiv (2023)",
          summary: "Comprehensive analysis of deep learning applications in software development, covering code generation, testing, and maintenance."
        },
        {
          title: "Machine Learning Engineering in Production Systems",
          url: "https://proceedings.mlr.press/v139/sculley21a.html",
          source: "ICML (2023)",
          summary: "Research on ML system design patterns, deployment strategies, and operational challenges in production environments."
        }
      ]
    } else if (ideaLower.includes('web') || ideaLower.includes('app')) {
      return [
        {
          title: "Modern Web Development: Performance and User Experience",
          url: "https://dl.acm.org/doi/10.1145/3442381.3449851",
          source: "ACM WWW (2023)",
          summary: "Study of contemporary web technologies, performance optimization techniques, and user experience design principles."
        },
        {
          title: "Mobile Application Development: Trends and Challenges",
          url: "https://ieeexplore.ieee.org/document/9458920",
          source: "IEEE Software (2023)",
          summary: "Analysis of mobile development frameworks, cross-platform strategies, and emerging technology adoption patterns."
        }
      ]
    } else {
      return [
        {
          title: "Software Engineering Best Practices: A Meta-Analysis",
          url: "https://link.springer.com/article/10.1007/s10664-023-10123-1",
          source: "Empirical Software Engineering (2023)",
          summary: "Comprehensive review of software development methodologies, quality assurance practices, and project success factors."
        },
        {
          title: "Innovation in Digital Product Development",
          url: "https://www.sciencedirect.com/science/article/pii/S0164121223000123",
          source: "Journal of Systems and Software (2023)",
          summary: "Research on innovation patterns, market validation strategies, and technology adoption in digital product development."
        }
      ]
    }
  }

  const fetchExistingSolutions = async (): Promise<ExistingSolution[]> => {
    try {
      // Simple Google Search - just search the user's idea
      const response = await fetch('/api/google-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idea: formData.idea || analysis?.projectDescription || analysis?.projectTitle
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.existingSolutions || []
      }
    } catch (error) {
      console.error('[Google Search] Error:', error)
    }

    // Simple fallback
    return [
      {
        name: "Search Error",
        url: "#",
        description: "Unable to fetch search results at this time",
        category: "Error"
      }
    ]
  }

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

  return (
    <SelectionTooltip>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">The Idea Evaluator</h1>
                <p className="text-sm text-muted-foreground">AI-powered project validation</p>
              </div>
            </Link>
            
            {analysis && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRefinementTools(!showRefinementTools)}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Refine Project
                </Button>
                <ThemeToggle />
                <Button
                  variant="outline"
                  onClick={exportToPDF}
                  disabled={exportLoading}
                  className="flex items-center gap-2 bg-transparent"
                >
                  {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export PDF
                </Button>
                <Button
                  variant="default"
                  onClick={openAssistant}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  AI Assistant
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Analyzing State */}
          {analyzing && (
            <div className="transition-all duration-700 ease-in-out">
              <Card className="p-6 shadow-lg">
                <ShimmerLoader />
              </Card>
            </div>
          )}

          {/* Stage Content */}
          {!analyzing && renderStageContent()}
        </div>
      </div>

      {/* AI Assistant Chat */}
    </div>
    </SelectionTooltip>
  )
}