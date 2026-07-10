import type { AtsScore, TailoredResume } from './resume'

export type JobSourceId = 'linkedin' | 'glassdoor' | 'indeed' | 'alljobs'

export interface JobListing {
  id: string
  source: JobSourceId
  title: string
  company: string
  location: string
  url: string
  postedAt?: string
  description?: string
}

export interface SearchPreferences {
  jobTitles: string[]
  locations: string[]
  keywords: string[]
  excludeKeywords: string[]
  remoteOnly: boolean
  minFitScore: number
  minAtsScore: number
  maxApplicationsPerRun: number
  pollMinutes: number
  sources: JobSourceId[]
}

export interface MatchResult {
  fit: number
  reasons: string[]
  shouldApply: boolean
}

export type ApplicationStatus =
  | 'collected'
  | 'applied'
  | 'prepared'
  | 'needs_manual'
  | 'failed'

export interface ApplicationRecord {
  id: string
  job: JobListing
  status: ApplicationStatus
  appliedVia: string
  appliedAt: string
  fitScore: number
  fitReasons: string[]
  atsScore: AtsScore
  atsAttempts: number
  resume: TailoredResume
  resumePdfPath: string
  notes?: string
}

export interface AgentStatus {
  running: boolean
  pid?: number
  startedAt?: string
  endsAt?: string
  hours?: number
  cycle: number
  jobsSeen: number
  jobsMatched: number
  applications: number
  lastActivity?: string
  lastError?: string
  updatedAt: string
}

export interface AgentConfig {
  hours: number
  pollMinutes: number
  maxApplications: number
}
