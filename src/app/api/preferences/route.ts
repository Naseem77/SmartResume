import { NextResponse } from 'next/server'
import { loadPreferences, savePreferences, DEFAULT_PREFERENCES } from '@/lib/agent/store'
import type { SearchPreferences } from '@/types/agent'

export async function GET() {
  const prefs = await loadPreferences()
  return NextResponse.json(prefs)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SearchPreferences>
    const current = await loadPreferences()
    const merged: SearchPreferences = { ...DEFAULT_PREFERENCES, ...current, ...body }
    await savePreferences(merged)
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}
