import { NextResponse } from 'next/server'
import {
  loadLlmSettings,
  saveLlmSettings,
  deleteLlmSettings,
  maskApiKey,
  type AppSettings,
} from '@/lib/settings'

const SECRET_FIELDS = ['apiKey', 'glassdoorApiKey', 'linkedinPassword'] as const
type SecretField = (typeof SECRET_FIELDS)[number]

const STRING_FIELDS = [
  'model',
  'matcherModel',
  'indeedPublisherId',
  'glassdoorPartnerId',
  'linkedinEmail',
] as const
const BOOL_FIELDS = ['collectOnly', 'generateCoverLetter', 'autoApply', 'autoApplyHeadless'] as const
const NUMBER_FIELDS = ['agentRunHours', 'agentPollMinutes', 'agentMaxApplications'] as const

/** Which env var backs each field, so the UI can show the fallback. */
const ENV_FALLBACKS: Record<string, string> = {
  provider: 'AI_PROVIDER',
  model: 'OPENAI_MODEL',
  matcherModel: 'MATCHER_MODEL',
  collectOnly: 'COLLECT_ONLY',
  agentRunHours: 'AGENT_RUN_HOURS',
  agentPollMinutes: 'AGENT_POLL_MINUTES',
  agentMaxApplications: 'AGENT_MAX_APPLICATIONS',
  generateCoverLetter: 'GENERATE_COVER_LETTER',
  indeedPublisherId: 'INDEED_PUBLISHER_ID',
  glassdoorPartnerId: 'GLASSDOOR_PARTNER_ID',
  glassdoorApiKey: 'GLASSDOOR_API_KEY',
  autoApply: 'AUTO_APPLY',
  linkedinEmail: 'LINKEDIN_EMAIL',
  linkedinPassword: 'LINKEDIN_PASSWORD',
  autoApplyHeadless: 'AUTO_APPLY_HEADLESS',
}

export async function GET(request: Request) {
  const settings = await loadLlmSettings()
  const reveal = new URL(request.url).searchParams.get('reveal') === '1'
  const provider = settings.provider || process.env.AI_PROVIDER || 'claude'
  const envKey =
    provider === 'openai' ? Boolean(process.env.OPENAI_API_KEY) : Boolean(process.env.ANTHROPIC_API_KEY)

  const secrets: Record<string, string | null> = {}
  for (const f of SECRET_FIELDS) {
    const v = settings[f]
    secrets[f] = v ? (reveal ? v : maskApiKey(v)) : null
  }

  const envValues: Record<string, string | null> = {}
  for (const [field, envVar] of Object.entries(ENV_FALLBACKS)) {
    envValues[field] = process.env[envVar] ?? null
  }

  return NextResponse.json({
    settings: {
      ...settings,
      apiKey: secrets.apiKey,
      glassdoorApiKey: secrets.glassdoorApiKey,
      linkedinPassword: secrets.linkedinPassword,
    },
    hasSecrets: {
      apiKey: Boolean(settings.apiKey),
      glassdoorApiKey: Boolean(settings.glassdoorApiKey),
      linkedinPassword: Boolean(settings.linkedinPassword),
    },
    env: envValues,
    envKeyConfigured: envKey,
    envProvider: process.env.AI_PROVIDER || 'claude',
    // legacy top-level fields kept for compatibility
    provider: settings.provider || null,
    model: settings.model || null,
    hasApiKey: Boolean(settings.apiKey),
    apiKey: secrets.apiKey,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Record<keyof AppSettings, unknown>>
    if (body.provider !== undefined && body.provider !== 'claude' && body.provider !== 'openai' && body.provider !== null) {
      return NextResponse.json({ error: 'provider must be "claude" or "openai"' }, { status: 400 })
    }
    for (const f of NUMBER_FIELDS) {
      const v = body[f]
      if (v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v <= 0)) {
        return NextResponse.json({ error: `${f} must be a positive number` }, { status: 400 })
      }
    }
    for (const f of BOOL_FIELDS) {
      const v = body[f]
      if (v !== undefined && v !== null && typeof v !== 'boolean') {
        return NextResponse.json({ error: `${f} must be true or false` }, { status: 400 })
      }
    }
    for (const f of [...STRING_FIELDS, ...SECRET_FIELDS]) {
      const v = body[f]
      if (v !== undefined && v !== null && typeof v !== 'string') {
        return NextResponse.json({ error: `${f} must be a string` }, { status: 400 })
      }
    }
    if (body.autoApply === true) {
      const current = await loadLlmSettings()
      const email = (body.linkedinEmail as string | undefined) ?? current.linkedinEmail ?? process.env.LINKEDIN_EMAIL
      const pass = (body.linkedinPassword as string | undefined) ?? current.linkedinPassword ?? process.env.LINKEDIN_PASSWORD
      if (!email || !pass) {
        return NextResponse.json(
          { error: 'Auto-submit requires a LinkedIn email and password' },
          { status: 400 }
        )
      }
    }

    const current = await loadLlmSettings()
    const merged: AppSettings = { ...current }

    // undefined = leave untouched, null or '' = clear, value = set
    const assign = <K extends keyof AppSettings>(key: K, normalize?: (v: unknown) => AppSettings[K]) => {
      const v = body[key]
      if (v === undefined) return
      if (v === null || v === '') {
        delete merged[key]
      } else {
        merged[key] = normalize ? normalize(v) : (v as AppSettings[K])
      }
    }

    assign('provider')
    for (const f of [...STRING_FIELDS, ...SECRET_FIELDS]) {
      assign(f as keyof AppSettings, v => (v as string).trim() as never)
    }
    for (const f of NUMBER_FIELDS) assign(f)
    for (const f of BOOL_FIELDS) assign(f)

    // drop cleared string fields that trimmed to empty
    for (const f of [...STRING_FIELDS, ...SECRET_FIELDS] as (keyof AppSettings)[]) {
      if (merged[f] === '') delete merged[f]
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

export type { SecretField }
