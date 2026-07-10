import fs from 'fs/promises'
import path from 'path'
import type { Profile } from '@/types/resume'
import type { AgentConfig, AgentStatus } from '@/types/agent'
import { searchAllSources } from './sources'
import { matchJob, prefilterJob } from './matcher'
import { processJob, type PipelineDeps } from './pipeline'
import {
  appendLog,
  loadPreferences,
  loadSeenJobs,
  saveSeenJobs,
  saveStatus,
} from './store'

export interface RunnerDeps extends PipelineDeps {
  search?: typeof searchAllSources
  match?: typeof matchJob
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

async function loadProfile(): Promise<Profile> {
  const profilePath = path.join(
    process.env.SMARTRESUME_DATA_DIR || process.cwd(),
    'personaldata',
    'profile.json'
  )
  const raw = await fs.readFile(profilePath, 'utf-8')
  return JSON.parse(raw)
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Runs the auto-apply agent for `config.hours` hours: search enabled
 * sources → dedupe seen jobs → LLM fit check → resume pipeline → apply →
 * record. Writes live status to data/agent-status.json and logs to
 * data/agent.log. Stops early after `config.maxApplications` applications
 * or on SIGINT/SIGTERM.
 */
export async function runAgent(
  config: AgentConfig,
  deps: RunnerDeps = {}
): Promise<AgentStatus> {
  const search = deps.search ?? searchAllSources
  const match = deps.match ?? matchJob
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? defaultSleep

  const log = async (msg: string) => {
    deps.log?.(msg)
    await appendLog(msg)
  }

  const prefs = await loadPreferences()
  if (prefs.jobTitles.length === 0) {
    throw new Error(
      'No job titles configured. Set them in the dashboard (Preferences) or personaldata/preferences.json.'
    )
  }
  const profile = await loadProfile()

  const startedAt = now()
  const endsAt = startedAt + config.hours * 60 * 60 * 1000
  const pollMs = Math.max(1, config.pollMinutes) * 60 * 1000
  const seen = await loadSeenJobs()

  let stopRequested = false
  const requestStop = () => {
    stopRequested = true
  }
  process.on('SIGINT', requestStop)
  process.on('SIGTERM', requestStop)

  const status: AgentStatus = {
    running: true,
    pid: process.pid,
    startedAt: new Date(startedAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    hours: config.hours,
    cycle: 0,
    jobsSeen: 0,
    jobsMatched: 0,
    applications: 0,
    updatedAt: new Date().toISOString(),
  }

  const update = async (activity?: string) => {
    if (activity) status.lastActivity = activity
    status.updatedAt = new Date().toISOString()
    await saveStatus(status)
  }

  await log(
    `Agent started: ${config.hours}h run, polling every ${config.pollMinutes}min, titles: ${prefs.jobTitles.join(', ')}`
  )
  await update('Agent started')

  try {
    while (now() < endsAt && !stopRequested && status.applications < config.maxApplications) {
      status.cycle++
      await update(`Cycle ${status.cycle}: searching job boards`)

      const jobs = await search(prefs, (msg) => void log(msg))
      const fresh = jobs.filter((job) => !seen.has(job.id))
      status.jobsSeen += fresh.length
      await log(`Cycle ${status.cycle}: ${jobs.length} listings, ${fresh.length} new`)

      for (const job of fresh) {
        if (now() >= endsAt || stopRequested) break
        if (status.applications >= config.maxApplications) break

        seen.add(job.id)

        try {
          if (!prefilterJob(job, prefs)) {
            await log(`Skipped (keyword filter): ${job.title} @ ${job.company}`)
            continue
          }

          await update(`Checking fit: ${job.title} @ ${job.company}`)
          const fit = await match(profile, job, prefs)
          if (!fit.shouldApply) {
            await log(`Skipped (fit ${fit.fit} < ${prefs.minFitScore}): ${job.title} @ ${job.company}`)
            continue
          }

          status.jobsMatched++
          await update(`Applying: ${job.title} @ ${job.company} (fit ${fit.fit})`)
          const record = await processJob(job, profile, prefs, fit, {
            ...deps,
            log: (msg) => void log(msg),
          })
          status.applications++
          await log(
            `Application recorded: ${record.job.title} @ ${record.job.company} — status ${record.status}, ATS ${record.atsScore.score}`
          )
          await update()
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          status.lastError = msg
          await log(`Error on ${job.title} @ ${job.company}: ${msg}`)
        } finally {
          await saveSeenJobs(seen)
        }
      }

      if (now() < endsAt && !stopRequested && status.applications < config.maxApplications) {
        const remaining = endsAt - now()
        const wait = Math.min(pollMs, remaining)
        if (wait <= 0) break
        await update(`Sleeping ${Math.round(wait / 60000)}min until next cycle`)
        await sleep(wait)
      }
    }
  } finally {
    process.off('SIGINT', requestStop)
    process.off('SIGTERM', requestStop)
    status.running = false
    await update(
      stopRequested
        ? 'Stopped by user'
        : status.applications >= config.maxApplications
          ? 'Stopped: reached max applications'
          : 'Finished: time window elapsed'
    )
    await log(
      `Agent stopped. Cycles: ${status.cycle}, new jobs seen: ${status.jobsSeen}, matched: ${status.jobsMatched}, applications: ${status.applications}`
    )
  }

  return status
}
