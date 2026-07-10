import type { Profile } from '@/types/resume'
import type { JobListing, MatchResult, SearchPreferences } from '@/types/agent'
import { completeText, matcherModel } from '@/lib/ai'

/**
 * Cheap local prefilter: rejects jobs containing excluded keywords and,
 * when include keywords are set, requires at least one to appear.
 */
export function prefilterJob(job: JobListing, prefs: SearchPreferences): boolean {
  const haystack = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase()

  for (const excluded of prefs.excludeKeywords) {
    if (excluded && haystack.includes(excluded.toLowerCase())) return false
  }

  if (prefs.keywords.length > 0) {
    return prefs.keywords.some((kw) => kw && haystack.includes(kw.toLowerCase()))
  }

  return true
}

function buildMatchPrompt(profile: Profile, job: JobListing, prefs: SearchPreferences): string {
  return `You are a job-matching assistant. Decide how well this job fits the candidate.

## Candidate profile (summary)
Name: ${profile.name}
Summary: ${profile.summary}
Skills: ${profile.skills.join(', ')}
Experience: ${profile.experience
    .map((e) => `${e.title} at ${e.company} (${e.dates})`)
    .join('; ')}

## Candidate is looking for
Titles: ${prefs.jobTitles.join(', ') || 'any'}
Must-have keywords: ${prefs.keywords.join(', ') || 'none'}
Locations: ${prefs.locations.join(', ') || 'any'}${prefs.remoteOnly ? ' (remote only)' : ''}

## Job
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${(job.description || 'not available — judge by title and company').slice(0, 6000)}

Respond with ONLY valid JSON:
{ "fit": 0-100, "reasons": ["short reason", "short reason"] }`
}

export function parseMatchResponse(text: string, minFitScore: number): MatchResult {
  const json = text.replace(/```json\s*/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(json)
  const fit = Math.max(0, Math.min(100, Number(parsed.fit) || 0))
  return {
    fit,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    shouldApply: fit >= minFitScore,
  }
}

/** Asks the LLM whether the job fits the candidate profile. Uses a cheaper model when available. */
export async function matchJob(
  profile: Profile,
  job: JobListing,
  prefs: SearchPreferences
): Promise<MatchResult> {
  const text = await completeText(buildMatchPrompt(profile, job, prefs), { model: matcherModel() })
  return parseMatchResponse(text, prefs.minFitScore)
}
