import type { Profile } from '@/types/resume'
import type { SearchPreferences } from '@/types/agent'

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
}

/** Parses one side of a date range like "Jan 2020", "03/2021", or "2019". */
export function parseDatePoint(raw: string): Date | null {
  const text = raw.trim().toLowerCase()
  if (!text) return null
  if (/(present|current|now|today)/.test(text)) return new Date()

  const monthName = text.match(/([a-z]{3,9})\.?\s+(\d{4})/)
  if (monthName) {
    const month = MONTHS[monthName[1].slice(0, 4) === 'sept' ? 'sept' : monthName[1].slice(0, 3)]
    if (month !== undefined) return new Date(Number(monthName[2]), month, 1)
  }

  const numeric = text.match(/(\d{1,2})[/.](\d{4})/)
  if (numeric) {
    const month = Number(numeric[1]) - 1
    if (month >= 0 && month <= 11) return new Date(Number(numeric[2]), month, 1)
  }

  const yearOnly = text.match(/(\d{4})/)
  if (yearOnly) return new Date(Number(yearOnly[1]), 0, 1)

  return null
}

/** Parses a range like "Jan 2020 - Present" or "2019–2021" into [start, end]. */
export function parseDateRange(dates: string): [Date, Date] | null {
  const parts = dates.split(/\s*(?:-|–|—|to|until)\s*/i).filter(Boolean)
  if (parts.length === 0) return null
  const start = parseDatePoint(parts[0])
  if (!start) return null
  const end = parts.length > 1 ? parseDatePoint(parts[parts.length - 1]) : new Date()
  if (!end || end < start) return null
  return [start, end]
}

/**
 * Total years of work experience from the profile, with overlapping
 * roles merged so parallel jobs are not double counted.
 */
export function calculateExperienceYears(profile: Profile): number {
  const intervals: [number, number][] = []
  for (const role of profile.experience || []) {
    const range = parseDateRange(role.dates || '')
    if (range) intervals.push([range[0].getTime(), range[1].getTime()])
  }
  if (intervals.length === 0) return 0

  intervals.sort((a, b) => a[0] - b[0])
  let total = 0
  let [curStart, curEnd] = intervals[0]
  for (const [start, end] of intervals.slice(1)) {
    if (start <= curEnd) {
      curEnd = Math.max(curEnd, end)
    } else {
      total += curEnd - curStart
      curStart = start
      curEnd = end
    }
  }
  total += curEnd - curStart

  const years = total / (365.25 * 24 * 60 * 60 * 1000)
  return Math.round(years * 10) / 10
}

/** The years to search for: explicit preference wins, otherwise computed from the profile. */
export function effectiveExperienceYears(
  prefs: Pick<SearchPreferences, 'experienceYears'>,
  profile: Profile
): number {
  if (prefs.experienceYears !== null && prefs.experienceYears !== undefined) {
    return prefs.experienceYears
  }
  return calculateExperienceYears(profile)
}

/**
 * Maps years of experience to LinkedIn's f_E experience-level codes:
 * 1 internship, 2 entry, 3 associate, 4 mid-senior, 5 director, 6 executive.
 */
export function linkedinExperienceLevels(years: number): string[] {
  if (years < 1) return ['1', '2']
  if (years < 3) return ['2', '3']
  if (years < 6) return ['3', '4']
  if (years < 10) return ['4']
  return ['4', '5']
}
