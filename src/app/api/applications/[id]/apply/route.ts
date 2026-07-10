import { NextResponse } from 'next/server'
import { applyCollectedApplication } from '@/lib/agent/apply'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  try {
    const record = await applyCollectedApplication(id)
    return NextResponse.json(record)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Apply failed'
    const status = message === 'Application not found' ? 404 : message === 'Already applied' ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
