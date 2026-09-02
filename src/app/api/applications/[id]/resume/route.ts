import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { applicationDir, getApplication } from '@/lib/agent/store'
import { updateApplicationResume } from '@/lib/agent/apply'
import { renderPdf } from '@/lib/pdf'
import type { TailoredResume } from '@/types/resume'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Guard against path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const record = await getApplication(id)
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const dir = applicationDir(id)
    const pdfPath = path.join(dir, 'resume.pdf')
    let pdf: Buffer
    try {
      pdf = await fs.readFile(pdfPath)
    } catch {
      // PDF was not rendered at collection time (e.g. Chrome missing); render now from the saved HTML.
      const html = await fs.readFile(path.join(dir, 'resume.html'), 'utf-8')
      pdf = await renderPdf(html)
      await fs.writeFile(pdfPath, pdf)
    }
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}-resume.pdf"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Resume PDF not found' }, { status: 404 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  try {
    const { resume }: { resume: TailoredResume } = await request.json()
    if (!resume || typeof resume !== 'object') {
      return NextResponse.json({ error: 'resume object required' }, { status: 400 })
    }
    const record = await updateApplicationResume(id, resume)
    return NextResponse.json(record)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    const status = message === 'Application not found' ? 404 : message === 'Already applied' ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
