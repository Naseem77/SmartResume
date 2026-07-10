import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { GenerateResult, Profile } from '@/types/resume'
import type { JobListing } from '@/types/agent'
import { DEFAULT_PREFERENCES } from '../store'
import { runAgent } from '../runner'

let tmpDir: string

const profile: Profile = {
  name: 'Test User', email: 't@example.com', phone: '', location: '', linkedin: '', website: '',
  summary: 'Engineer', experience: [], education: [], skills: ['React'], projects: [],
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartresume-runner-'))
  process.env.SMARTRESUME_DATA_DIR = tmpDir
  await fs.mkdir(path.join(tmpDir, 'personaldata'), { recursive: true })
  await fs.writeFile(path.join(tmpDir, 'personaldata', 'profile.json'), JSON.stringify(profile))
  await fs.writeFile(
    path.join(tmpDir, 'personaldata', 'preferences.json'),
    JSON.stringify({ ...DEFAULT_PREFERENCES, jobTitles: ['Frontend Engineer'], minFitScore: 60 })
  )
})

afterEach(async () => {
  delete process.env.SMARTRESUME_DATA_DIR
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const listing = (id: string): JobListing => ({
  id,
  source: 'linkedin',
  title: 'Frontend Engineer',
  company: 'Acme',
  location: 'Remote',
  url: 'https://example.com/job',
  description: 'A long enough description. '.repeat(20),
})

const generated: GenerateResult = {
  resume: profile,
  atsScore: {
    score: 90,
    breakdown: { keywordMatch: 90, sectionCompleteness: 90, formattingCompliance: 90, relevance: 90 },
    suggestions: [],
  },
  jobTitle: 'Frontend Engineer',
}

function makeDeps(over: Record<string, unknown> = {}) {
  // Fake clock: advances 10 minutes per call so the 1-hour window ends quickly
  let clock = 0
  const now = vi.fn(() => {
    clock += 10 * 60 * 1000
    return clock
  })
  return {
    search: vi.fn().mockResolvedValue([listing('job-1'), listing('job-2')]),
    match: vi.fn().mockResolvedValue({ fit: 85, reasons: ['fits'], shouldApply: true }),
    generate: vi.fn().mockResolvedValue(generated),
    pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
    scrape: vi.fn(),
    sleep: vi.fn().mockResolvedValue(undefined),
    now,
    ...over,
  }
}

describe('runAgent', () => {
  it('throws when no job titles are configured', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'personaldata', 'preferences.json'),
      JSON.stringify({ ...DEFAULT_PREFERENCES, jobTitles: [] })
    )
    await expect(runAgent({ hours: 1, pollMinutes: 1, maxApplications: 5 }, makeDeps())).rejects.toThrow(
      /No job titles/
    )
  })

  it('searches, matches, applies, and records status until time runs out', async () => {
    const deps = makeDeps()
    const status = await runAgent({ hours: 1, pollMinutes: 1, maxApplications: 10 }, deps)

    expect(deps.search).toHaveBeenCalled()
    expect(status.running).toBe(false)
    expect(status.applications).toBe(2)
    expect(status.jobsMatched).toBe(2)

    const apps = await fs.readdir(path.join(tmpDir, 'data', 'applications'))
    expect(apps.length).toBe(2)

    const seen = JSON.parse(await fs.readFile(path.join(tmpDir, 'data', 'seen-jobs.json'), 'utf-8'))
    expect(seen).toContain('job-1')
    expect(seen).toContain('job-2')
  })

  it('stops after reaching maxApplications', async () => {
    const deps = makeDeps()
    const status = await runAgent({ hours: 1, pollMinutes: 1, maxApplications: 1 }, deps)
    expect(status.applications).toBe(1)
    expect(status.lastActivity).toContain('max applications')
  })

  it('skips low-fit jobs without applying', async () => {
    const deps = makeDeps({
      match: vi.fn().mockResolvedValue({ fit: 20, reasons: ['weak match'], shouldApply: false }),
    })
    const status = await runAgent({ hours: 1, pollMinutes: 1, maxApplications: 5 }, deps)
    expect(status.applications).toBe(0)
    expect(status.jobsMatched).toBe(0)
  })

  it('does not reprocess jobs already seen', async () => {
    await fs.mkdir(path.join(tmpDir, 'data'), { recursive: true })
    await fs.writeFile(path.join(tmpDir, 'data', 'seen-jobs.json'), JSON.stringify(['job-1', 'job-2']))
    const deps = makeDeps()
    const status = await runAgent({ hours: 1, pollMinutes: 1, maxApplications: 5 }, deps)
    expect(status.applications).toBe(0)
    expect(deps.match).not.toHaveBeenCalled()
  })

  it('keeps running when a single job fails', async () => {
    const deps = makeDeps({
      generate: vi
        .fn()
        .mockRejectedValueOnce(new Error('LLM exploded'))
        .mockResolvedValue(generated),
    })
    const status = await runAgent({ hours: 1, pollMinutes: 1, maxApplications: 5 }, deps)
    expect(status.applications).toBe(1)
    expect(status.lastError).toContain('LLM exploded')
  })
})
