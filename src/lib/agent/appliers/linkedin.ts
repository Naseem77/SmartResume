import type { Applier, ApplyInput, ApplyResult } from './types'

/**
 * Best-effort LinkedIn Easy Apply automation with Puppeteer.
 * Enabled only when AUTO_APPLY=true and LINKEDIN_EMAIL/LINKEDIN_PASSWORD
 * are set. Handles simple one-step Easy Apply flows (resume upload +
 * submit). Multi-step applications with custom questions are left for
 * manual review and marked "needs_manual".
 *
 * Note: automating logins may violate LinkedIn's terms of service and can
 * trigger captchas or account checks. Use at your own risk.
 */
export const linkedinApplier: Applier = {
  id: 'linkedin-easy-apply',

  canApply(job): boolean {
    return (
      job.source === 'linkedin' &&
      process.env.AUTO_APPLY === 'true' &&
      Boolean(process.env.LINKEDIN_EMAIL && process.env.LINKEDIN_PASSWORD)
    )
  },

  async apply(input: ApplyInput): Promise<ApplyResult> {
    const puppeteer = (await import('puppeteer')).default
    const browser = await puppeteer.launch({
      headless: process.env.AUTO_APPLY_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 900 })

      // Log in
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' })
      await page.type('#username', process.env.LINKEDIN_EMAIL!, { delay: 30 })
      await page.type('#password', process.env.LINKEDIN_PASSWORD!, { delay: 30 })
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      ])

      if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
        return {
          status: 'needs_manual',
          via: 'linkedin-easy-apply',
          notes: 'LinkedIn asked for a security check. Apply manually with the saved resume.',
        }
      }

      // Open job and click Easy Apply
      await page.goto(input.job.url, { waitUntil: 'networkidle2' })
      const easyApplyBtn = await page.$('button.jobs-apply-button, button[data-control-name="jobdetails_topcard_inapply"]')
      if (!easyApplyBtn) {
        return {
          status: 'needs_manual',
          via: 'linkedin-easy-apply',
          notes: 'No Easy Apply button (external application). Apply manually with the saved resume.',
        }
      }
      await easyApplyBtn.click()
      await new Promise((r) => setTimeout(r, 2000))

      // Upload resume if an upload input is present
      const upload = await page.$('input[type="file"]')
      if (upload) await upload.uploadFile(input.resumePdfPath)

      // Try to submit a single-step flow
      for (let step = 0; step < 6; step++) {
        const submit = await page.$('button[aria-label*="Submit application"]')
        if (submit) {
          await submit.click()
          await new Promise((r) => setTimeout(r, 2000))
          return { status: 'applied', via: 'linkedin-easy-apply' }
        }

        // Bail out if the form asks custom questions we cannot answer
        const questions = await page.$$('.jobs-easy-apply-form-section__grouping input[type="text"], .jobs-easy-apply-form-section__grouping select, [data-test-form-element] input[type="text"]')
        if (questions.length > 0) {
          return {
            status: 'needs_manual',
            via: 'linkedin-easy-apply',
            notes: 'Application has custom questions. Finish it manually with the saved resume.',
          }
        }

        const next = await page.$('button[aria-label*="Continue"], button[aria-label*="next step"], button[aria-label*="Review"]')
        if (!next) break
        await next.click()
        await new Promise((r) => setTimeout(r, 1500))
      }

      return {
        status: 'needs_manual',
        via: 'linkedin-easy-apply',
        notes: 'Could not complete the Easy Apply flow automatically. Apply manually with the saved resume.',
      }
    } catch (error) {
      return {
        status: 'needs_manual',
        via: 'linkedin-easy-apply',
        notes: `Auto-apply failed: ${error instanceof Error ? error.message : String(error)}. Apply manually with the saved resume.`,
      }
    } finally {
      await browser.close()
    }
  },
}
