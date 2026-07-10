import * as cheerio from 'cheerio'
import type { JobListing, SearchPreferences } from '@/types/agent'
import type { JobSource } from './types'
import { withRetry } from '../retry'

const GUEST_SEARCH_URL =
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'

/** Result pages fetched per title/location (25 listings each). */
const PAGES = 3
const PAGE_SIZE = 25

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
}

/** Parses the HTML returned by LinkedIn's guest job search endpoint. */
export function parseLinkedInSearchHtml(html: string): JobListing[] {
  const $ = cheerio.load(html)
  const jobs: JobListing[] = []

  $('li').each((_, li) => {
    const card = $(li)
    const title = card.find('.base-search-card__title').text().trim()
    const company = card.find('.base-search-card__subtitle').text().trim()
    const location = card.find('.job-search-card__location').text().trim()
    const rawUrl = card.find('a.base-card__full-link').attr('href') || ''
    const postedAt = card.find('time').attr('datetime') || undefined
    if (!title || !rawUrl) return

    const url = rawUrl.split('?')[0]
    const urnMatch =
      card.find('[data-entity-urn]').attr('data-entity-urn') ||
      card.attr('data-entity-urn') ||
      ''
    const idFromUrn = urnMatch.split(':').pop()
    const idFromUrl = url.match(/-(\d+)$/)?.[1]
    const id = `linkedin-${idFromUrn || idFromUrl || url}`

    jobs.push({ id, source: 'linkedin', title, company, location, url, postedAt })
  })

  return jobs
}

async function searchLinkedIn(
  title: string,
  prefs: SearchPreferences
): Promise<JobListing[]> {
  const results: JobListing[] = []
  const locations = prefs.locations.length ? prefs.locations : ['']

  for (const location of locations) {
    for (let page = 0; page < PAGES; page++) {
      const params = new URLSearchParams({
        keywords: title,
        start: String(page * PAGE_SIZE),
        f_TPR: 'r86400', // last 24h
      })
      if (location) params.set('location', location)
      if (prefs.remoteOnly) params.set('f_WT', '2')

      const pageJobs = await withRetry(async () => {
        const response = await fetch(`${GUEST_SEARCH_URL}?${params}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(15000),
        })
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`LinkedIn HTTP ${response.status}`)
        }
        if (!response.ok) return []
        return parseLinkedInSearchHtml(await response.text())
      }, { attempts: 3 }).catch(() => [] as JobListing[])

      results.push(...pageJobs)
      if (pageJobs.length < PAGE_SIZE) break // last page reached
    }
  }

  return results
}

export const linkedinSource: JobSource = {
  id: 'linkedin',
  label: 'LinkedIn',
  requirement: 'No key needed (public guest search)',
  available: () => true,
  search: searchLinkedIn,
}
