type RateWindow = { count: number; resetAt: number }
const summaryWindows = new Map<string, RateWindow>()

// Best-effort per-process guard. Production deployments should also apply platform-level
// rate limits because serverless instances do not share memory.
export function allowSummaryRequest(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const current = summaryWindows.get(key)
  if (!current || current.resetAt <= now) {
    summaryWindows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}
