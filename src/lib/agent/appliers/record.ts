import type { Applier, ApplyInput, ApplyResult } from './types'

/**
 * Default applier: records the application locally with the tailored,
 * ATS-checked resume ready to submit. Used when auto-apply is disabled
 * or no site-specific applier can handle the job.
 */
export const recordApplier: Applier = {
  id: 'record',
  canApply: () => true,
  async apply(input: ApplyInput): Promise<ApplyResult> {
    return {
      status: 'prepared',
      via: 'record',
      notes: `Resume saved at ${input.resumePdfPath}. Open the job URL and submit it.`,
    }
  },
}
