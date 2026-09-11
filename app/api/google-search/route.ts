import { NextRequest, NextResponse } from "next/server"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyD56bTRNn6Ceb5GsdbDSUUeBg8-7_ZJ-mI"
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || "31b83a20458f24cf4"

export async function POST(request: NextRequest) {
  try {
    const { idea } = await request.json()

    if (!idea) {
      return NextResponse.json({ error: "No idea provided" }, { status: 400 })
    }

    console.log("[Google Search] Searching for:", idea)

    // Simple search - just use the user's idea as the search query
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(idea)}&num=3`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Google Search API failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Simple processing - just take the results as they are
    const existingSolutions = data.items?.slice(0, 3).map((item: any) => ({
      name: item.title,
      url: item.link,
      description: item.snippet,
      category: "Search Result"
    })) || []

    console.log("[Google Search] Found solutions:", existingSolutions.length)

    return NextResponse.json({
      existingSolutions,
      totalResults: data.searchInformation?.totalResults || 0
    })

  } catch (error) {
    console.error("[Google Search] Error:", error)

    // Return proper error response so frontend can handle it
    return NextResponse.json({
      error: "Google Search API is currently unavailable. Please try again later."
    }, { status: 500 })
  }
}