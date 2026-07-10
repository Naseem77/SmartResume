import { NextResponse } from 'next/server'
import { renderPdf } from '@/lib/pdf'
import { buildResumeHtml } from '@/lib/resumeTemplate'
import type { TailoredResume } from '@/types/resume'

export async function POST(request: Request) {
  try {
    const { resume, jobTitle }: { resume: TailoredResume; jobTitle: string } = await request.json()

    const html = buildResumeHtml(resume, jobTitle)
    const pdf = await renderPdf(html)

    const filename = `resume-${(jobTitle || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PDF error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
