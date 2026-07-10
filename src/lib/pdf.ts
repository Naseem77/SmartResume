import puppeteer, { type Browser } from 'puppeteer'

let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  const browser = await browserPromise
  if (!browser.connected) {
    browserPromise = null
    return getBrowser()
  }
  return browser
}

/** Renders resume HTML to a Letter-format PDF buffer. Reuses one browser across calls. */
export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBytes = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdfBytes)
  } finally {
    await page.close()
  }
}

/** Closes the shared browser. Call at the end of long-running processes (agent CLI). */
export async function closePdfBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise.catch(() => null)
  browserPromise = null
  await browser?.close()
}
