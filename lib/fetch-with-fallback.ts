/**
 * Generic fetch helper that returns the JSON response on success,
 * or invokes a fallback generator on network error or non-ok status.
 * Used by the stage-data loaders to eliminate duplicated try/catch patterns.
 */
export async function fetchWithFallback<T>(
  fetcher: () => Promise<Response>,
  fallback: () => Promise<T>,
  label = 'API call'
): Promise<T> {
  try {
    const response = await fetcher()
    if (response.ok) {
      return await response.json()
    }
    console.warn(`${label}: HTTP ${response.status} ${response.statusText}`)
  } catch (error) {
    console.error(`${label} failed:`, error)
  }
  return fallback()
}
