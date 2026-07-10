import fs from 'fs/promises'
import path from 'path'
import type {
  AgentStatus,
  ApplicationRecord,
  SearchPreferences,
} from '@/types/agent'

function root(): string {
  return process.env.SMARTRESUME_DATA_DIR || process.cwd()
}

export function dataDir(): string {
  return path.join(root(), 'data')
}
export function applicationsDir(): string {
  return path.join(dataDir(), 'applications')
}
export function statusPath(): string {
  return path.join(dataDir(), 'agent-status.json')
}
export function seenJobsPath(): string {
  return path.join(dataDir(), 'seen-jobs.json')
}
export function logPath(): string {
  return path.join(dataDir(), 'agent.log')
}
export function preferencesPath(): string {
  return path.join(root(), 'personaldata', 'preferences.json')
}

export const DEFAULT_PREFERENCES: SearchPreferences = {
  jobTitles: [],
  locations: [],
  keywords: [],
  excludeKeywords: [],
  remoteOnly: false,
  experienceYears: null,
  maxJobAgeHours: 24,
  minFitScore: 60,
  minAtsScore: 75,
  maxApplicationsPerRun: 10,
  pollMinutes: 20,
  sources: ['linkedin'],
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

export async function loadPreferences(): Promise<SearchPreferences> {
  try {
    const raw = await fs.readFile(preferencesPath(), 'utf-8')
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export async function savePreferences(prefs: SearchPreferences): Promise<void> {
  await ensureDir(path.dirname(preferencesPath()))
  await fs.writeFile(preferencesPath(), JSON.stringify(prefs, null, 2))
}

export function applicationDir(id: string): string {
  return path.join(applicationsDir(), id)
}

export async function saveApplication(
  record: ApplicationRecord,
  pdf?: Buffer,
  html?: string
): Promise<string> {
  const dir = applicationDir(record.id)
  await ensureDir(dir)
  if (pdf) {
    record.resumePdfPath = path.join(dir, 'resume.pdf')
    await fs.writeFile(record.resumePdfPath, pdf)
  }
  if (html) await fs.writeFile(path.join(dir, 'resume.html'), html)
  if (record.coverLetter) {
    await fs.writeFile(path.join(dir, 'cover-letter.txt'), record.coverLetter)
  }
  await fs.writeFile(path.join(dir, 'application.json'), JSON.stringify(record, null, 2))
  return dir
}

export async function listApplications(): Promise<ApplicationRecord[]> {
  try {
    const entries = await fs.readdir(applicationsDir(), { withFileTypes: true })
    const records: ApplicationRecord[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      try {
        const raw = await fs.readFile(
          path.join(applicationsDir(), entry.name, 'application.json'),
          'utf-8'
        )
        records.push(JSON.parse(raw))
      } catch {
        // skip malformed entries
      }
    }
    return records.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  } catch {
    return []
  }
}

export async function getApplication(id: string): Promise<ApplicationRecord | null> {
  try {
    const raw = await fs.readFile(path.join(applicationDir(id), 'application.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function loadSeenJobs(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(seenJobsPath(), 'utf-8')
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

export async function saveSeenJobs(seen: Set<string>): Promise<void> {
  await ensureDir(dataDir())
  await fs.writeFile(seenJobsPath(), JSON.stringify([...seen], null, 2))
}

export async function loadStatus(): Promise<AgentStatus | null> {
  try {
    const raw = await fs.readFile(statusPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function saveStatus(status: AgentStatus): Promise<void> {
  await ensureDir(dataDir())
  await fs.writeFile(statusPath(), JSON.stringify(status, null, 2))
}

export async function appendLog(message: string): Promise<void> {
  await ensureDir(dataDir())
  const line = `[${new Date().toISOString()}] ${message}\n`
  await fs.appendFile(logPath(), line)
}

export async function readLogTail(lines = 100): Promise<string[]> {
  try {
    const raw = await fs.readFile(logPath(), 'utf-8')
    return raw.trimEnd().split('\n').slice(-lines)
  } catch {
    return []
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Board-independent fingerprint so the same role found on two boards is only processed once. */
export function jobFingerprint(job: { company: string; title: string }): string {
  return `fp:${slugify(job.company)}|${slugify(job.title)}`
}

export function applicationId(company: string, title: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${stamp}_${slugify(company)}_${slugify(title)}_${suffix}`
}
