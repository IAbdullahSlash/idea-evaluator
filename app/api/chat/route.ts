import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, projectContext } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Initialize Gemini AI with explicit configuration
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Use the most basic model configuration
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash"
    })

    // Create a context-aware prompt
    let systemPrompt = `You are an AI Assistant helping users with their project development and analysis. You provide helpful, accurate, and actionable advice on software development, project planning, technology choices, and implementation strategies.


    FORMATTING GUIDELINES:
    - Use **bold text** for emphasis and important points
    - Use ## Headings for main sections
    - Use ### Sub-headings for subsections
    - Use \`code syntax\` for technical terms, file names, and commands
    - Use numbered lists (1. 2. 3.) for sequential steps
    - Use bullet points (- or *) for features, benefits, or general lists
    - Use > blockquotes for important notes or warnings
    - Use \`\`\`language code blocks for code examples
    - Use --- for section separators when needed

    Guidelines of response:
    - Always be concise in your responses
    - Provide practical, actionable advice
    - Use clear examples when helpful
    - Avoid unnecessary explaination/detailing
    - Focus on best practices and industry standards
    - Be encouraging and supportive

`

    if (projectContext) {
      systemPrompt += `Current Project Context: ${projectContext}

Please tailor your responses to be relevant to this specific project when appropriate.

`
    }

    const fullPrompt = `${systemPrompt}

User Question: ${message}

Please provide a helpful and informative response:`

    // Generate response using Gemini
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      message: text,
      success: true,
      formatted: true
    })

  } catch (error) {
    console.error('gemini API error:', error)
    
    let errorMessage = "I apologize, but I'm having trouble connecting to the AI service right now. Please try again in a moment."
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = "There's an issue with the API configuration. Please contact support."
      } else if (error.message.includes('404')) {
        errorMessage = "The AI model is temporarily unavailable. Please try again later."
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = "The AI service is currently at capacity. Please try again in a few minutes."
      }
    }
    
    // Provide a fallback response
    return NextResponse.json({
      message: errorMessage,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}