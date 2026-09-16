import { GoogleGenerativeAI } from '@google/generative-ai'
import { type NextRequest, NextResponse } from 'next/server'

function getGeminiKeys(): string[] {
  const key1 = process.env.GEMINI_API_KEY
  const key2 = process.env.GEMINI_API_KEY_2
  return [key1, key2].filter((k): k is string => Boolean(k))
}

function getGenerativeModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
}

// 🛡️ INTENT VALIDATION — server-side guardrails
function validateIntent(idea: string): { valid: boolean; reason?: string } {
  const trimmed = idea.trim()

  if (trimmed.length < 15) {
    return { valid: false, reason: 'Idea is too short — please describe your project concept in more detail (at least 15 characters).' }
  }

  const words = trimmed.toLowerCase().match(/\b[a-z]+\b/g) || []
  if (words.length < 2) {
    return { valid: false, reason: 'Not enough meaningful content to analyze. Please describe your project idea.' }
  }

  const gibberishRatio = words.filter(w => w.length <= 2).length / words.length
  if (gibberishRatio > 0.6) {
    return { valid: false, reason: 'Your input looks like gibberish or random text. Please describe a real project idea.' }
  }

  const spamPatterns = [
    /https?:\/\/\S+/i,
    /bitcoin|crypto|invest now|get rich|earn money/i,
    /^[a-z0-9]{10,}$/i,
    /(.)\\1{4,}/,
  ]
  for (const pattern of spamPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Please describe a real project idea — spam or unrelated content detected.' }
    }
  }

  return { valid: true }
}

// 🚀 STAGE-SPECIFIC PROMPTS
const stagePrompts: Record<string, string> = {
  stage1: `You are a senior technical consultant providing an honest reality check for a project idea.

PROJECT TO ANALYZE: "{idea}"

CONTEXT PROVIDED BY DEVELOPER:
- Domain: {domain}
- Project Type: {projectType}
- Experience Level: {experience}
- Expected Timeline: {timeline}

Use the above context to sharpen your assessment. If no context was provided, analyze the idea generically.

You must provide a concise but comprehensive assessment focusing on three key areas:

1. HONEST REALITY CHECK:
- Is this idea actually feasible with current technology?
- What are the real-world challenges and obstacles?
- How complex is this really to build and maintain?

2. AI VERDICT:
- Overall feasibility score (1-10) with clear reasoning
- Success probability percentage with justification
- Recommended approach (build, modify, or abandon)
- Key next steps if proceeding

IMPORTANT:
- Be brutally honest and realistic
- Focus on practical implementation challenges
- Consider market realities and competition
- Keep total response under 250 words
- Use clear, direct language without fluff

Respond with ONLY valid JSON:
{
  "feasibilityScore": number (1-10),
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "successProbability": number (10-95),
  "detectedDomain": "domain category",
  "requiredExperience": "Beginner" | "Intermediate" | "Advanced",
  "honestAiFeedback": "Direct assessment of feasibility and real challenges",
  "targetUsersMarketFit": {
    "primaryUsers": "Analyze the specific user demographics, professions, or groups who would find this idea valuable",
    "marketDemand": "Assess the current market demand for this solution",
    "userValidation": "Describe how users would validate this idea"
  },
  "aiVerdict": "Overall recommendation with clear next steps"
}`,

  stage2: `You are a senior technical consultant providing detailed executive analysis for a validated project idea.

PROJECT TO ANALYZE: "{idea}"

Provide a comprehensive analysis focusing on these key areas:

1. MARKET REALITY ASSESSMENT:
- Does this solve a real, clear problem?
- What is the competition and market saturation level?

2. TECHNICAL FEASIBILITY ANALYSIS:
- Development complexity and required skills assessment
- Key technical risks and implementation challenges

3. EXECUTIVE SUMMARY:
- Overall viability assessment with clear reasoning
- Recommended next steps and approach

IMPORTANT:
- Be thorough and analytical
- Focus on business viability and market potential
- Keep responses clear and professional
- Avoid special characters that could break JSON

Respond with ONLY valid JSON:
{
  "feasibilityScore": number (1-10),
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "estimatedTimeframe": "conservative estimate with buffer",
  "successProbability": number (10-95),
  "detectedDomain": "detailed domain classification",
  "requiredExperience": "Beginner" | "Intermediate" | "Advanced",
  "honestAiFeedback": "Write a comprehensive executive analysis covering market reality, technical feasibility, and executive summary",
  "keyStrengths": {
    "valueProposition": "Identify the unique value proposition and competitive advantages",
    "marketFit": "Analyze scalability potential and growth opportunities"
  },
  "potentialChallenges": {
    "technicalRisks": "Identify specific technical challenges and development risks",
    "usabilityIssues": "Analyze security vulnerabilities and privacy considerations",
    "marketRisks": "Assess competition threats and market acquisition challenges"
  },
  "techStack": {
    "frontend": ["recommended frontend technologies"],
    "backend": ["scalable backend solutions"],
    "database": ["appropriate database choice"],
    "tools": ["essential development tools"]
  },
  "requirementsScope": {
    "mustHaveFeatures": ["List 3-5 essential features for MVP"],
    "niceToHaveFeatures": ["List 3-5 valuable but not critical features"],
    "constraints": ["List 3-5 constraints like budget, time, technical limitations"]
  },
  "recommendations": ["List 3-5 actionable recommendations for next steps"],
  "similarProjects": ["List 2-3 existing projects or companies with similar ideas"]
}`
}

