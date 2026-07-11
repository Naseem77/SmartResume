import fs from 'fs/promises'
import path from 'path'

export interface LlmSettings {
  provider?: 'claude' | 'openai'
  apiKey?: string
  model?: string
}

/** Full application settings: everything configurable via .env.local can also live here. */
export interface AppSettings extends LlmSettings {
  matcherModel?: string
  collectOnly?: boolean
  agentRunHours?: number
  agentPollMinutes?: number
  agentMaxApplications?: number
  generateCoverLetter?: boolean
  indeedPublisherId?: string
  glassdoorPartnerId?: string
  glassdoorApiKey?: string
  autoApply?: boolean
  linkedinEmail?: string
  linkedinPassword?: string
  autoApplyHeadless?: boolean
}

function settingsPath(): string {
  const base = process.env.SMARTRESUME_DATA_DIR || process.cwd()
  return path.join(base, 'personaldata', 'settings.json')
}

export async function loadLlmSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf-8')
    return JSON.parse(raw) as AppSettings
  } catch {
    return {}
  }
}

export async function saveLlmSettings(settings: AppSettings): Promise<void> {
  const file = settingsPath()
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(settings, null, 2))
}

export async function deleteLlmSettings(): Promise<void> {
  await fs.rm(settingsPath(), { force: true })
}

export interface ResolvedAiConfig {
  provider: 'claude' | 'openai'
  apiKey: string | undefined
  model: string | undefined
}

/**
 * Effective AI configuration: values saved in Settings take precedence,
 * environment variables are the fallback.
 */
export async function resolveAiConfig(): Promise<ResolvedAiConfig> {
  const stored = await loadLlmSettings()
  const provider = (stored.provider || process.env.AI_PROVIDER || 'claude') as 'claude' | 'openai'
  const envKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
  const envModel = provider === 'openai' ? process.env.OPENAI_MODEL : undefined
  return {
    provider,
    apiKey: stored.apiKey || envKey,
    model: stored.model || envModel,
  }
}

/** Masks an API key for display: keeps the first 5 and last 4 characters. */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return '•'.repeat(key.length)
  return `${key.slice(0, 5)}${'•'.repeat(8)}${key.slice(-4)}`
}

/**
 * Overlays stored settings onto the process environment (stored values win),
 * so every module that reads process.env picks them up. Call once at agent
 * startup, before validation.
 */
export function applySettingsToEnv(settings: AppSettings, env: NodeJS.ProcessEnv = process.env): void {
  const setStr = (key: string, value: string | undefined) => {
    if (value !== undefined && value.trim() !== '') env[key] = value.trim()
  }
  const setBool = (key: string, value: boolean | undefined) => {
    if (value !== undefined) env[key] = value ? 'true' : 'false'
  }
  const setNum = (key: string, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value)) env[key] = String(value)
  }

  setStr('AI_PROVIDER', settings.provider)
  const provider = settings.provider || env.AI_PROVIDER || 'claude'
  if (settings.apiKey) {
    env[provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'] = settings.apiKey
  }
  if (provider === 'openai') setStr('OPENAI_MODEL', settings.model)
  setStr('MATCHER_MODEL', settings.matcherModel)

  setBool('COLLECT_ONLY', settings.collectOnly)
  setNum('AGENT_RUN_HOURS', settings.agentRunHours)
  setNum('AGENT_POLL_MINUTES', settings.agentPollMinutes)
  setNum('AGENT_MAX_APPLICATIONS', settings.agentMaxApplications)
  setBool('GENERATE_COVER_LETTER', settings.generateCoverLetter)

  setStr('INDEED_PUBLISHER_ID', settings.indeedPublisherId)
  setStr('GLASSDOOR_PARTNER_ID', settings.glassdoorPartnerId)
  setStr('GLASSDOOR_API_KEY', settings.glassdoorApiKey)

  setBool('AUTO_APPLY', settings.autoApply)
  setStr('LINKEDIN_EMAIL', settings.linkedinEmail)
  setStr('LINKEDIN_PASSWORD', settings.linkedinPassword)
  setBool('AUTO_APPLY_HEADLESS', settings.autoApplyHeadless)
}
