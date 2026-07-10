import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import {
  listApplications,
  loadStatus,
  applicationsDir,
  seenJobsPath,
  statusPath,
  logPath,
} from '@/lib/agent/store'

export async function GET() {
  const applications = await listApplications()
  return NextResponse.json(applications)
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Wipes all agent data: applications, seen jobs, status, and log. */
export async function DELETE() {
  const status = await loadStatus()
  if (status?.running && status.pid && isProcessAlive(status.pid)) {
    return NextResponse.json(
      { error: 'Stop the agent before clearing data' },
      { status: 409 }
    )
  }

  await fs.rm(applicationsDir(), { recursive: true, force: true })
  await fs.rm(seenJobsPath(), { force: true })
  await fs.rm(statusPath(), { force: true })
  await fs.rm(logPath(), { force: true })

  return NextResponse.json({ cleared: true })
}
