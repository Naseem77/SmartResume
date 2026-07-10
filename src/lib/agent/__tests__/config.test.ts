import { describe, it, expect } from 'vitest'
import { validateEnv, assertValidEnv } from '@/lib/config'

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv
const baseEnv = env({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' })

describe('validateEnv', () => {
  it('passes with a valid openai config', () => {
    expect(validateEnv(baseEnv)).toEqual([])
  })

  it('requires OPENAI_API_KEY for openai provider', () => {
    const issues = validateEnv(env({ AI_PROVIDER: 'openai' }))
    expect(issues.some((i) => i.variable === 'OPENAI_API_KEY')).toBe(true)
  })

  it('requires ANTHROPIC_API_KEY for claude provider (default)', () => {
    const issues = validateEnv(env({}))
    expect(issues.some((i) => i.variable === 'ANTHROPIC_API_KEY')).toBe(true)
  })

  it('rejects unknown provider', () => {
    const issues = validateEnv(env({ AI_PROVIDER: 'gemini' }))
    expect(issues.some((i) => i.variable === 'AI_PROVIDER')).toBe(true)
  })

  it('rejects non-numeric agent settings', () => {
    const issues = validateEnv({ ...baseEnv, AGENT_RUN_HOURS: 'abc', AGENT_POLL_MINUTES: '-5' })
    expect(issues.map((i) => i.variable)).toEqual(
      expect.arrayContaining(['AGENT_RUN_HOURS', 'AGENT_POLL_MINUTES'])
    )
  })

  it('accepts valid numeric agent settings', () => {
    expect(validateEnv({ ...baseEnv, AGENT_RUN_HOURS: '3', AGENT_MAX_APPLICATIONS: '10' })).toEqual([])
  })

  it('rejects non-boolean flags', () => {
    const issues = validateEnv({ ...baseEnv, COLLECT_ONLY: 'yes' })
    expect(issues.some((i) => i.variable === 'COLLECT_ONLY')).toBe(true)
  })

  it('requires linkedin creds when AUTO_APPLY=true', () => {
    const issues = validateEnv({ ...baseEnv, AUTO_APPLY: 'true' })
    expect(issues.some((i) => i.variable === 'AUTO_APPLY')).toBe(true)
    expect(
      validateEnv({
        ...baseEnv,
        AUTO_APPLY: 'true',
        LINKEDIN_EMAIL: 'a@b.c',
        LINKEDIN_PASSWORD: 'pw',
      })
    ).toEqual([])
  })
})

describe('assertValidEnv', () => {
  it('throws a readable error listing all issues', () => {
    expect(() => assertValidEnv(env({ AI_PROVIDER: 'openai', COLLECT_ONLY: 'maybe' }))).toThrow(
      /OPENAI_API_KEY[\s\S]*COLLECT_ONLY/
    )
  })

  it('does not throw for a valid env', () => {
    expect(() => assertValidEnv(baseEnv)).not.toThrow()
  })
})
