import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { Profile, GenerateResult } from '@/types/resume'
import type { JobListing, MatchResult } from '@/types/agent'
import { DEFAULT_PREFERENCES } from '../store'
import { generateWithAtsCheck, processJob } from '../pipeline'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartresume-pipeline-'))
  process.env.SMARTRESUME_DATA_DIR = tmpDir
})

afterEach(async () => {
  delete process.env.SMARTRESUME_DATA_DIR
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const profile: Profile = {
  name: 'Test User', email: 't@example.com', phone: '', location: '', linkedin: '', website: '',
  summary: 'Engineer', experience: [], education: [], skills: ['React'], projects: [],
}

function result(score: number, suggestions: string[] = []): GenerateResult {
  return {
    resume: { ...profile, summary: `attempt with score ${score}` },
    atsScore: {
      score,
      breakdown: { keywordMatch: score, sectionCompleteness: score, formattingCompliance: score, relevance: score },
      suggestions,
    },
    jobTitle: 'Frontend Engineer',
  }
}

const job: JobListing = {
  id: 'linkedin-1',
  source: 'linkedin',
  title: 'Frontend Engineer',
  company: 'Acme',
  location: 'Remote',
  url: 'https://example.com/job',
  description: 'A long enough job description. '.repeat(20),
}

const match: MatchResult = { fit: 85, reasons: ['strong skills overlap'], shouldApply: true }

describe('generateWithAtsCheck', () => {
  it('returns immediately when the first attempt clears the threshold', async () => {
    const generate = vi.fn().mockResolvedValue(result(90))
    const { result: out, attempts } = await generateWithAtsCheck(profile, 'desc', 'title', 75, generate)
    expect(attempts).toBe(1)
    expect(out.atsScore.score).toBe(90)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate).toHaveBeenCalledWith(profile, 'desc', 'title', undefined)
  })

  it('retries with feedback until threshold is met', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(60, ['add keywords']))
      .mockResolvedValueOnce(result(80))
    const { result: out, attempts } = await generateWithAtsCheck(profile, 'desc', 'title', 75, generate)
    expect(attempts).toBe(2)
    expect(out.atsScore.score).toBe(80)
    const feedback = generate.mock.calls[1][3]
    expect(feedback).toContain('add keywords')
    expect(feedback).toContain('60')
  })

  it('gives up after 3 attempts and returns the best result', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(result(50))
      .mockResolvedValueOnce(result(70))
      .mockResolvedValueOnce(result(65))
    const { result: out, attempts } = await generateWithAtsCheck(profile, 'desc', 'title', 90, generate)
    expect(attempts).toBe(3)
    expect(out.atsScore.score).toBe(70)
  })
})

describe('processJob', () => {
  it('runs the full pipeline and persists the application package', async () => {
    const generate = vi.fn().mockResolvedValue(result(88))
    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'))
    const scrape = vi.fn()

    const record = await processJob(job, profile, DEFAULT_PREFERENCES, match, {
      generate, pdf, scrape,
    })

    expect(scrape).not.toHaveBeenCalled() // description already present
    expect(record.status).toBe('prepared') // record applier fallback
    expect(record.appliedVia).toBe('record')
    expect(record.fitScore).toBe(85)
    expect(record.atsScore.score).toBe(88)

    const saved = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, 'data', 'applications', record.id, 'application.json'),
        'utf-8'
      )
    )
    expect(saved.job.company).toBe('Acme')
    const files = await fs.readdir(path.join(tmpDir, 'data', 'applications', record.id))
    expect(files.sort()).toEqual(['application.json', 'resume.html', 'resume.pdf'])
  })

  it('collects without applying when collectOnly is set', async () => {
    const generate = vi.fn().mockResolvedValue(result(88))
    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'))

    const record = await processJob(
      { ...job, id: 'linkedin-3' },
      profile, DEFAULT_PREFERENCES, match,
      { generate, pdf, collectOnly: true }
    )

    expect(record.status).toBe('collected')
    expect(record.appliedVia).toBe('none')
    const files = await fs.readdir(path.join(tmpDir, 'data', 'applications', record.id))
    expect(files.sort()).toEqual(['application.json', 'resume.html', 'resume.pdf'])
  })

  it('scrapes the job url when the description is missing', async () => {
    const generate = vi.fn().mockResolvedValue(result(88))
    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'))
    const scrape = vi.fn().mockResolvedValue({
      success: true,
      description: 'Scraped description. '.repeat(20),
    })

    const record = await processJob(
      { ...job, id: 'linkedin-2', description: undefined },
      profile, DEFAULT_PREFERENCES, match,
      { generate, pdf, scrape }
    )

    expect(scrape).toHaveBeenCalledWith(job.url)
    expect(record.job.description).toContain('Scraped description')
  })
})

describe('processJob cover letter', () => {
  it('generates and persists a cover letter when enabled', async () => {
    const generate = vi.fn().mockResolvedValue(result(88))
    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'))
    const generateCover = vi.fn().mockResolvedValue('Dear Acme, I am a great fit.')

    const record = await processJob(
      { ...job, id: 'linkedin-cover-1' },
      profile, DEFAULT_PREFERENCES, match,
      { generate, pdf, coverLetter: true, generateCover }
    )

    expect(generateCover).toHaveBeenCalledWith(profile, expect.any(String), job.title, job.company)
    expect(record.coverLetter).toBe('Dear Acme, I am a great fit.')
    const files = await fs.readdir(path.join(tmpDir, 'data', 'applications', record.id))
    expect(files).toContain('cover-letter.txt')
    const letter = await fs.readFile(
      path.join(tmpDir, 'data', 'applications', record.id, 'cover-letter.txt'),
      'utf-8'
    )
    expect(letter).toContain('great fit')
  })

  it('continues without a cover letter when generation fails', async () => {
    const generate = vi.fn().mockResolvedValue(result(88))
    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'))
    const generateCover = vi.fn().mockRejectedValue(new Error('llm down'))

    const record = await processJob(
      { ...job, id: 'linkedin-cover-2' },
      profile, DEFAULT_PREFERENCES, match,
      { generate, pdf, coverLetter: true, generateCover }
    )

    expect(record.coverLetter).toBeUndefined()
    expect(record.status).toBe('prepared')
  })

  it('skips cover letter when disabled', async () => {
    const generate = vi.fn().mockResolvedValue(result(88))
    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'))
    const generateCover = vi.fn()

    const record = await processJob(
      { ...job, id: 'linkedin-cover-3' },
      profile, DEFAULT_PREFERENCES, match,
      { generate, pdf, coverLetter: false, generateCover }
    )

    expect(generateCover).not.toHaveBeenCalled()
    expect(record.coverLetter).toBeUndefined()
  })
})
