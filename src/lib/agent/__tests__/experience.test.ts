import { describe, expect, it } from 'vitest'
import type { Profile } from '@/types/resume'
import {
  calculateExperienceYears,
  effectiveExperienceYears,
  linkedinExperienceLevels,
  parseDateRange,
} from '../experience'

function profileWith(dates: string[]): Profile {
  return {
    name: 'T', email: '', phone: '', location: '', linkedin: '', website: '',
    summary: '', education: [], skills: [], projects: [],
    experience: dates.map((d, i) => ({
      company: `Co ${i}`, title: 'Dev', location: '', dates: d, bullets: [],
    })),
  }
}

describe('parseDateRange', () => {
  it('parses month-name ranges', () => {
    const range = parseDateRange('Jan 2020 - Mar 2022')
    expect(range?.[0].getFullYear()).toBe(2020)
    expect(range?.[1].getFullYear()).toBe(2022)
    expect(range?.[1].getMonth()).toBe(2)
  })

  it('treats Present as now', () => {
    const range = parseDateRange('Jun 2023 - Present')
    expect(range?.[1].getFullYear()).toBe(new Date().getFullYear())
  })

  it('parses year-only and numeric formats', () => {
    expect(parseDateRange('2019 - 2021')?.[0].getFullYear()).toBe(2019)
    expect(parseDateRange('03/2020 - 06/2021')?.[0].getMonth()).toBe(2)
  })

  it('returns null for garbage', () => {
    expect(parseDateRange('')).toBeNull()
    expect(parseDateRange('freelance work')).toBeNull()
  })
})

describe('calculateExperienceYears', () => {
  it('sums non-overlapping roles', () => {
    const years = calculateExperienceYears(
      profileWith(['Jan 2018 - Jan 2020', 'Jan 2021 - Jan 2023'])
    )
    expect(years).toBeCloseTo(4, 0)
  })

  it('merges overlapping roles instead of double counting', () => {
    const years = calculateExperienceYears(
      profileWith(['Jan 2020 - Jan 2022', 'Jun 2020 - Jun 2022'])
    )
    expect(years).toBeCloseTo(2.4, 0)
  })

  it('returns 0 for empty or unparseable history', () => {
    expect(calculateExperienceYears(profileWith([]))).toBe(0)
    expect(calculateExperienceYears(profileWith(['n/a']))).toBe(0)
  })
})

describe('effectiveExperienceYears', () => {
  const profile = profileWith(['Jan 2020 - Jan 2023'])

  it('prefers the explicit preference', () => {
    expect(effectiveExperienceYears({ experienceYears: 7 }, profile)).toBe(7)
    expect(effectiveExperienceYears({ experienceYears: 0 }, profile)).toBe(0)
  })

  it('falls back to the profile calculation when null', () => {
    expect(effectiveExperienceYears({ experienceYears: null }, profile)).toBeCloseTo(3, 0)
  })
})

describe('linkedinExperienceLevels', () => {
  it('maps years to f_E level codes', () => {
    expect(linkedinExperienceLevels(0)).toEqual(['1', '2'])
    expect(linkedinExperienceLevels(2)).toEqual(['2', '3'])
    expect(linkedinExperienceLevels(4)).toEqual(['3', '4'])
    expect(linkedinExperienceLevels(8)).toEqual(['4'])
    expect(linkedinExperienceLevels(15)).toEqual(['4', '5'])
  })
})
