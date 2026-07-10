'use client'

import { useEffect, useState } from 'react'
import type { SearchPreferences, JobSourceId } from '@/types/agent'

const SOURCE_OPTIONS: { id: JobSourceId; label: string; hint: string }[] = [
  { id: 'linkedin', label: 'LinkedIn', hint: 'No key needed' },
  { id: 'alljobs', label: 'AllJobs', hint: 'No key needed' },
  { id: 'indeed', label: 'Indeed', hint: 'Needs INDEED_PUBLISHER_ID' },
  { id: 'glassdoor', label: 'Glassdoor', hint: 'Needs GLASSDOOR_* keys' },
]

function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (value && !values.includes(value)) onChange([...values, value])
    setDraft('')
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 text-sm px-2.5 py-1 rounded-full"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default function PreferencesForm() {
  const [prefs, setPrefs] = useState<SearchPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then(setPrefs)
      .catch(() => setPrefs(null))
  }, [])

  if (!prefs) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6 text-sm text-gray-400 dark:text-zinc-500">
        Loading preferences…
      </div>
    )
  }

  const set = <K extends keyof SearchPreferences>(key: K, value: SearchPreferences[K]) => {
    setPrefs({ ...prefs, [key]: value })
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const numberField = (
    label: string,
    key: 'minFitScore' | 'minAtsScore' | 'maxApplicationsPerRun' | 'pollMinutes',
    min: number,
    max: number
  ) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={prefs[key]}
        onChange={(e) => set(key, Number(e.target.value))}
        className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  )

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 border-l-4 border-l-teal-500 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Job Search Preferences</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          The agent uses these to find, match, and apply to jobs automatically.
        </p>
      </div>

      <TagInput
        label="Job titles"
        hint="The agent searches for each of these titles."
        values={prefs.jobTitles}
        onChange={(v) => set('jobTitles', v)}
        placeholder="e.g. Frontend Engineer"
      />

      <TagInput
        label="Locations"
        hint="Leave empty for anywhere."
        values={prefs.locations}
        onChange={(v) => set('locations', v)}
        placeholder="e.g. Tel Aviv, Israel"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <TagInput
          label="Must-have keywords"
          hint="At least one must appear in the listing."
          values={prefs.keywords}
          onChange={(v) => set('keywords', v)}
          placeholder="e.g. React"
        />
        <TagInput
          label="Exclude keywords"
          hint="Listings containing these are skipped."
          values={prefs.excludeKeywords}
          onChange={(v) => set('excludeKeywords', v)}
          placeholder="e.g. Senior Director"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Job boards</label>
        <div className="grid grid-cols-2 gap-2">
          {SOURCE_OPTIONS.map((source) => (
            <label
              key={source.id}
              className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                prefs.sources.includes(source.id)
                  ? 'border-teal-400 bg-teal-50 dark:bg-teal-500/10 text-teal-800'
                  : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600'
              }`}
            >
              <input
                type="checkbox"
                checked={prefs.sources.includes(source.id)}
                onChange={(e) =>
                  set(
                    'sources',
                    e.target.checked
                      ? [...prefs.sources, source.id]
                      : prefs.sources.filter((s) => s !== source.id)
                  )
                }
                className="rounded"
              />
              <span className="font-medium">{source.label}</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500 ml-auto">{source.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={prefs.remoteOnly}
          onChange={(e) => set('remoteOnly', e.target.checked)}
          className="rounded"
        />
        Remote jobs only
      </label>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">Job freshness</label>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">
          Only consider jobs published within this window.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Last 2h', hours: 2 },
            { label: 'Last 6h', hours: 6 },
            { label: 'Last 12h', hours: 12 },
            { label: 'Last 24h', hours: 24 },
            { label: 'Last 3 days', hours: 72 },
            { label: 'Last week', hours: 168 },
          ].map((option) => (
            <button
              key={option.hours}
              type="button"
              onClick={() => set('maxJobAgeHours', option.hours)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                prefs.maxJobAgeHours === option.hours
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105'
                  : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-300 dark:border-zinc-700 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-300'
              }`}
            >
              {option.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-xs text-gray-400 dark:text-zinc-500">or custom:</span>
            <input
              type="number"
              min={1}
              max={720}
              value={prefs.maxJobAgeHours}
              onChange={(e) => set('maxJobAgeHours', Math.max(1, Number(e.target.value)))}
              className="w-20 border border-gray-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              hours{prefs.maxJobAgeHours >= 48 ? ` (~${Math.round(prefs.maxJobAgeHours / 24)} days)` : ''}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
          Years of experience
        </label>
        <input
          type="number"
          min={0}
          max={40}
          step={0.5}
          value={prefs.experienceYears ?? ''}
          placeholder="Auto (from your work history)"
          onChange={(e) =>
            set('experienceYears', e.target.value === '' ? null : Number(e.target.value))
          }
          className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-400 dark:placeholder-zinc-500"
        />
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
          Used to target the right seniority level. Leave empty to calculate automatically from the
          experience in your profile.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {numberField('Min fit score', 'minFitScore', 0, 100)}
        {numberField('Min ATS score', 'minAtsScore', 0, 100)}
        {numberField('Max applies / run', 'maxApplicationsPerRun', 1, 100)}
        {numberField('Poll every (min)', 'pollMinutes', 1, 240)}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
        {saved && <span className="text-sm text-teal-600 dark:text-teal-400 font-medium">Saved ✓</span>}
      </div>
    </div>
  )
}
