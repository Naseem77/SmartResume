import type { JobListing } from '@/types/agent'
import type { Applier } from './types'
import { linkedinApplier } from './linkedin'
import { recordApplier } from './record'

const APPLIERS: Applier[] = [linkedinApplier, recordApplier]

/** Picks the first applier able to handle the job; record is the fallback. */
export function pickApplier(job: JobListing): Applier {
  return APPLIERS.find((a) => a.canApply(job)) ?? recordApplier
}
