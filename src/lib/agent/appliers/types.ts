import type { ApplicationStatus, JobListing } from '@/types/agent'

export interface ApplyInput {
  job: JobListing
  resumePdf: Buffer
  resumePdfPath: string
}

export interface ApplyResult {
  status: ApplicationStatus
  via: string
  notes?: string
}

export interface Applier {
  id: string
  /** True when this applier can handle the given job with current env config. */
  canApply(job: JobListing): boolean
  apply(input: ApplyInput): Promise<ApplyResult>
}
