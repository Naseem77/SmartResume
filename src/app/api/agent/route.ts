import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
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
      // Don't leak the dev server's Node flags (NODE_OPTIONS / Next internals) into the agent
      const { NODE_OPTIONS: _n, ...cleanEnv } = process.env
      const childEnv = Object.fromEntries(
        Object.entries(cleanEnv).filter(([k]) => !k.startsWith('__NEXT') && !k.startsWith('NEXT_'))
      ) as NodeJS.ProcessEnv
      void _n
      // Capture crashes: the child is detached so its output would otherwise vanish
      await fs.mkdir(path.join(cwd, 'data'), { recursive: true })
      const errFd = await fs.open(path.join(cwd, 'data', 'agent-stderr.log'), 'a')
      const child = spawn(
        process.execPath,
        [path.join(cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(cwd, 'scripts', 'agent.ts'), '--hours', String(hours)],
        { cwd, detached: true, stdio: ['ignore', errFd.fd, errFd.fd], env: childEnv }
      )
      child.unref()
      child.on('spawn', () => void errFd.close())

      // Mark running right away so the dashboard flips state on the next poll
      // instead of waiting for the child to boot and write its own status.
      const startedAt = new Date()
      await saveStatus({
        running: true,
        pid: child.pid,
        startedAt: startedAt.toISOString(),
        endsAt: new Date(startedAt.getTime() + hours * 3600_000).toISOString(),
        hours,
        cycle: 0,
        jobsSeen: 0,
        jobsMatched: 0,
        applications: 0,
        updatedAt: startedAt.toISOString(),
        lastActivity: 'Starting agent…',
      })

      return NextResponse.json({ started: true, pid: child.pid, hours })
    }

    if (action === 'stop') {
      const status = await loadStatus()
      if (!status?.running || !status.pid || !isProcessAlive(status.pid)) {
        return NextResponse.json({ error: 'Agent is not running' }, { status: 409 })
      }
      process.kill(status.pid, 'SIGTERM')
      // Wait for the process to exit (up to 10s) so a following Start doesn't see it as still running
      for (let i = 0; i < 100 && isProcessAlive(status.pid); i++) {
        await new Promise((r) => setTimeout(r, 100))
      }
      if (isProcessAlive(status.pid)) process.kill(status.pid, 'SIGKILL')
      const latest = await loadStatus()
      if (latest?.running) {
        latest.running = false
        latest.lastActivity = 'Stopped by user'
        await saveStatus(latest)
      }
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
