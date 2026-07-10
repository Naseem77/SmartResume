import { describe, expect, it } from 'vitest'
import { parseLinkedInSearchHtml } from '../sources/linkedin'
import { parseAllJobsHtml } from '../sources/alljobs'

const LINKEDIN_FIXTURE = `
<ul>
  <li>
    <div class="base-card" data-entity-urn="urn:li:jobPosting:4123456789">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/frontend-engineer-at-acme-4123456789?refId=abc">link</a>
      <h3 class="base-search-card__title"> Frontend Engineer </h3>
      <h4 class="base-search-card__subtitle"> Acme Corp </h4>
      <span class="job-search-card__location">Tel Aviv, Israel</span>
      <time datetime="2026-07-09"></time>
    </div>
  </li>
  <li>
    <div class="base-card">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/backend-dev-at-globex-4987654321">link</a>
      <h3 class="base-search-card__title">Backend Developer</h3>
      <h4 class="base-search-card__subtitle">Globex</h4>
      <span class="job-search-card__location">Remote</span>
    </div>
  </li>
  <li><div class="junk">no job here</div></li>
</ul>`

describe('parseLinkedInSearchHtml', () => {
  it('parses job cards with urn ids, trimmed fields, and clean urls', () => {
    const jobs = parseLinkedInSearchHtml(LINKEDIN_FIXTURE)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toMatchObject({
      id: 'linkedin-4123456789',
      source: 'linkedin',
      title: 'Frontend Engineer',
      company: 'Acme Corp',
      location: 'Tel Aviv, Israel',
      url: 'https://www.linkedin.com/jobs/view/frontend-engineer-at-acme-4123456789',
      postedAt: '2026-07-09',
    })
    expect(jobs[1].id).toBe('linkedin-4987654321')
  })

  it('returns empty array for empty html', () => {
    expect(parseLinkedInSearchHtml('<ul></ul>')).toEqual([])
  })
})

const ALLJOBS_FIXTURE = `
<div class="job-content-top">
  <h3><a href="/Search/UploadSingle.aspx?JobID=555123">QA Engineer</a></h3>
  <div class="T14"><a href="/company">TestCo Ltd</a></div>
  <div class="job-content-top-location"><a href="#">Haifa</a></div>
</div>`

describe('parseAllJobsHtml', () => {
  it('parses alljobs cards with absolute urls and ids', () => {
    const jobs = parseAllJobsHtml(ALLJOBS_FIXTURE)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      id: 'alljobs-555123',
      source: 'alljobs',
      title: 'QA Engineer',
      company: 'TestCo Ltd',
      location: 'Haifa',
      url: 'https://www.alljobs.co.il/Search/UploadSingle.aspx?JobID=555123',
    })
  })
})
