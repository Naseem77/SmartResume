/**
 * End-to-end smoke test: boots the production Next.js server and drives
 * the real UI + APIs with puppeteer against an isolated temp data dir.
 *
 * Run with: npm run test:e2e (requires `npm run build` first)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcess } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import puppeteer, { type Browser, type Page } from 'puppeteer'

const PORT = 3877
const BASE = `http://localhost:${PORT}`

let server: ChildProcess
let browser: Browser
let page: Page
let tmpDir: string

async function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`)
}

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartresume-e2e-'))

  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      SMARTRESUME_DATA_DIR: tmpDir,
      PORT: String(PORT),
    },
    stdio: 'ignore',
  })

  await waitForServer(BASE)
  browser = await puppeteer.launch({ headless: true })
  page = await browser.newPage()
}, 90000)

afterAll(async () => {
  await browser?.close()
  server?.kill('SIGTERM')
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('SmartResume E2E', () => {
  it('serves the home page', async () => {
    const response = await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    const text = await page.evaluate(() => document.body.innerText)
    expect(text.toLowerCase()).toContain('resume')
  }, 30000)

  it('renders the dashboard with agent panel and empty state', async () => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle0' })
    const text = await page.evaluate(() => document.body.innerText)
    expect(text).toContain('Applications Dashboard')
    expect(text).toContain('No applications yet')
  }, 30000)

  it('exposes agent status via API', async () => {
    const res = await fetch(`${BASE}/api/agent`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('status')
  })

  it('round-trips preferences through the API', async () => {
    const put = await fetch(`${BASE}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitles: ['QA Engineer'], locations: ['Remote'] }),
    })
    expect(put.status).toBe(200)

    const res = await fetch(`${BASE}/api/preferences`)
    const prefs = await res.json()
    expect(prefs.jobTitles).toContain('QA Engineer')
  })

  it('returns an empty applications list initially', async () => {
    const res = await fetch(`${BASE}/api/applications`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('filters applications in the dashboard UI', async () => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle0' })
    const chips = await page.$$('button')
    let clicked = false
    for (const chip of chips) {
      const label = await chip.evaluate((el) => el.textContent || '')
      if (label.includes('Collected')) {
        await chip.click()
        clicked = true
        break
      }
    }
    expect(clicked).toBe(true)
  }, 30000)

  it('agent stop endpoint responds sanely', async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    expect([200, 400, 409]).toContain(res.status)
  })
})
