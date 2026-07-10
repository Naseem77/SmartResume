import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { ApplicationRecord } from '@/types/agent'
import { saveApplication } from '../store'
import { applyCollectedApplication } from '../apply'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartresume-apply-'))
  process.env.SMARTRESUME_DATA_DIR = tmpDir
})

afterEach(async () => {
  delete process.env.SMARTRESUME_DATA_DIR
  await fs.rm(tmpDir, { recursive: true, force: true })
})

function makeRecord(id: string, status: ApplicationRecord['status']): ApplicationRecord {
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
    status,
    appliedVia: 'none',
    appliedAt: '2026-01-01T10:00:00Z',
    fitScore: 80,
    fitReasons: [],
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

describe('applyCollectedApplication', () => {
  it('applies a collected record via the record applier and persists the update', async () => {
    await saveApplication(makeRecord('app-1', 'collected'), Buffer.from('%PDF-fake'))

    const updated = await applyCollectedApplication('app-1')
    // No AUTO_APPLY creds in tests, so the record applier marks it prepared
    expect(updated.status).toBe('prepared')
    expect(updated.appliedVia).toBe('record')

    const raw = JSON.parse(
      await fs.readFile(path.join(tmpDir, 'data', 'applications', 'app-1', 'application.json'), 'utf-8')
    )
    expect(raw.status).toBe('prepared')
  })

  it('throws for unknown applications', async () => {
    await expect(applyCollectedApplication('nope')).rejects.toThrow('Application not found')
  })

  it('refuses to re-apply an already applied record', async () => {
    await saveApplication(makeRecord('app-2', 'applied'), Buffer.from('%PDF-fake'))
    await expect(applyCollectedApplication('app-2')).rejects.toThrow('Already applied')
  })
})
