import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { type NextRequest, NextResponse } from "next/server"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { idea, stage = 'stage1' } = await request.json()

    // 🚀 1. STAGE-SPECIFIC PROMPT ENGINEERING
    const stagePrompts = {
      stage1: `
You are a senior technical consultant providing an honest reality check for a project idea.

PROJECT TO ANALYZE: "${idea}"

You must provide a concise but comprehensive assessment focusing on three key areas:

1. HONEST REALITY CHECK:
- Is this idea actually feasible with current technology?
- What are the real-world challenges and obstacles?
- How complex is this really to build and maintain?

3. AI VERDICT:
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
    "primaryUsers": "Analyze the specific user demographics, professions, or groups who would find this idea valuable. Consider age groups, technical expertise, industry sectors, problem-solving needs, and user behaviors. Be specific rather than generic.",
    "marketDemand": "Assess the current market demand for this solution. Consider market size, existing demand indicators, user pain points, competition level, and potential for growth. Be specific about market opportunity.",
    "userValidation": "Describe how users would validate this idea and what evidence would confirm demand"
  },
  "aiVerdict": "Overall recommendation with clear next steps"
}`,

      stage2: `
You are a senior technical consultant providing detailed executive analysis for a validated project idea.

PROJECT TO ANALYZE: "${idea}"

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
  "honestAiFeedback": "Write a comprehensive executive analysis that covers: 1) Market Reality Assessment - does this solve a real problem and what is the competition level, 2) Technical Feasibility Analysis - development complexity and technical risks, 3) Executive Summary - overall viability with clear reasoning and next steps. Be thorough and analytical, focus on business viability and market potential.",
  "keyStrengths": {
    "valueProposition": "Identify and describe the unique value proposition and competitive advantages this idea offers",
    "marketFit": "Analyze the scalability potential, growth opportunities, and how well this solution can expand to serve more users"
  },
  "potentialChallenges": {
    "technicalRisks": "Identify specific technical challenges and development risks that need to be addressed",
    "usabilityIssues": "Analyze potential security vulnerabilities, data protection requirements, and privacy considerations as usability challenges",
    "marketRisks": "Assess competition threats and market acquisition challenges"
  },
  "techStack": {
    "frontend": ["recommended frontend technologies"],
    "backend": ["scalable backend solutions"],
    "database": ["appropriate database choice"],
    "tools": ["essential development tools"]
  }
}`
    }

    // Select the appropriate prompt based on stage
    const selectedPrompt = stagePrompts[stage as keyof typeof stagePrompts] || stagePrompts.stage1

    // 🚀 2. ENHANCED SINGLE-MODEL APPROACH with better JSON reliability
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: selectedPrompt,
      temperature: 0.1, // Lower temperature for more consistent JSON output
    })

    console.log("[DEBUG] Raw AI response:", text.substring(0, 200) + "...")

    // 🚀 3. IMPROVED JSON EXTRACTION WITH CLEANING
    let analysis
    try {
      // Clean the response first
      let cleanedText = text.trim()
      
      // Remove any potential markdown code blocks
      cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Try to parse the cleaned response
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      console.log("[DEBUG] Direct parsing failed, attempting JSON extraction...")
      
      // Extract JSON from the response more aggressively
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        let jsonString = text.substring(jsonStart, jsonEnd + 1)
        
        // Clean the extracted JSON
        jsonString = jsonString.replace(/\n\s*\n/g, '\n') // Remove extra newlines
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        
        console.log("[DEBUG] Extracted JSON:", jsonString.substring(0, 300) + "...")
        
        try {
          analysis = JSON.parse(jsonString)
        } catch (extractError) {
          console.error("[DEBUG] JSON extraction also failed:", extractError)
          console.error("[DEBUG] Problematic JSON substring:", jsonString.substring(Math.max(0, 260-50), 260+50))
          
          // 🚀 4. RETURN ERROR - NO FALLBACK
          return NextResponse.json({ 
            error: "AI analysis failed to generate valid response. Please try again." 
          }, { status: 500 })
        }
      } else {
        console.error("[DEBUG] No valid JSON structure found in response")
        return NextResponse.json({ 
          error: "AI analysis failed to generate valid response. Please try again." 
        }, { status: 500 })
      }
    }

    // 🚀 5. APPLY CONTEXT-AWARE SCORING
    const finalAnalysis = applyContextAwareScoring(analysis, idea)
    
    return NextResponse.json(finalAnalysis)
  } catch (error) {
    console.error("Enhanced AI Analysis Error:", error)
    return NextResponse.json({ error: "Failed to analyze project idea" }, { status: 500 })
  }
}

// 🚀 3. CONTEXT-AWARE SCORING FUNCTION
function applyContextAwareScoring(analysis: any, originalIdea: string) {
  const ideaLower = originalIdea.toLowerCase()
  
  const complexityFactors = {
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