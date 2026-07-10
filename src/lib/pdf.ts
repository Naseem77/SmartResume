import puppeteer from 'puppeteer'

/** Renders resume HTML to a Letter-format PDF buffer. */
export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBytes = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdfBytes)
  } finally {
    await browser.close()
  }
}
