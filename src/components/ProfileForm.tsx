'use client'

import { useState, useEffect } from 'react'
import LinkedInImport from '@/components/LinkedInImport'
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
  const selectClass = "border border-gray-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-zinc-900"
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
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Start</p>
          <MonthYearSelect value={start} onChange={v => { setStart(v); emit(v, end, present) }} />
        </div>
        <div className="mt-4 text-gray-400 dark:text-zinc-500">–</div>
        <div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">End</p>
          {present
            ? <span className="text-sm font-medium text-teal-600 dark:text-teal-400 px-2 py-1.5 block">Present</span>
            : <MonthYearSelect value={end} onChange={v => { setEnd(v); emit(start, v, false) }} placeholder="Year" />
          }
        </div>
        <label className="flex items-center gap-1.5 mt-4 cursor-pointer text-sm text-gray-600 dark:text-zinc-400">
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
      if (!data.error) {
        setProfile(data)
      }
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

  const handleLinkedInImport = (imported: Profile) => {
    setProfile(p => ({
      name: imported.name || p.name,
      email: imported.email || p.email,
      phone: imported.phone || p.phone,
      location: imported.location || p.location,
      linkedin: imported.linkedin || p.linkedin,
      website: imported.website || p.website,
      summary: imported.summary || p.summary,
      experience: imported.experience?.length ? imported.experience : p.experience,
      education: imported.education?.length ? imported.education : p.education,
      skills: imported.skills?.length ? imported.skills : p.skills,
      projects: imported.projects?.length ? imported.projects : p.projects,
    }))
  }

  const filledCount = [
    profile.name && profile.email,
    profile.summary,
    profile.experience.length > 0,
    profile.education.length > 0,
    profile.skills.length > 0,
  ].filter(Boolean).length

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* LinkedIn Import */}
      <LinkedInImport onImport={handleLinkedInImport} />

      {/* Personal Info */}
      <Section icon="👤" title="Personal Info" subtitle="How recruiters can reach you">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['name', 'email', 'phone', 'location', 'linkedin', 'website'] as const).map(f => (
            <div key={f}>
              <label className={labelClass}>{f}</label>
              <input
                className={inputClass}
                placeholder={FIELD_PLACEHOLDERS[f]}
                value={profile[f]}
                onChange={e => updateField(f, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className={labelClass}>Summary</label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="A 2-3 sentence pitch: who you are, what you do best, and what you're looking for."
            value={profile.summary}
            onChange={e => updateField('summary', e.target.value)}
          />
        </div>
      </Section>

      {/* Experience */}
      <Section
        icon="💼"
        title="Experience"
        subtitle="Most recent first"
        action={
          <AddButton onClick={() => updateField('experience', [...profile.experience, { ...emptyExp, bullets: [] }])} />
        }
      >
        {profile.experience.length === 0 && (
          <EmptyState text="No experience added yet" hint="Add your work history so the AI can tailor resumes around it." />
        )}
        <div className="space-y-4">
          {profile.experience.map((exp, i) => (
            <EntryCard
              key={i}
              index={i}
              label={exp.title || exp.company || `Position ${i + 1}`}
              onRemove={() => updateField('experience', profile.experience.filter((_, idx) => idx !== i))}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['title', 'company', 'location'] as const).map(f => (
                  <div key={f}>
                    <label className={smallLabelClass}>{f}</label>
                    <input
                      className={inputClass}
                      value={exp[f]}
                      onChange={e => updateExp(i, f, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className={smallLabelClass}>Dates</label>
                <DateRangePicker value={exp.dates} onChange={v => updateExp(i, 'dates', v)} />
              </div>
              <div>
                <label className={smallLabelClass}>Highlights (one per line)</label>
                <textarea
                  className={inputClass}
                  rows={4}
                  placeholder={"Led migration to microservices, cutting deploy time by 60%\nMentored 3 junior engineers"}
                  value={exp.bullets.join('\n')}
                  onChange={e => updateExp(i, 'bullets', e.target.value.split('\n'))}
                />
              </div>
            </EntryCard>
          ))}
        </div>
      </Section>

      {/* Education */}
      <Section
        icon="🎓"
        title="Education"
        action={<AddButton onClick={() => updateField('education', [...profile.education, { ...emptyEdu }])} />}
      >
        {profile.education.length === 0 && (
          <EmptyState text="No education added yet" hint="Degrees, bootcamps, and certifications all count." />
        )}
        <div className="space-y-4">
          {profile.education.map((edu, i) => (
            <EntryCard
              key={i}
              index={i}
              label={edu.school || `Education ${i + 1}`}
              onRemove={() => updateField('education', profile.education.filter((_, idx) => idx !== i))}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['school', 'degree', 'field'] as const).map(f => (
                  <div key={f}>
                    <label className={smallLabelClass}>{f}</label>
                    <input
                      className={inputClass}
                      value={edu[f]}
                      onChange={e => updateEdu(i, f, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className={smallLabelClass}>Dates</label>
                <DateRangePicker value={edu.dates} onChange={v => updateEdu(i, 'dates', v)} />
              </div>
            </EntryCard>
          ))}
        </div>
      </Section>

      {/* Skills */}
      <Section icon="⚡" title="Skills" subtitle="Press Enter to add each one">
        <div className="flex gap-2 mb-3">
          <input
            className={inputClass + ' flex-1'}
            placeholder="e.g. TypeScript, React, PostgreSQL..."
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
          />
          <button
            onClick={addSkill}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >Add</button>
        </div>
        {profile.skills.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-zinc-500">No skills yet. These are matched against job requirements, so add plenty.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {profile.skills.map(skill => (
            <span key={skill} className="group flex items-center gap-1 bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full text-sm font-medium border border-teal-200/60 dark:border-teal-500/20">
              {skill}
              <button
                onClick={() => updateField('skills', profile.skills.filter(s => s !== skill))}
                className="text-teal-500 hover:text-teal-900 dark:hover:text-teal-100 font-bold ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${skill}`}
              >×</button>
            </span>
          ))}
        </div>
      </Section>

      {/* Projects */}
      <Section
        icon="🛠️"
        title="Projects"
        subtitle="Optional, but great for standing out"
        action={<AddButton onClick={() => updateField('projects', [...profile.projects, { ...emptyProject, technologies: [] }])} />}
      >
        {profile.projects.length === 0 && (
          <EmptyState text="No projects added yet" hint="Side projects and open source work show initiative." />
        )}
        <div className="space-y-4">
          {profile.projects.map((proj, i) => (
            <EntryCard
              key={i}
              index={i}
              label={proj.name || `Project ${i + 1}`}
              onRemove={() => updateField('projects', profile.projects.filter((_, idx) => idx !== i))}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={smallLabelClass}>Name</label>
                  <input
                    className={inputClass}
                    value={proj.name}
                    onChange={e => updateProject(i, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={smallLabelClass}>URL</label>
                  <input
                    className={inputClass}
                    value={proj.url || ''}
                    onChange={e => updateProject(i, 'url', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={smallLabelClass}>Description</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={proj.description}
                  onChange={e => updateProject(i, 'description', e.target.value)}
                />
              </div>
              <div>
                <label className={smallLabelClass}>Technologies (comma-separated)</label>
                <input
                  className={inputClass}
                  value={proj.technologies.join(', ')}
                  onChange={e => updateProject(i, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                />
              </div>
            </EntryCard>
          ))}
        </div>
      </Section>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between gap-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-lg px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3, 4].map(n => (
                <span
                  key={n}
                  className={`w-6 h-1.5 rounded-full transition-colors ${n < filledCount ? 'bg-teal-500' : 'bg-gray-200 dark:bg-zinc-700'}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
              {filledCount === 5 ? 'Profile complete 🎉' : `${filledCount}/5 sections filled`}
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="shrink-0 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md shadow-teal-600/20 hover:-translate-y-px"
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800/80 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-zinc-300 capitalize mb-1'
const smallLabelClass = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 capitalize mb-1'

const FIELD_PLACEHOLDERS: Record<string, string> = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 000 1234',
  location: 'Tel Aviv, Israel',
  linkedin: 'linkedin.com/in/janedoe',
  website: 'janedoe.dev',
}

function Section({ icon, title, subtitle, action, children }: {
  icon: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 flex items-center justify-center text-lg" aria-hidden>
            {icon}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
    >+ Add</button>
  )
}

function EmptyState({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl mb-4">
      <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">{text}</p>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{hint}</p>
    </div>
  )
}

function EntryCard({ index, label, onRemove, children }: {
  index: number
  label: string
  onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 truncate">{label}</p>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors shrink-0"
          aria-label={`Remove ${label}`}
        >Remove</button>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}
