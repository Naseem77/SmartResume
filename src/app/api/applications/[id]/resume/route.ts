import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { applicationDir, getApplication } from '@/lib/agent/store'

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
    const pdf = await fs.readFile(path.join(applicationDir(id), 'resume.pdf'))
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
