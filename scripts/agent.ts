/**
 * SmartResume auto-apply agent CLI.
 *
 * Usage:
 *   npm run agent -- 3              # run for 3 hours
 *   npm run agent -- --hours 3      # same
 *   AGENT_RUN_HOURS=3 npm run agent # via env
 *
 * Optional flags / env:
 *   --poll-minutes 20   (AGENT_POLL_MINUTES)  minutes between search cycles
 *   --max-apps 10       (AGENT_MAX_APPLICATIONS) stop after N applications
 */
import path from 'path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.join(process.cwd(), '.env.local') })
loadEnv({ path: path.join(process.cwd(), '.env') })

import { runAgent } from '../src/lib/agent/runner'
import { loadPreferences } from '../src/lib/agent/store'

function parseArgs(argv: string[]): { hours?: number; pollMinutes?: number; maxApps?: number } {
  const out: { hours?: number; pollMinutes?: number; maxApps?: number } = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--hours') out.hours = Number(argv[++i])
    else if (arg === '--poll-minutes') out.pollMinutes = Number(argv[++i])
    else if (arg === '--max-apps') out.maxApps = Number(argv[++i])
    else if (!arg.startsWith('-') && out.hours === undefined) out.hours = Number(arg)
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const prefs = await loadPreferences()

  const hours = args.hours ?? Number(process.env.AGENT_RUN_HOURS) ?? NaN
  if (!Number.isFinite(hours) || hours <= 0) {
    console.error('Usage: npm run agent -- <hours>   (e.g. npm run agent -- 3)')
    console.error('Or set AGENT_RUN_HOURS in .env.local')
    process.exit(1)
  }

  const pollMinutes =
    args.pollMinutes ?? Number(process.env.AGENT_POLL_MINUTES) ?? prefs.pollMinutes
  const maxApplications =
    args.maxApps ?? Number(process.env.AGENT_MAX_APPLICATIONS) ?? prefs.maxApplicationsPerRun

  const provider = process.env.AI_PROVIDER || 'claude'
  const hasKey =
    provider === 'openai' ? !!process.env.OPENAI_API_KEY : !!process.env.ANTHROPIC_API_KEY
  if (!hasKey) {
    console.error(
      `Missing LLM key: set ${provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} in .env.local`
    )
    process.exit(1)
  }

  console.log(`SmartResume agent — running for ${hours}h (poll every ${Number.isFinite(pollMinutes) ? pollMinutes : prefs.pollMinutes}min, max ${Number.isFinite(maxApplications) ? maxApplications : prefs.maxApplicationsPerRun} applications)`)
  console.log('Press Ctrl+C to stop early. Live log: data/agent.log\n')

  const status = await runAgent(
    {
      hours,
      pollMinutes: Number.isFinite(pollMinutes) ? pollMinutes : prefs.pollMinutes,
      maxApplications: Number.isFinite(maxApplications)
        ? maxApplications
        : prefs.maxApplicationsPerRun,
    },
    { log: (msg) => console.log(msg) }
  )

  console.log(
    `\nDone. Cycles: ${status.cycle} · new jobs: ${status.jobsSeen} · matched: ${status.jobsMatched} · applications: ${status.applications}`
  )
  console.log('See the dashboard at http://localhost:3000/dashboard or data/applications/')
}

main().catch((error) => {
  console.error('Agent failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
