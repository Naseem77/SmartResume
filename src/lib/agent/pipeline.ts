import type { Profile, GenerateResult } from '@/types/resume'
import type {
  ApplicationRecord,
  ApplicationStatus,
  JobListing,
  MatchResult,
  SearchPreferences,
} from '@/types/agent'
import { generateTailoredResume } from '@/lib/ai'
import { scrapeJobUrl } from '@/lib/scraper'
import { buildResumeHtml } from '@/lib/resumeTemplate'
import { renderPdf } from '@/lib/pdf'
import { pickApplier } from './appliers'
import { applicationDir, applicationId, saveApplication } from './store'
import path from 'path'

const MAX_ATS_ATTEMPTS = 3

export interface PipelineDeps {
  generate?: typeof generateTailoredResume
  scrape?: typeof scrapeJobUrl
  pdf?: typeof renderPdf
  /** When true, skip applying: save the package and let the user apply from the dashboard. Defaults to COLLECT_ONLY env. */
  collectOnly?: boolean
  log?: (msg: string) => void
}

/**
 * Generates a tailored resume and re-generates with the ATS suggestions as
 * feedback until the score clears the threshold or attempts run out.
 * Returns the best attempt.
 */
export async function generateWithAtsCheck(
  profile: Profile,
  description: string,
  jobTitle: string,
  minAtsScore: number,
  generate: typeof generateTailoredResume = generateTailoredResume,
  log: (msg: string) => void = () => {}
): Promise<{ result: GenerateResult; attempts: number }> {
  let best: GenerateResult | null = null
  let feedback: string | undefined
  let attempts = 0

  for (let i = 0; i < MAX_ATS_ATTEMPTS; i++) {
    attempts++
    const result = await generate(profile, description, jobTitle, feedback)
    if (!best || result.atsScore.score > best.atsScore.score) best = result

    log(`ATS attempt ${attempts}: score ${result.atsScore.score}`)
    if (result.atsScore.score >= minAtsScore) return { result, attempts }

    feedback = `Previous ATS score was ${result.atsScore.score} (target: ${minAtsScore}+). Fix these issues:\n- ${result.atsScore.suggestions.join('\n- ')}`
  }

  return { result: best!, attempts }
}

/**
 * Full per-job pipeline: fetch description → tailor resume with ATS check →
 * render PDF → apply → persist everything under data/applications/<id>/.
 */
export async function processJob(
  job: JobListing,
  profile: Profile,
  prefs: SearchPreferences,
  match: MatchResult,
  deps: PipelineDeps = {}
): Promise<ApplicationRecord> {
  const generate = deps.generate ?? generateTailoredResume
  const scrape = deps.scrape ?? scrapeJobUrl
  const pdf = deps.pdf ?? renderPdf
  const log = deps.log ?? (() => {})

  // 1. Job description
  let description = job.description || ''
  if (description.length < 200 && job.url) {
    const scraped = await scrape(job.url)
    if (scraped.success && scraped.description) description = scraped.description
  }
  if (description.length < 100) {
    description = `${job.title} at ${job.company}, ${job.location}. (Full description unavailable.)`
  }
  job.description = description

  // 2. Tailored resume with ATS fix loop
  const { result, attempts } = await generateWithAtsCheck(
    profile,
    description,
    job.title,
    prefs.minAtsScore,
    generate,
    log
  )

  // 3. PDF
  const html = buildResumeHtml(result.resume, job.title)
  const pdfBuffer = await pdf(html)

  // 4. Apply (or collect for manual one-click apply from the dashboard)
  const collectOnly = deps.collectOnly ?? process.env.COLLECT_ONLY === 'true'
  const id = applicationId(job.company || 'unknown', job.title)
  const resumePdfPath = path.join(applicationDir(id), 'resume.pdf')
  let applyResult: { status: ApplicationStatus; via: string; notes?: string }
  if (collectOnly) {
    log('Collect-only mode: saving without applying')
    applyResult = {
      status: 'collected',
      via: 'none',
      notes: 'Collected by the agent. Click Apply on the dashboard when you are ready.',
    }
  } else {
    const applier = pickApplier(job)
    log(`Applying via ${applier.id}`)
    applyResult = await applier.apply({ job, resumePdf: pdfBuffer, resumePdfPath })
  }

  // 5. Persist
  const record: ApplicationRecord = {
    id,
    job,
    status: applyResult.status,
    appliedVia: applyResult.via,
    appliedAt: new Date().toISOString(),
    fitScore: match.fit,
    fitReasons: match.reasons,
    atsScore: result.atsScore,
    atsAttempts: attempts,
    resume: result.resume,
    resumePdfPath,
    notes: applyResult.notes,
  }
  await saveApplication(record, pdfBuffer, html)
  log(`Saved application ${id} (${applyResult.status})`)

  return record
}
