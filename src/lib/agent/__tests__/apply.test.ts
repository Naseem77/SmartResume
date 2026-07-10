import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { ApplicationRecord } from '@/types/agent'
import { saveApplication } from '../store'
import { applyCollectedApplication, updateApplicationResume } from '../apply'

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

describe('updateApplicationResume', () => {
  it('replaces the resume, rebuilds the pdf, and persists', async () => {
    await saveApplication(makeRecord('edit-1', 'collected'), Buffer.from('%PDF-old'), '<html>old</html>')
    const render = vi.fn().mockResolvedValue(Buffer.from('%PDF-new'))

    const base = makeRecord('edit-1', 'collected').resume
    const updated = await updateApplicationResume(
      'edit-1',
      { ...base, summary: 'Edited summary', skills: ['React', 'Vue'] },
      render
    )

    expect(render).toHaveBeenCalledTimes(1)
    expect(updated.resume.summary).toBe('Edited summary')

    const dir = path.join(tmpDir, 'data', 'applications', 'edit-1')
    const saved = JSON.parse(await fs.readFile(path.join(dir, 'application.json'), 'utf-8'))
    expect(saved.resume.summary).toBe('Edited summary')
    expect(saved.resume.skills).toEqual(['React', 'Vue'])
    expect(await fs.readFile(path.join(dir, 'resume.pdf'), 'utf-8')).toBe('%PDF-new')
  })

  it('rejects editing an already applied record', async () => {
    await saveApplication(makeRecord('edit-2', 'applied'), Buffer.from('%PDF-x'))
    const base = makeRecord('edit-2', 'applied').resume
    await expect(updateApplicationResume('edit-2', base, vi.fn())).rejects.toThrow('Already applied')
  })

  it('throws for a missing application', async () => {
    const base = makeRecord('nope', 'collected').resume
    await expect(updateApplicationResume('missing-id', base, vi.fn())).rejects.toThrow('not found')
  })
})
