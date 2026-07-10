import { describe, expect, it } from 'vitest'
import type { JobListing, SearchPreferences } from '@/types/agent'
import { DEFAULT_PREFERENCES } from '../store'
import { parseMatchResponse, prefilterJob } from '../matcher'

const job = (over: Partial<JobListing> = {}): JobListing => ({
  id: 'linkedin-1',
  source: 'linkedin',
  title: 'React Developer',
  company: 'Acme',
  location: 'Tel Aviv',
  url: 'https://example.com',
  description: 'We need a React and TypeScript developer.',
  ...over,
})

const prefs = (over: Partial<SearchPreferences> = {}): SearchPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...over,
})

describe('prefilterJob', () => {
  it('passes when no keywords configured', () => {
    expect(prefilterJob(job(), prefs())).toBe(true)
  })

  it('rejects excluded keywords case-insensitively', () => {
    expect(prefilterJob(job(), prefs({ excludeKeywords: ['REACT'] }))).toBe(false)
  })

  it('requires at least one include keyword when set', () => {
    expect(prefilterJob(job(), prefs({ keywords: ['typescript'] }))).toBe(true)
    expect(prefilterJob(job(), prefs({ keywords: ['golang'] }))).toBe(false)
  })

  it('searches title when description is missing', () => {
    expect(prefilterJob(job({ description: undefined }), prefs({ keywords: ['react'] }))).toBe(true)
  })
})

describe('parseMatchResponse', () => {
  it('parses a plain JSON response', () => {
    const result = parseMatchResponse('{"fit": 82, "reasons": ["skills align"]}', 60)
    expect(result).toEqual({ fit: 82, reasons: ['skills align'], shouldApply: true })
  })

  it('strips markdown fences and clamps fit', () => {
    const result = parseMatchResponse('```json\n{"fit": 130, "reasons": []}\n```', 60)
    expect(result.fit).toBe(100)
  })

  it('marks below-threshold jobs as skip', () => {
    const result = parseMatchResponse('{"fit": 40, "reasons": []}', 60)
    expect(result.shouldApply).toBe(false)
  })

  it('defaults invalid fit to 0', () => {
    const result = parseMatchResponse('{"fit": "n/a"}', 60)
    expect(result.fit).toBe(0)
    expect(result.reasons).toEqual([])
  })
})
