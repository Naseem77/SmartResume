import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { buildResumeHtml } from '@/lib/resumeTemplate'
import type { TailoredResume } from '@/types/resume'

export async function POST(request: Request) {
  let browser
  try {
    const { resume, jobTitle }: { resume: TailoredResume; jobTitle: string } = await request.json()

    const html = buildResumeHtml(resume, jobTitle)

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBytes = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const filename = `resume-${(jobTitle || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if (browser) await browser.close()
    console.error('PDF error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
