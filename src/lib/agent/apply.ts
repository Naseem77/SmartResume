import fs from 'fs/promises'
import path from 'path'
import type { ApplicationRecord } from '@/types/agent'
import type { TailoredResume } from '@/types/resume'
import { buildResumeHtml } from '@/lib/resumeTemplate'
import { renderPdf } from '@/lib/pdf'
import { pickApplier } from './appliers'
import { applicationDir, getApplication, saveApplication, appendLog } from './store'

/**
 * Applies a previously collected application using the saved resume PDF.
 * Updates and persists the record with the applier's result.
 */
export async function applyCollectedApplication(id: string): Promise<ApplicationRecord> {
  const record = await getApplication(id)
  if (!record) throw new Error('Application not found')
  if (record.status === 'applied') throw new Error('Already applied')

  const resumePdfPath = path.join(applicationDir(id), 'resume.pdf')
  const resumePdf = await fs.readFile(resumePdfPath)

  const applier = pickApplier(record.job)
  const result = await applier.apply({ job: record.job, resumePdf, resumePdfPath })

  record.status = result.status
  record.appliedVia = result.via
  record.appliedAt = new Date().toISOString()
  record.notes = result.notes
  await saveApplication(record)
  await appendLog(
    `Manual apply from dashboard: ${record.job.title} @ ${record.job.company} — status ${result.status} (via ${result.via})`
  )
  return record
}

/**
 * Replaces the resume of a not-yet-applied application and regenerates
 * its PDF so the edited version is what gets submitted.
 */
export async function updateApplicationResume(
  id: string,
  resume: TailoredResume,
  render: typeof renderPdf = renderPdf
): Promise<ApplicationRecord> {
  const record = await getApplication(id)
  if (!record) throw new Error('Application not found')
  if (record.status === 'applied') throw new Error('Already applied')

  const html = buildResumeHtml(resume)
  const pdf = await render(html)
  record.resume = resume
  await saveApplication(record, pdf, html)
  await appendLog(`Resume edited from dashboard: ${record.job.title} @ ${record.job.company}`)
  return record
}
