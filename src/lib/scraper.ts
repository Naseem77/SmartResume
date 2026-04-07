import * as cheerio from 'cheerio'

export interface ScrapeResult {
  success: boolean
  jobTitle?: string
  company?: string
  description?: string
  error?: string
}

export async function scrapeJobUrl(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    $('script, style, nav, header, footer, aside').remove()

    const jobTitle =
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim()

    const descriptionSelectors = [
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="description"]',
      '[id*="job-description"]',
      '[id*="jobDescription"]',
      'article',
      'main',
    ]

    let description = ''
    for (const selector of descriptionSelectors) {
      const text = $(selector).first().text().trim()
      if (text.length > 200) {
        description = text
        break
      }
    }

    if (!description) {
      description = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000)
    }

    if (!description || description.length < 100) {
      return { success: false, error: 'Could not extract job description' }
    }

    return { success: true, jobTitle, description }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Scrape failed' }
  }
}
