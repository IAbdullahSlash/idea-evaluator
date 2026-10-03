import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Small shared Gemini helper: tries each configured key in turn and asks for
 * JSON output, so callers get a parsed object back or an error.
 */
const MODEL = 'gemini-3.5-flash'

function getGeminiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter((k): k is string => Boolean(k))
}

export async function generateJson<T>(prompt: string): Promise<T> {
  const keys = getGeminiKeys()
  if (keys.length === 0) throw new Error('No Gemini API key configured')

  let lastError: unknown
  for (const key of keys) {
    try {
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: MODEL,
        generationConfig: { responseMimeType: 'application/json' },
      })
      const result = await model.generateContent(prompt)
      return JSON.parse(result.response.text()) as T
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
