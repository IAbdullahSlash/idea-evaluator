/**
 * Shared idea validation — used by both the client (page.tsx) and the server (api/analyze/route.ts).
 * Keeping this in one place ensures client-side guardrails and server-side guardrails always agree.
 */

const MIN_IDEA_LENGTH = 15
const MIN_MEANINGFUL_WORDS = 2
const GIBBERISH_THRESHOLD = 0.6

export function validateIdea(idea: string): string | null {
  const trimmed = idea.trim()

  if (trimmed.length < MIN_IDEA_LENGTH) {
    return 'Idea is too short — please describe your project concept in more detail (at least 15 characters).'
  }

  const words = trimmed.toLowerCase().match(/\b[a-z]+\b/g) || []
  if (words.length < MIN_MEANINGFUL_WORDS) {
    return 'Not enough meaningful content to analyze. Please describe your project idea.'
  }

  const gibberishRatio = words.filter((w) => w.length <= 2).length / words.length
  if (gibberishRatio > GIBBERISH_THRESHOLD) {
    return 'Your input looks like gibberish or random text — please describe a real project idea.'
  }

  // Only reject input that is clearly not an idea. Topics (crypto, finance) and links are fine.
  const spamPatterns = [
    // One long unbroken token with no spaces, like "asdkjhqwe123"
    /^[a-z0-9]{10,}$/i,
    // The same letter five or more times: "aaaaa" (punctuation like "....." is fine)
    /([a-z])\1{4,}/i,
  ]

  for (const pattern of spamPatterns) {
    if (pattern.test(trimmed)) {
      return "That doesn't look like a project idea yet. Describe what it does and who it is for."
    }
  }

  return null
}
