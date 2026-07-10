import fs from 'fs/promises'
import path from 'path'

export interface LlmSettings {
  provider?: 'claude' | 'openai'
  apiKey?: string
  model?: string
}

function settingsPath(): string {
  const base = process.env.SMARTRESUME_DATA_DIR || process.cwd()
  return path.join(base, 'personaldata', 'settings.json')
}

export async function loadLlmSettings(): Promise<LlmSettings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf-8')
    return JSON.parse(raw) as LlmSettings
  } catch {
    return {}
  }
}

export async function saveLlmSettings(settings: LlmSettings): Promise<void> {
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
