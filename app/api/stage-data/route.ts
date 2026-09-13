import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { type NextRequest, NextResponse } from "next/server"
import { fetchResearchPapers } from "@/lib/research-papers"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  const { stage, analysis, idea } = await request.json()

  let responseData = {}

  try {

    switch (stage) {
      case 2: // Executive Summary
        responseData = await generateStage2Data(analysis, idea)
        break
      case 3: // Roadmaps
        responseData = await generateStage3Data(analysis)
        break
      case 4: // Tech Roadmap
        responseData = await generateStage4Data(analysis)
        break
      case 5: // Deep Resources
        responseData = await generateStage5Data(analysis)
        break
      default:
        throw new Error("Invalid stage")
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error(`Stage ${stage} data generation error:`, error)
    return NextResponse.json({ error: "Failed to generate stage data" }, { status: 500 })
  }
}

async function generateStage2Data(analysis: any, idea: string) {
  // Generate quick wins
  const quickWins = [
    {
      title: "Start with MVP",
      description: "Focus on core features first to validate the concept quickly",
      timeEstimate: "1-2 weeks"
    },
    {
      title: "User Research",
      description: "Conduct interviews with 5-10 potential users to validate assumptions",
      timeEstimate: "3-5 days"
    }
  ]

  // Fetch real expert articles from research papers APIs
  const expertArticles = await fetchResearchPapers(idea)

  // Mock existing solutions
  const existingSolutions = [
    {
      name: "Similar Platform Alpha",
      url: "https://example.com/platform-alpha",
      description: "Established solution addressing similar market needs with strong user base",
      category: "Direct Competitor"
    },
    {
      name: "Complementary Tool Beta",
      url: "https://example.com/tool-beta",
      description: "Related service that could be integration partner or competitive threat",
      category: "Indirect Competitor"
    }
  ]

  return {
    quickWins,
    expertArticles,
    existingSolutions,
    githubRepos: [] // Will be populated by separate GitHub API call
  }
}

async function generateStage3Data(analysis: any) {
  // Try AI generation first
  try {
    const prompt = `
You are a senior project manager. Based on the following project analysis, create a detailed project roadmap, team structure, SDLC approach, and QA strategy.

PROJECT ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Return a JSON object with this structure:
{
  "projectMilestones": [
    {
      "phase": "string",
      "deliverables": ["string"],
      "duration": "string",
      "dependencies": ["string"]
    }
  ],
  "teamRoles": [
    {
      "role": "string",
      "fteEstimate": number,
      "skills": ["string"],
      "description": "string"
    }
  ],
  "sdlcMapping": "string",
  "qaApproach": "string"
}

Guidelines:
- Create 4 phases: Project Initiation, Planning & Design, Development & Testing, Launch & Deployment
- Each phase should have 3-5 specific deliverables
- Team roles should be tailored to the project's detected domain
- SDLC should match project complexity (Lean for startups, Agile for general, Hybrid for enterprise)
- QA approach should include testing strategies relevant to the tech stack`

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: prompt,
      temperature: 0.2,
    })

    // Clean and parse the response
    const cleanedText = text.trim()
      .replace(/```json\s*/g, '').replace(/```\s*/g, '')
    const aiData = JSON.parse(cleanedText)

    // Validate structure
    if (aiData.projectMilestones && aiData.teamRoles) {
      return {
        projectMilestones: aiData.projectMilestones,
        teamRoles: aiData.teamRoles,
        sdlcMapping: aiData.sdlcMapping || "Agile methodology with 2-week sprints, daily standups, and sprint retrospectives.",
        qaApproach: aiData.qaApproach || "Multi-layered testing including unit, integration, and end-to-end tests."
      }
    }
  } catch (e) {
    console.warn("AI generation for stage 3 failed, using fallback:", e)
  }

  // Fallback to template-based generation
  const projectMilestones = [
    {
      phase: "Project Initiation",
      deliverables: ["Project charter", "Stakeholder analysis", "Initial requirements", "Market research"],
      duration: "1-2 weeks",
      dependencies: []
    },
    {
      phase: "Planning & Design",
      deliverables: ["Detailed requirements", "Technical architecture", "UI/UX design", "Development plan"],
      duration: "2-4 weeks",
      dependencies: ["Project Initiation"]
    },
    {
      phase: "Development & Testing",
      deliverables: ["MVP development", "Core features", "Testing & QA", "Beta user feedback"],
      duration: "6-10 weeks",
      dependencies: ["Planning & Design"]
    },
    {
      phase: "Launch & Deployment",
      deliverables: ["Production deployment", "User onboarding", "Marketing launch", "Performance monitoring"],
      duration: "1-2 weeks",
      dependencies: ["Development & Testing"]
    }
  ]

  const teamRoles = [
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

  const sdlcMapping = "Agile Scrum methodology with 2-week sprints, daily standups, sprint retrospectives, continuous integration, and regular stakeholder demonstrations"

  const qaApproach = "Comprehensive testing strategy including unit tests (Jest), integration tests, end-to-end tests (Playwright/Cypress), and user acceptance testing with beta users"

  return {
    projectMilestones,
    teamRoles,
    sdlcMapping,
    qaApproach
  }
}