function applyContextAwareScoring(analysis: any, originalIdea: string) {
  const ideaLower = originalIdea.toLowerCase()

  const complexityFactors: Record<string, number> = {
    'artificial intelligence': 0.6,
    'machine learning': 0.7,
    'blockchain': 0.6,
    'cryptocurrency': 0.5,
    'real-time': 0.8,
    'distributed': 0.7,
    'microservices': 0.8,
    'scalable': 0.9,
    'enterprise': 0.7,
    'database': 0.9,
    'api integration': 0.9,
    'user authentication': 0.95,
    'crud': 1.2,
    'simple': 1.3,
    'basic': 1.2,
    'static website': 1.4,
    'portfolio': 1.3
  }

  let complexityMultiplier = 1.0

  Object.entries(complexityFactors).forEach(([keyword, factor]) => {
    if (ideaLower.includes(keyword)) {
      complexityMultiplier *= factor
    }
  })

  const adjustedFeasibility = Math.max(1, Math.min(10,
    Math.round(analysis.feasibilityScore * complexityMultiplier)
  ))

  const adjustedSuccess = Math.max(15, Math.min(90,
    Math.round(analysis.successProbability * complexityMultiplier)
  ))

  return {
    ...analysis,
    feasibilityScore: adjustedFeasibility,
    successProbability: adjustedSuccess,
    contextAdjustment: {
      multiplier: complexityMultiplier.toFixed(2),
      reason: complexityMultiplier < 1 ? 'Reduced for complexity' : 'Standard assessment'
    }
  }
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const model = getGenerativeModel(apiKey)
  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function POST(request: NextRequest) {
  try {
    const { idea, stage = 'stage1', domain, projectType, experience, timeline } = await request.json()

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    // 🛡️ SERVER-SIDE INTENT GUARDRAILS
    const guardrailCheck = validateIntent(idea)
    if (!guardrailCheck.valid) {
      return NextResponse.json(
        { error: guardrailCheck.reason },
        { status: 422 }
      )
    }

    // 🚀 EXTRA CONTEXT FROM FRONTEND
    const extraContext = [domain, projectType, experience, timeline].filter(Boolean).join(', ')
    const contextPrefix = extraContext ? `${idea} (Domain: ${extraContext})` : idea

    // 🚀 Select prompt and inject idea + context placeholders
    const selectedPrompt = stagePrompts[stage] || stagePrompts.stage1
    const promptWithContext = selectedPrompt
      .replace('{idea}', contextPrefix)
      .replace('{domain}', domain || 'Not specified')
      .replace('{projectType}', projectType || 'Not specified')
      .replace('{experience}', experience || 'Not specified')
      .replace('{timeline}', timeline || 'Not specified')

    // 🚀 Try each Gemini API key until one works
    const apiKeys = getGeminiKeys()
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'No Gemini API key configured' }, { status: 500 })
    }

    let text: string | null = null
    let lastError: Error | null = null

    for (const apiKey of apiKeys) {
      try {
        text = await callGemini(apiKey, promptWithContext)
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`[analyze] Gemini key failed, trying next: ${lastError.message}`)
        continue
      }
    }

    if (!text) {
      console.error('[analyze] All Gemini keys failed:', lastError?.message)
      return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 500 })
    }

    // 🚀 JSON EXTRACTION WITH CLEANING
    let analysis: any
    try {
      let cleanedText = text.trim()
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonString = text.substring(jsonStart, jsonEnd + 1)
        jsonString = jsonString.replace(/\n\s*\n/g, '\n')
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1')

        try {
          analysis = JSON.parse(jsonString)
        } catch (extractError) {
          console.error('[analyze] JSON extraction failed:', extractError)
          return NextResponse.json({ error: 'AI analysis failed to generate valid response.' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'AI analysis failed to generate valid response.' }, { status: 500 })
      }
    }

    // 🚀 APPLY CONTEXT-AWARE SCORING
    const finalAnalysis = applyContextAwareScoring(analysis, idea)

    // 🚀 ENSURE ALL EXPECTED FIELDS ARE PRESENT
    const enrichedAnalysis = {
      ...finalAnalysis,
      estimatedTimeframe: finalAnalysis.estimatedTimeframe || 'TBD',
      honestRealityCheck: finalAnalysis.honestRealityCheck || finalAnalysis.honestAiFeedback || 'Analysis unavailable',
      projectTitle: '',
      projectDescription: '',
      contextAdjustment: finalAnalysis.contextAdjustment || { multiplier: '1.00', reason: 'Standard assessment' },
      validationApplied: finalAnalysis.validationApplied || { adjustments: 'None', confidence: 'Medium' },
      keyStrengths: finalAnalysis.keyStrengths || {
        valueProposition: 'Value proposition assessment needed',
        marketFit: 'Market fit analysis needed'
      },
      potentialChallenges: finalAnalysis.potentialChallenges || {
        technicalRisks: 'Technical risk assessment needed',
        usabilityIssues: 'Usability review needed',
        marketRisks: 'Market risk analysis needed'
      },
      requirementsScope: finalAnalysis.requirementsScope || {
        mustHaveFeatures: [],
        niceToHaveFeatures: [],
        constraints: []
      },
      targetUsersMarketFit: finalAnalysis.targetUsersMarketFit || {
        primaryUsers: 'User analysis needed',
        marketDemand: 'Market demand assessment needed',
        userValidation: 'User validation strategy needed'
      },
      techStack: finalAnalysis.techStack || {
        frontend: [],
        backend: [],
        database: [],
        tools: []
      },
      roadmap: finalAnalysis.roadmap || {
        phase1: { title: 'Phase 1', duration: 'TBD', tasks: [] },
        phase2: { title: 'Phase 2', duration: 'TBD', tasks: [] },
        phase3: { title: 'Phase 3', duration: 'TBD', tasks: [] }
      },
      recommendations: finalAnalysis.recommendations || [],
      similarProjects: finalAnalysis.similarProjects || [],
    }

    return NextResponse.json(enrichedAnalysis)
  } catch (error) {
    console.error('[analyze] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to analyze project idea' }, { status: 500 })
  }
}
