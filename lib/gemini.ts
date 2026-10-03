import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Shared Gemini helper: tries each configured key in turn, asks for JSON
 * output, and gives up after a timeout so a stuck request can't hang a page.
 */
const MODEL = 'gemini-3.5-flash'
const TIMEOUT_MS = 45_000

function getGeminiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter((k): k is string => Boolean(k))
}

export async function generateJson<T = unknown>(prompt: string): Promise<T> {
  const keys = getGeminiKeys()
  if (keys.length === 0) throw new Error('No Gemini API key configured')

  let lastError: unknown
  for (const key of keys) {
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel(
        { model: MODEL, generationConfig: { responseMimeType: 'application/json' } },
        { timeout: TIMEOUT_MS }
      )
      const result = await model.generateContent(prompt)
      return JSON.parse(result.response.text()) as T
    } catch (error) {
      lastError = error
      console.warn('[gemini] Request failed, trying the next key:', error instanceof Error ? error.message : error)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
