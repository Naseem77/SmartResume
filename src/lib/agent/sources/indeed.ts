import type { JobListing, SearchPreferences } from '@/types/agent'
import type { JobSource } from './types'

/**
 * Indeed Publisher API adapter. Requires INDEED_PUBLISHER_ID in env.
 * https://ads.indeed.com/jobroll
 */
async function searchIndeed(
  title: string,
  prefs: SearchPreferences
): Promise<JobListing[]> {
  const publisherId = process.env.INDEED_PUBLISHER_ID
  if (!publisherId) return []

  const results: JobListing[] = []
  const locations = prefs.locations.length ? prefs.locations : ['']

  for (const location of locations) {
    const params = new URLSearchParams({
      publisher: publisherId,
      q: title,
      l: location,
      format: 'json',
      v: '2',
      limit: '25',
      fromage: '1',
    })
    const response = await fetch(`https://api.indeed.com/ads/apisearch?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) continue
    const data = await response.json()
    for (const job of data.results || []) {
      results.push({
        id: `indeed-${job.jobkey}`,
        source: 'indeed',
        title: job.jobtitle,
        company: job.company,
        location: job.formattedLocation || location,
        url: job.url,
        postedAt: job.date,
        description: job.snippet,
      })
    }
  }
  return results
}

export const indeedSource: JobSource = {
  id: 'indeed',
  label: 'Indeed',
  requirement: 'Set INDEED_PUBLISHER_ID in .env.local',
  available: () => Boolean(process.env.INDEED_PUBLISHER_ID),
  search: searchIndeed,
}
