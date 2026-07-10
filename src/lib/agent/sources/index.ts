import type { JobListing, JobSourceId, SearchPreferences } from '@/types/agent'
import type { JobSource } from './types'
import { linkedinSource } from './linkedin'
import { indeedSource } from './indeed'
import { glassdoorSource } from './glassdoor'
import { alljobsSource } from './alljobs'

export const SOURCES: Record<JobSourceId, JobSource> = {
  linkedin: linkedinSource,
  indeed: indeedSource,
  glassdoor: glassdoorSource,
  alljobs: alljobsSource,
}

export function enabledSources(prefs: SearchPreferences): JobSource[] {
  return prefs.sources
    .map((id) => SOURCES[id])
    .filter((source): source is JobSource => Boolean(source?.available()))
}

/** Searches all enabled sources for all preferred titles, deduped by job id. */
export async function searchAllSources(
  prefs: SearchPreferences,
  log: (msg: string) => void = () => {}
): Promise<JobListing[]> {
  const sources = enabledSources(prefs)
  const byId = new Map<string, JobListing>()

  for (const source of sources) {
    for (const title of prefs.jobTitles) {
      try {
        const jobs = await source.search(title, prefs)
        log(`${source.label}: "${title}" → ${jobs.length} listings`)
        for (const job of jobs) {
          if (!byId.has(job.id)) byId.set(job.id, job)
        }
      } catch (error) {
        log(
          `${source.label}: "${title}" failed — ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
  }

  return [...byId.values()]
}
