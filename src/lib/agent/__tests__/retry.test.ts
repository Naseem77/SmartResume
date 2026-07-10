import { describe, it, expect, vi } from 'vitest'
import { withRetry, isTransientError } from '../retry'

const noSleep = () => Promise.resolve()

describe('isTransientError', () => {
  it('detects rate limit and server errors', () => {
    expect(isTransientError(new Error('429 Too Many Requests'))).toBe(true)
    expect(isTransientError(new Error('Request timed out'))).toBe(true)
    expect(isTransientError(new Error('fetch failed'))).toBe(true)
    expect(isTransientError(Object.assign(new Error('boom'), { status: 503 }))).toBe(true)
  })

  it('rejects permanent errors', () => {
    expect(isTransientError(new Error('Invalid API key'))).toBe(false)
    expect(isTransientError(Object.assign(new Error('bad'), { status: 400 }))).toBe(false)
  })
})

describe('withRetry', () => {
  it('returns result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { sleep: noSleep })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries transient errors then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('ok')
    const onRetry = vi.fn()
    const result = await withRetry(fn, { attempts: 3, sleep: noSleep, onRetry })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('throws after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('503 unavailable'))
    await expect(withRetry(fn, { attempts: 2, sleep: noSleep })).rejects.toThrow('503')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid API key'))
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow('Invalid API key')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses exponential backoff delays', async () => {
    const delays: number[] = []
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('ok')
    await withRetry(fn, {
      attempts: 3,
      baseDelayMs: 100,
      sleep: (ms) => {
        delays.push(ms)
        return Promise.resolve()
      },
    })
    expect(delays).toHaveLength(2)
    // jittered between 50-100% of 100 and 200
    expect(delays[0]).toBeGreaterThanOrEqual(50)
    expect(delays[0]).toBeLessThanOrEqual(100)
    expect(delays[1]).toBeGreaterThanOrEqual(100)
    expect(delays[1]).toBeLessThanOrEqual(200)
  })
})
