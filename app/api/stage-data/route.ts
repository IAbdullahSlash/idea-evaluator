import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { type NextRequest, NextResponse } from "next/server"
import { fetchResearchPapers } from "@/lib/research-papers"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { stage, analysis, idea } = await request.json()

    let responseData = {}

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
  const projectMilestones = [
    {
      phase: "Initiation",
      deliverables: ["Project charter", "Stakeholder analysis", "Initial requirements gathering"],
      duration: "1-2 weeks",
      dependencies: []
    },
    {
      phase: "Planning",
      deliverables: ["Detailed requirements", "Technical architecture", "Project timeline", "Resource allocation"],
      duration: "2-3 weeks",
      dependencies: ["Initiation"]
    },
    {
      phase: "Execution",
      deliverables: ["MVP development", "Core feature implementation", "Basic testing"],
      duration: "6-8 weeks",
      dependencies: ["Planning"]
    },
    {
      phase: "Monitoring",
      deliverables: ["User feedback collection", "Performance monitoring", "Issue tracking"],
      duration: "2-3 weeks",
      dependencies: ["Execution"]
    },
    {
      phase: "Closure",
      deliverables: ["Final testing", "Documentation", "Deployment", "Post-launch review"],
      duration: "1-2 weeks",
      dependencies: ["Monitoring"]
    }
  ]

  const teamRoles = [
    {
      role: "Frontend Developer",
      fteEstimate: 1,
      skills: ["React", "TypeScript", "CSS/SCSS", "Responsive Design"],
      description: "Responsible for user interface development and client-side functionality"
    },
    {
      role: "Backend Developer",
      fteEstimate: 1,
      skills: ["Node.js", "API Development", "Database Design", "Server Management"],
      description: "Handles server-side logic, database operations, and API development"
    },
    {
      role: "QA Engineer",
      fteEstimate: 0.5,
      skills: ["Testing Frameworks", "Automation", "Bug Tracking"],
      description: "Ensures quality through comprehensive testing and bug identification"
    }
  ]

  const sdlcMapping = "Agile methodology with 2-week sprints, daily standups, sprint planning, and retrospectives. Continuous integration and deployment with automated testing pipelines."

  const qaApproach = "Multi-layered testing approach including unit tests (Jest), integration tests, end-to-end tests (Cypress), and manual testing for UX validation. Staged deployment with rollback capabilities."

  return {
    projectMilestones,
    teamRoles,
    sdlcMapping,
    qaApproach
  }
}

async function generateStage4Data(analysis: any) {
  const techRoadmap = [
    {
      category: "Infrastructure" as const,
      technologies: ["AWS/Vercel", "Docker", "CI/CD Pipeline", "Load Balancing"],
      timeline: "Week 1-2",
      trl: 8
    },
    {
      category: "Dev Stack" as const,
      technologies: ["React/Next.js", "Node.js", "TypeScript", "Tailwind CSS"],
      timeline: "Week 2-6",
      trl: 9
    },
    {
      category: "Integrations" as const,
      technologies: ["Payment APIs", "Authentication", "Third-party Services"],
      timeline: "Week 4-8",
      trl: 7
    },
    {
      category: "Testing" as const,
      technologies: ["Jest", "Cypress", "Storybook", "Testing Library"],
      timeline: "Week 3-10",
      trl: 8
    },
    {
      category: "Scalability" as const,
      technologies: ["Caching", "CDN", "Database Optimization", "Monitoring"],
      timeline: "Week 8-12",
      trl: 6
    }
  ]

  const versionMilestones = [
    {
      version: "v0.1 (MVP)",
      features: ["Core functionality", "Basic UI", "User authentication", "Essential workflows"],
      timeline: "Month 1-2",
      description: "Minimum viable product for initial user testing and feedback collection"
    },
    {
      version: "v1.0 (Launch)",
      features: ["Full feature set", "Polished UI", "Performance optimization", "Security hardening"],
      timeline: "Month 3-4",
      description: "Production-ready version suitable for public launch"
    },
    {
      version: "v2.0 (Scale)",
      features: ["Advanced features", "Analytics dashboard", "Mobile optimization", "API integration"],
      timeline: "Month 6-8",
      description: "Enhanced version with scaling capabilities and advanced functionality"
    }
  ]

  const securityConsiderations = [
    {
      area: "Authentication & Authorization",
      requirements: ["JWT tokens", "Password hashing (bcrypt)", "Session management", "Role-based access"],
      compliance: ["GDPR compliance", "Data encryption at rest", "Secure data transmission"]
    },
    {
      area: "Data Protection",
      requirements: ["Input validation", "SQL injection prevention", "XSS protection", "CSRF tokens"],
      compliance: ["Privacy policy", "Data retention policies", "User consent management"]
    }
  ]

  const costEstimates = [
    {
      category: "Development",
      items: [
        { name: "Developer salaries (2 devs)", cost: "$8,000-12,000/month", justification: "2 full-time developers for 3-4 months" },
        { name: "Design and UX", cost: "$2,000-4,000", justification: "UI/UX design, prototyping, and user testing" },
        { name: "Development tools", cost: "$200-400/month", justification: "IDEs, design tools, project management software" }
      ],
      total: "$25,000-50,000"
    },
    {
      category: "Infrastructure",
      items: [
        { name: "Cloud hosting", cost: "$50-200/month", justification: "AWS/Vercel hosting, database, storage" },
        { name: "Third-party services", cost: "$100-500/month", justification: "Payment processing, email services, analytics" },
        { name: "Security & monitoring", cost: "$50-150/month", justification: "SSL certificates, monitoring tools, backup services" }
      ],
      total: "$600-2,400/year"
    },
    {
      category: "Marketing & Launch",
      items: [
        { name: "Domain & branding", cost: "$500-1,500", justification: "Domain registration, logo design, brand materials" },
        { name: "Marketing campaigns", cost: "$1,000-5,000", justification: "Initial marketing, social media, content creation" },
        { name: "Legal & compliance", cost: "$1,000-3,000", justification: "Terms of service, privacy policy, legal review" }
      ],
      total: "$2,500-9,500"
    }
  ]

  return {
    techRoadmap,
    versionMilestones,
    securityConsiderations,
    costEstimates
  }
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