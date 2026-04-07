'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Profile, Experience, Education, Project } from '@/types/resume'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 40 }, (_, i) => currentYear - i)

function parseDates(dates: string): { start: string; end: string; present: boolean } {
  // Expects format "Mon YYYY – Mon YYYY" or "Mon YYYY – Present"
  const parts = dates.split(/\s*[–-]\s*/)
  const present = parts[1]?.trim().toLowerCase() === 'present'
  return { start: parts[0]?.trim() || '', end: present ? '' : (parts[1]?.trim() || ''), present }
}

function MonthYearSelect({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const parts = value.split(' ')
  const month = MONTHS.includes(parts[0]) ? parts[0] : ''
  const year = parts[1] || ''
  const selectClass = "border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  return (
    <div className="flex gap-1.5">
      <select className={selectClass} value={month} onChange={e => onChange(`${e.target.value} ${year}`.trim())}>
        <option value="">Month</option>
        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select className={selectClass} value={year} onChange={e => onChange(`${month} ${e.target.value}`.trim())}>
        <option value="">{placeholder || 'Year'}</option>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function DateRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseDates(value)
  const [start, setStart] = useState(parsed.start)
  const [end, setEnd] = useState(parsed.end)
  const [present, setPresent] = useState(parsed.present)

  const emit = (s: string, e: string, p: boolean) => {
    onChange(`${s} – ${p ? 'Present' : e}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Start</p>
          <MonthYearSelect value={start} onChange={v => { setStart(v); emit(v, end, present) }} />
        </div>
        <div className="mt-4 text-gray-400">–</div>
        <div>
          <p className="text-xs text-gray-500 mb-1">End</p>
          {present
            ? <span className="text-sm font-medium text-blue-600 px-2 py-1.5 block">Present</span>
            : <MonthYearSelect value={end} onChange={v => { setEnd(v); emit(start, v, false) }} placeholder="Year" />
          }
        </div>
        <label className="flex items-center gap-1.5 mt-4 cursor-pointer text-sm text-gray-600">
          <input
            type="checkbox"
            checked={present}
            onChange={e => { setPresent(e.target.checked); emit(start, end, e.target.checked) }}
            className="rounded"
          />
          Present
        </label>
      </div>
    </div>
  )
}

const emptyProfile: Profile = {
  name: '', email: '', phone: '', location: '', linkedin: '', website: '',
  summary: '', experience: [], education: [], skills: [], projects: [],
}

const emptyExp: Experience = { company: '', title: '', location: '', dates: '', bullets: [] }
const emptyEdu: Education = { school: '', degree: '', field: '', dates: '' }
const emptyProject: Project = { name: '', description: '', technologies: [], url: '' }

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      if (!data.error) setProfile(data)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateField = (field: keyof Profile, value: unknown) =>
    setProfile(p => ({ ...p, [field]: value }))

  const updateExp = (i: number, field: keyof Experience, value: unknown) =>
    setProfile(p => ({
      ...p,
      experience: p.experience.map((e, idx) => idx === i ? { ...e, [field]: value } : e),
    }))

  const updateEdu = (i: number, field: keyof Education, value: string) =>
    setProfile(p => ({
      ...p,
      education: p.education.map((e, idx) => idx === i ? { ...e, [field]: value } : e),
    }))

  const updateProject = (i: number, field: keyof Project, value: unknown) =>
    setProfile(p => ({
      ...p,
      projects: p.projects.map((proj, idx) => idx === i ? { ...proj, [field]: value } : proj),
    }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !profile.skills.includes(s)) {
      updateField('skills', [...profile.skills, s])
    }
    setSkillInput('')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Personal Info */}
      <section>
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">Personal Info</h2>
        <div className="grid grid-cols-2 gap-4">
          {(['name', 'email', 'phone', 'location', 'linkedin', 'website'] as const).map(f => (
            <div key={f}>
              <label className="block text-sm font-medium text-gray-700 capitalize mb-1">{f}</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile[f]}
                onChange={e => updateField(f, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={profile.summary}
            onChange={e => updateField('summary', e.target.value)}
          />
        </div>
      </section>

      {/* Experience */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Experience</h2>
          <button
            onClick={() => updateField('experience', [...profile.experience, { ...emptyExp, bullets: [] }])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >+ Add</button>
        </div>
        {profile.experience.map((exp, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              {(['title', 'company', 'location'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs font-medium text-gray-600 capitalize mb-1">{f}</label>
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={exp[f]}
                    onChange={e => updateExp(i, f, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dates</label>
              <DateRangePicker value={exp.dates} onChange={v => updateExp(i, 'dates', v)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bullets (one per line)</label>
              <textarea
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={exp.bullets.join('\n')}
                onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))}
              />
            </div>
            <button
              onClick={() => updateField('experience', profile.experience.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:text-red-700"
            >Remove</button>
          </div>
        ))}
      </section>

      {/* Education */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Education</h2>
          <button
            onClick={() => updateField('education', [...profile.education, { ...emptyEdu }])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >+ Add</button>
        </div>
        {profile.education.map((edu, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(['school', 'degree', 'field'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs font-medium text-gray-600 capitalize mb-1">{f}</label>
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={edu[f]}
                    onChange={e => updateEdu(i, f, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dates</label>
              <DateRangePicker value={edu.dates} onChange={v => updateEdu(i, 'dates', v)} />
            </div>
            <button
              onClick={() => updateField('education', profile.education.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:text-red-700 mt-3 block"
            >Remove</button>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section>
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">Skills</h2>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a skill..."
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <button
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map(skill => (
            <span key={skill} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {skill}
              <button
                onClick={() => updateField('skills', profile.skills.filter(s => s !== skill))}
                className="text-blue-600 hover:text-blue-900 font-bold ml-1"
              >×</button>
            </span>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Projects</h2>
          <button
            onClick={() => updateField('projects', [...profile.projects, { ...emptyProject, technologies: [] }])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >+ Add</button>
        </div>
        {profile.projects.map((proj, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={proj.name}
                  onChange={e => updateProject(i, 'name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                <input
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={proj.url || ''}
                  onChange={e => updateProject(i, 'url', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={proj.description}
                onChange={e => updateProject(i, 'description', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Technologies (comma-separated)</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={proj.technologies.join(', ')}
                onChange={e => updateProject(i, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              />
            </div>
            <button
              onClick={() => updateField('projects', profile.projects.filter((_, idx) => idx !== i))}
              className="text-xs text-red-500 hover:text-red-700"
            >Remove</button>
          </div>
        ))}
      </section>

      {/* Save Button */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
        {saved && (
          <Link
            href="/apply"
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Next: Generate Resume →
          </Link>
        )}
      </div>
    </div>
  )
}
