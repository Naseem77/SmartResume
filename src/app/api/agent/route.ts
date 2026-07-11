import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { loadStatus, saveStatus, readLogTail } from '@/lib/agent/store'
import { validateEnv } from '@/lib/config'
import { applySettingsToEnv, loadLlmSettings } from '@/lib/settings'

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function GET() {
  const status = await loadStatus()
  const log = await readLogTail(40)
  if (status?.running && status.pid && !isProcessAlive(status.pid)) {
    status.running = false
    status.lastActivity = 'Process ended unexpectedly'
    await saveStatus(status)
  }
  return NextResponse.json({ status, log })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action: string = body.action

    if (action === 'start') {
      const stored = await loadLlmSettings()
      applySettingsToEnv(stored)
      const envIssues = validateEnv(process.env, {
        provider: stored.provider,
        hasApiKey: Boolean(stored.apiKey),
      })
      if (envIssues.length > 0) {
        return NextResponse.json(
          { error: `Configuration error: ${envIssues.map((i) => `${i.variable} ${i.message}`).join('; ')}` },
          { status: 400 }
        )
      }
      const current = await loadStatus()
      if (current?.running && current.pid && isProcessAlive(current.pid)) {
        return NextResponse.json({ error: 'Agent is already running' }, { status: 409 })
      }
      const hours = Number(body.hours)
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        return NextResponse.json({ error: 'hours must be between 0 and 24' }, { status: 400 })
      }

      const cwd = process.cwd()
      const child = spawn(
        process.execPath,
        [path.join(cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(cwd, 'scripts', 'agent.ts'), '--hours', String(hours)],
        { cwd, detached: true, stdio: 'ignore', env: process.env }
      )
      child.unref()

      return NextResponse.json({ started: true, pid: child.pid, hours })
    }

    if (action === 'stop') {
      const status = await loadStatus()
      if (!status?.running || !status.pid || !isProcessAlive(status.pid)) {
        return NextResponse.json({ error: 'Agent is not running' }, { status: 409 })
      }
      process.kill(status.pid, 'SIGTERM')
      return NextResponse.json({ stopped: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent control failed' },
      { status: 500 }
    )
  }
}
