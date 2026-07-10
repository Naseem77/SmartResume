import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { ApplicationRecord } from '@/types/agent'
import {
  applicationId,
  DEFAULT_PREFERENCES,
  getApplication,
  listApplications,
  loadPreferences,
  loadSeenJobs,
  loadStatus,
  saveApplication,
  savePreferences,
  saveSeenJobs,
  saveStatus,
  slugify,
} from '../store'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartresume-test-'))
  process.env.SMARTRESUME_DATA_DIR = tmpDir
})

afterEach(async () => {
  delete process.env.SMARTRESUME_DATA_DIR
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function makeRecord(id: string, appliedAt: string): ApplicationRecord {
  return {
    id,
    job: {
      id: `linkedin-${id}`,
      source: 'linkedin',
      title: 'Frontend Engineer',
      company: 'Acme',
      location: 'Remote',
      url: 'https://example.com/job',
    },
    status: 'applied',
    appliedVia: 'record',
    appliedAt,
    fitScore: 80,
    fitReasons: ['Good match'],
    atsScore: {
      score: 85,
      breakdown: { keywordMatch: 85, sectionCompleteness: 90, formattingCompliance: 90, relevance: 80 },
      suggestions: [],
    },
    atsAttempts: 1,
    resume: {
      name: 'Test', email: '', phone: '', location: '', linkedin: '', website: '',
      summary: '', experience: [], education: [], skills: [], projects: [],
    },
    resumePdfPath: '',
  }
}

describe('preferences', () => {
  it('returns defaults when no file exists', async () => {
    const prefs = await loadPreferences()
    expect(prefs).toEqual(DEFAULT_PREFERENCES)
  })

  it('round-trips saved preferences and merges defaults', async () => {
    await savePreferences({ ...DEFAULT_PREFERENCES, jobTitles: ['DevOps Engineer'], minAtsScore: 80 })
    const prefs = await loadPreferences()
    expect(prefs.jobTitles).toEqual(['DevOps Engineer'])
    expect(prefs.minAtsScore).toBe(80)
    expect(prefs.sources).toEqual(['linkedin'])
  })
})

describe('applications', () => {
  it('saves an application with pdf and html, then reads it back', async () => {
    const record = makeRecord('app-1', '2026-01-01T10:00:00Z')
    const dir = await saveApplication(record, Buffer.from('%PDF-fake'), '<html></html>')

    const files = await fs.readdir(dir)
    expect(files.sort()).toEqual(['application.json', 'resume.html', 'resume.pdf'])
    expect(record.resumePdfPath).toContain('resume.pdf')

    const loaded = await getApplication('app-1')
    expect(loaded?.job.company).toBe('Acme')
  })

  it('lists applications sorted by appliedAt desc and skips malformed dirs', async () => {
    await saveApplication(makeRecord('older', '2026-01-01T08:00:00Z'))
    await saveApplication(makeRecord('newer', '2026-01-02T08:00:00Z'))
    await fs.mkdir(path.join(tmpDir, 'data', 'applications', 'broken'), { recursive: true })

    const list = await listApplications()
    expect(list.map((r) => r.id)).toEqual(['newer', 'older'])
  })

  it('returns empty list when nothing exists', async () => {
    expect(await listApplications()).toEqual([])
  })
})

describe('seen jobs and status', () => {
  it('round-trips seen jobs', async () => {
    await saveSeenJobs(new Set(['a', 'b']))
    const seen = await loadSeenJobs()
    expect(seen.has('a')).toBe(true)
    expect(seen.size).toBe(2)
  })

  it('round-trips agent status', async () => {
    expect(await loadStatus()).toBeNull()
    await saveStatus({
      running: true, cycle: 2, jobsSeen: 5, jobsMatched: 1, applications: 1,
      updatedAt: new Date().toISOString(),
    })
    const status = await loadStatus()
    expect(status?.cycle).toBe(2)
  })
})

describe('ids', () => {
  it('slugifies text', () => {
    expect(slugify('Senior C++ Engineer @ Acme!')).toBe('senior-c-engineer-acme')
  })

  it('builds unique application ids even in the same second', () => {
    const a = applicationId('Acme Corp', 'Frontend Engineer')
    const b = applicationId('Acme Corp', 'Frontend Engineer')
    expect(a).toMatch(/_acme-corp_frontend-engineer_[a-z0-9]+$/)
    expect(a).not.toBe(b)
  })
})
