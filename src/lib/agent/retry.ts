/** Retry helper with exponential backoff for transient failures. */

export interface RetryOptions {
  attempts?: number
  baseDelayMs?: number
  /** Decides whether an error is worth retrying. Defaults to transient network/rate-limit errors. */
  isRetryable?: (error: unknown) => boolean
  sleep?: (ms: number) => Promise<void>
  onRetry?: (attempt: number, error: unknown) => void
}

export function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const status = (error as { status?: number })?.status
  if (status && (status === 429 || status >= 500)) return true
  return /(429|rate limit|timeout|timed out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|50[0-49]|overloaded)/i.test(
    message
  )
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 1000
  const isRetryable = options.isRetryable ?? isTransientError
  const sleep = options.sleep ?? defaultSleep

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === attempts || !isRetryable(error)) throw error
      options.onRetry?.(attempt, error)
      // Exponential backoff with jitter
      await sleep(baseDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random() * 0.5))
    }
  }
  throw lastError
}
