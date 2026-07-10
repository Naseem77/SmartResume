import type { JobListing, SearchPreferences } from '@/types/agent'
import type { JobSource } from './types'

/**
 * Glassdoor Partner API adapter. Requires GLASSDOOR_PARTNER_ID and
 * GLASSDOOR_API_KEY in env. https://www.glassdoor.com/developer/index.htm
 */
async function searchGlassdoor(
  title: string,
  prefs: SearchPreferences
): Promise<JobListing[]> {
  const partnerId = process.env.GLASSDOOR_PARTNER_ID
  const key = process.env.GLASSDOOR_API_KEY
  if (!partnerId || !key) return []

  const results: JobListing[] = []
  const locations = prefs.locations.length ? prefs.locations : ['']

  for (const location of locations) {
    const params = new URLSearchParams({
      't.p': partnerId,
      't.k': key,
      userip: '0.0.0.0',
      useragent: 'SmartResume',
      format: 'json',
      v: '1',
      action: 'jobs',
      q: title,
      l: location,
    })
    const response = await fetch(
      `https://api.glassdoor.com/api/api.htm?${params}`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (!response.ok) continue
    const data = await response.json()
    for (const job of data.response?.results || []) {
      results.push({
        id: `glassdoor-${job.jobId || job.id}`,
        source: 'glassdoor',
        title: job.jobTitle || title,
        company: job.employerName || '',
        location: job.location || location,
        url: job.jobViewUrl || '',
        description: job.descriptionFragment,
      })
    }
  }
  return results
}

export const glassdoorSource: JobSource = {
  id: 'glassdoor',
  label: 'Glassdoor',
  requirement: 'Set GLASSDOOR_PARTNER_ID and GLASSDOOR_API_KEY in .env.local',
  available: () =>
    Boolean(process.env.GLASSDOOR_PARTNER_ID && process.env.GLASSDOOR_API_KEY),
  search: searchGlassdoor,
}
