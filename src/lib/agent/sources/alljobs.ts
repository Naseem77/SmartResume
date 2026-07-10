import * as cheerio from 'cheerio'
import type { JobListing, SearchPreferences } from '@/types/agent'
import type { JobSource } from './types'

/**
 * AllJobs (alljobs.co.il) best-effort HTML scraper. No API key needed,
 * but the site may block automated requests. Enable via preferences.
 */
export function parseAllJobsHtml(html: string): JobListing[] {
  const $ = cheerio.load(html)
  const jobs: JobListing[] = []

  $('[class*="job-content-top"], [class*="JobItem"]').each((_, el) => {
    const card = $(el)
    const link = card.find('a[href*="UploadSingle"], a[href*="Search/UploadSingle"]').first()
    const title = link.text().trim() || card.find('h3, h2').first().text().trim()
    const href = link.attr('href') || ''
    if (!title || !href) return
    const url = href.startsWith('http') ? href : `https://www.alljobs.co.il${href}`
    const company = card.find('[class*="T14"] a, [class*="company"]').first().text().trim()
    const location = card.find('[class*="job-content-top-location"] a').first().text().trim()
    const id = `alljobs-${url.match(/JobID=(\d+)/i)?.[1] || url}`
    jobs.push({ id, source: 'alljobs', title, company, location, url })
  })

  return jobs
}

async function searchAllJobs(
  title: string,
  prefs: SearchPreferences
): Promise<JobListing[]> {
  void prefs
  const params = new URLSearchParams({ freetxt: title, type: '' })
  const response = await fetch(
    `https://www.alljobs.co.il/SearchResultsGuest.aspx?${params}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!response.ok) return []
  return parseAllJobsHtml(await response.text())
}

export const alljobsSource: JobSource = {
  id: 'alljobs',
  label: 'AllJobs',
  requirement: 'No key needed (best-effort scrape)',
  available: () => true,
  search: searchAllJobs,
}
