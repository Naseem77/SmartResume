import type { JobListing, JobSourceId, SearchPreferences } from '@/types/agent'

export interface JobSource {
  id: JobSourceId
  label: string
  /** Returns true when the source can run (e.g. required env keys are set). */
  available(): boolean
  /** Reason shown when unavailable. */
  requirement: string
  search(title: string, prefs: SearchPreferences): Promise<JobListing[]>
}
