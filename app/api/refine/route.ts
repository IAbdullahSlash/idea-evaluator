import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { type NextRequest, NextResponse } from "next/server"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { currentAnalysis, projectTitle, projectDescription } = await request.json()

    const prompt = `
You are an expert AI consultant specializing in project improvement. Based on the current project analysis, provide specific, actionable suggestions for improvement.

Current Project: ${projectTitle}
Description: ${projectDescription}
Current Feasibility Score: ${currentAnalysis.feasibilityScore}/10
Current Challenges: ${Object.values(currentAnalysis.potentialChallenges || {}).join(", ")}

Provide 5-7 specific improvement suggestions that could:
1. Increase feasibility score
2. Reduce technical complexity
3. Improve market viability
4. Address current challenges
5. Enhance user experience

Format as a JSON array of strings:
["suggestion 1", "suggestion 2", "suggestion 3", ...]

Focus on practical, implementable improvements. Be specific and actionable.`

    const { text } = await generateText({
      model: groq("llama-3.1-70b-versatile"),
      prompt
    })

    const suggestions = JSON.parse(text)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Refinement suggestions error:", error)
    return NextResponse.json({ error: "Failed to generate refinement suggestions" }, { status: 500 })
  }
}
