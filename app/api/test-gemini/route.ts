import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Initialize Gemini AI with basic configuration
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })
    
    // Test with a simple prompt
    const result = await model.generateContent("Say hello")
    const response = await result.response
    const text = response.text()
    
    return NextResponse.json({
      success: true,
      testResponse: text,
      model: "gemini-3.5-flash",
      message: 'API key is working correctly'
    })

  } catch (error) {
    console.error('Gemini API test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'API key test failed'
    }, { status: 500 })
  }
}