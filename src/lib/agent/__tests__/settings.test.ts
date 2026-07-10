import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import {
  deleteLlmSettings,
  loadLlmSettings,
  maskApiKey,
  resolveAiConfig,
  saveLlmSettings,
} from '@/lib/settings'

let tmpDir: string
const ENV_KEYS = ['AI_PROVIDER', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_MODEL'] as const
let savedEnv: Record<string, string | undefined>

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartresume-settings-'))
  process.env.SMARTRESUME_DATA_DIR = tmpDir
  savedEnv = {}
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(async () => {
  delete process.env.SMARTRESUME_DATA_DIR
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('loadLlmSettings / saveLlmSettings / deleteLlmSettings', () => {
  it('returns empty object when no settings file exists', async () => {
    expect(await loadLlmSettings()).toEqual({})
  })

  it('round-trips saved settings', async () => {
    await saveLlmSettings({ provider: 'openai', apiKey: 'sk-test-123', model: 'gpt-4o' })
    expect(await loadLlmSettings()).toEqual({ provider: 'openai', apiKey: 'sk-test-123', model: 'gpt-4o' })
  })

  it('writes to personaldata/settings.json under the data dir', async () => {
    await saveLlmSettings({ provider: 'claude' })
    const raw = await fs.readFile(path.join(tmpDir, 'personaldata', 'settings.json'), 'utf-8')
    expect(JSON.parse(raw).provider).toBe('claude')
  })

  it('delete removes the file and is safe to call twice', async () => {
    await saveLlmSettings({ apiKey: 'x' })
    await deleteLlmSettings()
    expect(await loadLlmSettings()).toEqual({})
    await expect(deleteLlmSettings()).resolves.toBeUndefined()
  })
})

describe('resolveAiConfig precedence', () => {
  it('falls back to env vars when nothing is stored', async () => {
    process.env.AI_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'env-key'
    process.env.OPENAI_MODEL = 'gpt-env'
    const cfg = await resolveAiConfig()
    expect(cfg).toEqual({ provider: 'openai', apiKey: 'env-key', model: 'gpt-env' })
  })

  it('stored settings beat env vars', async () => {
    process.env.AI_PROVIDER = 'claude'
    process.env.ANTHROPIC_API_KEY = 'env-key'
    await saveLlmSettings({ provider: 'openai', apiKey: 'stored-key', model: 'gpt-stored' })
    const cfg = await resolveAiConfig()
    expect(cfg).toEqual({ provider: 'openai', apiKey: 'stored-key', model: 'gpt-stored' })
  })

  it('mixes stored provider with env key when no stored key', async () => {
    process.env.OPENAI_API_KEY = 'env-openai'
    await saveLlmSettings({ provider: 'openai' })
    const cfg = await resolveAiConfig()
    expect(cfg.provider).toBe('openai')
    expect(cfg.apiKey).toBe('env-openai')
  })

  it('defaults to claude provider', async () => {
    const cfg = await resolveAiConfig()
    expect(cfg.provider).toBe('claude')
    expect(cfg.apiKey).toBeUndefined()
  })
})

describe('maskApiKey', () => {
  it('masks short keys entirely', () => {
    expect(maskApiKey('short')).toBe('•••••')
    expect(maskApiKey('123456789012')).toBe('•'.repeat(12))
  })

  it('keeps first 5 and last 4 of long keys', () => {
    expect(maskApiKey('sk-proj-abcdefghijklmnop')).toBe('sk-pr••••••••mnop')
  })
})
