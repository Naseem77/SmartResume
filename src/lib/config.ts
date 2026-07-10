/** Central environment validation, called at agent startup and API start. */

export interface EnvIssue {
  variable: string
  message: string
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvIssue[] {
  const issues: EnvIssue[] = []

  const provider = env.AI_PROVIDER || 'claude'
  if (provider !== 'claude' && provider !== 'openai') {
    issues.push({ variable: 'AI_PROVIDER', message: `must be "claude" or "openai", got "${provider}"` })
  }
  if (provider === 'openai' && !env.OPENAI_API_KEY) {
    issues.push({ variable: 'OPENAI_API_KEY', message: 'required when AI_PROVIDER=openai' })
  }
  if (provider === 'claude' && !env.ANTHROPIC_API_KEY) {
    issues.push({ variable: 'ANTHROPIC_API_KEY', message: 'required when AI_PROVIDER=claude' })
  }

  for (const key of ['AGENT_RUN_HOURS', 'AGENT_POLL_MINUTES', 'AGENT_MAX_APPLICATIONS'] as const) {
    const value = env[key]
    if (value !== undefined && value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
      issues.push({ variable: key, message: `must be a positive number, got "${value}"` })
    }
  }

  for (const key of ['COLLECT_ONLY', 'AUTO_APPLY', 'GENERATE_COVER_LETTER'] as const) {
    const value = env[key]
    if (value !== undefined && value !== '' && value !== 'true' && value !== 'false') {
      issues.push({ variable: key, message: `must be "true" or "false", got "${value}"` })
    }
  }

  if (env.AUTO_APPLY === 'true' && (!env.LINKEDIN_EMAIL || !env.LINKEDIN_PASSWORD)) {
    issues.push({
      variable: 'AUTO_APPLY',
      message: 'requires LINKEDIN_EMAIL and LINKEDIN_PASSWORD to be set',
    })
  }

  return issues
}

/** Throws with a readable message when the environment is misconfigured. */
export function assertValidEnv(env: NodeJS.ProcessEnv = process.env): void {
  const issues = validateEnv(env)
  if (issues.length > 0) {
    throw new Error(
      `Invalid configuration in .env.local:\n${issues.map((i) => `  - ${i.variable}: ${i.message}`).join('\n')}`
    )
  }
}
