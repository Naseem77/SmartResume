import { NextResponse } from 'next/server'
import {
  loadLlmSettings,
  saveLlmSettings,
  deleteLlmSettings,
  maskApiKey,
  type LlmSettings,
} from '@/lib/settings'

export async function GET(request: Request) {
  const settings = await loadLlmSettings()
  const reveal = new URL(request.url).searchParams.get('reveal') === '1'
  const envKey =
    (settings.provider || process.env.AI_PROVIDER || 'claude') === 'openai'
      ? Boolean(process.env.OPENAI_API_KEY)
      : Boolean(process.env.ANTHROPIC_API_KEY)

  return NextResponse.json({
    provider: settings.provider || null,
    model: settings.model || null,
    hasApiKey: Boolean(settings.apiKey),
    apiKey: settings.apiKey ? (reveal ? settings.apiKey : maskApiKey(settings.apiKey)) : null,
    envKeyConfigured: envKey,
    envProvider: process.env.AI_PROVIDER || 'claude',
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LlmSettings
    if (body.provider && body.provider !== 'claude' && body.provider !== 'openai') {
      return NextResponse.json({ error: 'provider must be "claude" or "openai"' }, { status: 400 })
    }
    if (body.apiKey !== undefined && typeof body.apiKey !== 'string') {
      return NextResponse.json({ error: 'apiKey must be a string' }, { status: 400 })
    }
    const current = await loadLlmSettings()
    const merged: LlmSettings = {
      provider: body.provider ?? current.provider,
      apiKey: body.apiKey !== undefined ? body.apiKey.trim() || undefined : current.apiKey,
      model: body.model !== undefined ? body.model.trim() || undefined : current.model,
    }
    await saveLlmSettings(merged)
    return NextResponse.json({ saved: true, hasApiKey: Boolean(merged.apiKey) })
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

export async function DELETE() {
  await deleteLlmSettings()
  return NextResponse.json({ deleted: true })
}