async function generateStage4Data(analysis: any) {
  // Try AI generation first
  try {
    const prompt = `
You are a senior solutions architect. Based on the following project analysis, create a detailed technology roadmap, version milestones, security considerations, and cost estimates.

PROJECT ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Return a JSON object with this structure:
{
  "techRoadmap": [
    {
      "category": "Infrastructure" | "Dev Stack" | "Integrations" | "Testing" | "Scalability",
      "technologies": ["string"],
      "timeline": "string",
      "trl": number (1-9)
    }
  ],
  "versionMilestones": [
    {
      "version": "string",
      "features": ["string"],
      "timeline": "string",
      "description": "string"
    }
  ],
  "securityConsiderations": [
    {
      "area": "string",
      "requirements": ["string"],
      "compliance": ["string"]
    }
  ],
  "costEstimates": [
    {
      "category": "string",
      "items": [{"name": "string", "cost": "string", "justification": "string"}],
      "total": "string"
    }
  ]
}

Guidelines:
- Create 5 tech categories: Infrastructure, Dev Stack, Integrations, Testing, Scalability
- TRL (Technology Readiness Level): 9 = proven technology, 7 = demonstration, 5 = validation
- Version milestones: v0.1 (MVP), v1.0 (Launch), v2.0 (Scale)
- Security areas should match the project's domain
- Cost estimates should be realistic based on the project complexity`

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: prompt,
      temperature: 0.2,
    })

    const cleanedText = text.trim()
      .replace(/```json\s*/g, '').replace(/```\s*/g, '')
    const aiData = JSON.parse(cleanedText)

    if (aiData.techRoadmap && aiData.versionMilestones) {
      return {
        techRoadmap: aiData.techRoadmap,
        versionMilestones: aiData.versionMilestones,
        securityConsiderations: aiData.securityConsiderations || [
          { area: "Authentication & Authorization", requirements: ["JWT tokens", "Password hashing"], compliance: ["GDPR"] }
        ],
        costEstimates: aiData.costEstimates || [
          { category: "Development", items: [{ name: "Developer salaries", cost: "$8,000-12,000/month", justification: "2 developers for 3-4 months" }], total: "$25,000-50,000" }
        ]
      }
    }
  } catch (e) {
    console.warn("AI generation for stage 4 failed, using fallback:", e)
  }

  // Fallback
  const techRoadmap = [
    { category: "Infrastructure" as const, technologies: ["AWS/Vercel", "Docker", "CI/CD"], timeline: "Week 1-2", trl: 8 },
    { category: "Dev Stack" as const, technologies: ["React", "Node.js", "PostgreSQL"], timeline: "Week 2-6", trl: 9 }
  ]
  const versionMilestones = [
    { version: "v0.1 (MVP)", features: ["Core functionality", "Basic UI", "User authentication"], timeline: "Month 1-2", description: "Minimum viable product" },
    { version: "v1.0 (Launch)", features: ["Full feature set", "Polished UI", "Performance optimization"], timeline: "Month 3-4", description: "Production-ready version" }
  ]
  const securityConsiderations = [
    { area: "Authentication", requirements: ["JWT tokens", "Password hashing (bcrypt)", "Session management"], compliance: ["GDPR", "Data encryption"] }
  ]
  const costEstimates = [
    { category: "Development", items: [{ name: "Developer salaries", cost: "$8,000-12,000/month", justification: "2 developers for 3-4 months" }], total: "$25,000-50,000" },
    { category: "Infrastructure", items: [{ name: "Cloud hosting", cost: "$50-200/month", justification: "AWS/Vercel hosting" }], total: "$600-2,400/year" }
  ]

  return { techRoadmap, versionMilestones, securityConsiderations, costEstimates }
}

async function generateStage5Data(analysis: any) {
  const reportId = Math.random().toString(36).substring(2, 15)
  const shareableLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/shared-report/${reportId}`

  const freelancerLinks = [
    {
      platform: "Fiverr",
      url: `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(analysis.detectedDomain || 'web development')}%20development`,
      description: `Find ${analysis.detectedDomain || 'web development'} experts on Fiverr`
    },
    {
      platform: "Upwork",
      url: `https://www.upwork.com/freelance-jobs/web-development/`,
      description: `Browse expert freelancers on Upwork`
    },
    {
      platform: "Freelancer.com",
      url: `https://www.freelancer.com/jobs/website-design/`,
      description: `Hire professional developers on Freelancer`
    }
  ]

  return {
    jiraIntegration: false, // Will be implemented later
    shareableLink,
    freelancerLinks,
    srsDocument: null // Will be implemented later
  }
}