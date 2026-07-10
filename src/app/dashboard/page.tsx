'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentStatus, ApplicationRecord } from '@/types/agent'

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  collected: { label: 'Collected', classes: 'bg-violet-500/15 text-violet-300 border-violet-500/40' },
  applied: { label: 'Applied', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  prepared: { label: 'Ready to submit', classes: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  needs_manual: { label: 'Needs manual step', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  failed: { label: 'Failed', classes: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
}

const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  glassdoor: 'Glassdoor',
  indeed: 'Indeed',
  alljobs: 'AllJobs',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.failed
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.classes}`}>
      {style.label}
    </span>
  )
}

function formatTime(iso?: string): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Countdown({ endsAt }: { endsAt?: string }) {
  const [ms, setMs] = useState<number | null>(null)
  useEffect(() => {
    if (!endsAt) return
    const compute = () => setMs(new Date(endsAt).getTime() - Date.now())
    compute()
    const t = setInterval(compute, 1000)
    return () => clearInterval(t)
  }, [endsAt])
  if (!endsAt || ms === null) return null
  if (ms <= 0) return <span className="text-zinc-500">finishing…</span>
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return (
    <span className="tabular-nums">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

function AgentPanel({
  status,
  log,
  onChanged,
}: {
  status: AgentStatus | null
  log: string[]
  onChanged: () => void
}) {
  const [hours, setHours] = useState(3)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmStop, setConfirmStop] = useState(false)
  const running = Boolean(status?.running)

  const act = async (body: object) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong')
      }
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const metrics = [
    { label: 'Cycles', value: status?.cycle ?? 0 },
    { label: 'New jobs seen', value: status?.jobsSeen ?? 0 },
    { label: 'Matched', value: status?.jobsMatched ?? 0 },
    { label: 'Applications', value: status?.applications ?? 0 },
  ]

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur overflow-hidden">
      <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span
            className={`relative flex h-3 w-3 ${running ? '' : 'opacity-40'}`}
            aria-hidden
          >
            {running && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${running ? 'bg-emerald-400' : 'bg-zinc-600'}`}
            />
          </span>
          <div>
            <h2 className="font-bold text-zinc-100 leading-tight">Auto-Apply Agent</h2>
            <p className="text-xs text-zinc-400 font-mono">
              {running ? (
                <>
                  running · <Countdown endsAt={status?.endsAt} /> left
                </>
              ) : (
                'idle'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {running ? (
            <button
              onClick={() => setConfirmStop(true)}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/25 transition-colors disabled:opacity-50"
            >
              Stop Agent
            </button>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                Run for
                <input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                hours
              </label>
              <button
                onClick={() => act({ action: 'start', hours })}
                disabled={busy}
                className="px-5 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                ▶ Start Agent
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/30 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-800 border-b border-zinc-800">
        {metrics.map((metric) => (
          <div key={metric.label} className="px-6 py-4">
            <p className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">{metric.value}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="px-6 py-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
          {status?.lastActivity ? `Latest: ${status.lastActivity}` : 'Activity log'}
        </p>
        <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-3 h-40 overflow-y-auto font-mono text-xs text-zinc-400 space-y-0.5">
          {log.length === 0 ? (
            <p className="text-zinc-600">
              No activity yet. Start the agent here, or run <span className="text-emerald-400">npm run agent -- 3</span> in your terminal.
            </p>
          ) : (
            log.map((line, i) => <p key={i}>{line}</p>)
          )}
        </div>
      </div>

      {confirmStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmStop(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <p className="text-3xl mb-3">🛑</p>
            <h3 className="text-lg font-bold text-zinc-100 mb-1">Stop the agent?</h3>
            <p className="text-sm text-zinc-400 mb-5">
              The current run will end immediately. Everything already collected or applied stays saved, and you can start a new run anytime.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmStop(false)}
                className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-semibold hover:border-zinc-500 transition-colors"
              >
                Keep Running
              </button>
              <button
                onClick={() => {
                  setConfirmStop(false)
                  act({ action: 'stop' })
                }}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold hover:bg-rose-400 transition-colors disabled:opacity-50"
              >
                Yes, Stop Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'
  return (
    <div className="text-center">
      <p className={`text-xl font-bold font-mono tabular-nums ${color}`}>{score}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function DetailDrawer({
  record,
  onClose,
  onApplied,
}: {
  record: ApplicationRecord
  onClose: () => void
  onApplied: (updated: ApplicationRecord) => void
}) {
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editSummary, setEditSummary] = useState('')
  const [editSkills, setEditSkills] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [coverCopied, setCoverCopied] = useState(false)

  const startEditing = () => {
    setEditSummary(record.resume.summary)
    setEditSkills(record.resume.skills.join(', '))
    setSaveError('')
    setEditing(true)
  }

  const saveResume = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const updatedResume = {
        ...record.resume,
        summary: editSummary,
        skills: editSkills.split(',').map((s) => s.trim()).filter(Boolean),
      }
      const res = await fetch(`/api/applications/${record.id}/resume`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: updatedResume }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || 'Save failed')
      } else {
        onApplied(data)
        setEditing(false)
      }
    } catch {
      setSaveError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const copyCoverLetter = async () => {
    if (!record.coverLetter) return
    try {
      await navigator.clipboard.writeText(record.coverLetter)
      setCoverCopied(true)
      setTimeout(() => setCoverCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  const applyNow = async () => {
    setApplying(true)
    setApplyError('')
    try {
      const res = await fetch(`/api/applications/${record.id}/apply`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setApplyError(data.error || 'Apply failed')
      } else {
        onApplied(data)
      }
    } catch {
      setApplyError('Apply failed')
    } finally {
      setApplying(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">{record.job.title}</h3>
            <p className="text-sm text-zinc-400">
              {record.job.company} · {record.job.location || 'location n/a'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-500 hover:text-zinc-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={record.status} />
            <span className="text-xs text-zinc-500 font-mono">{formatTime(record.appliedAt)}</span>
            <span className="text-xs text-zinc-500">
              via {SOURCE_LABELS[record.job.source] ?? record.job.source} · {record.appliedVia}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <ScoreRing score={record.fitScore} label="Fit score" />
            <ScoreRing score={record.atsScore.score} label="ATS score" />
            <div className="text-center">
              <p className="text-xl font-bold font-mono text-zinc-300">{record.atsAttempts}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">ATS passes</p>
            </div>
          </div>

          {record.fitReasons.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Why it matched</p>
              <ul className="space-y-1.5">
                {record.fitReasons.map((reason, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex gap-2">
                    <span className="text-emerald-400">→</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">ATS breakdown</p>
            <div className="space-y-2">
              {Object.entries(record.atsScore.breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-44 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-400' : value >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 w-8 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {applyError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-300">
              {applyError}
            </div>
          )}

          {record.notes && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-200">
              {record.notes}
            </div>
          )}

          {record.coverLetter && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Cover letter</p>
                <button
                  onClick={copyCoverLetter}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  {coverCopied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 max-h-56 overflow-y-auto">
                {record.coverLetter}
              </p>
            </div>
          )}

          {record.status !== 'applied' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Resume</p>
                {!editing && (
                  <button
                    onClick={startEditing}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    ✏️ Edit before applying
                  </button>
                )}
              </div>
              {editing && (
                <div className="space-y-3 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Summary</label>
                    <textarea
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      rows={4}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Skills (comma-separated)</label>
                    <textarea
                      value={editSkills}
                      onChange={(e) => setEditSkills(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {saveError && <p className="text-xs text-rose-300">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveResume}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving & rebuilding PDF…' : 'Save & rebuild PDF'}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-semibold hover:border-zinc-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(record.status === 'collected' || record.status === 'prepared') && (
              <button
                onClick={applyNow}
                disabled={applying}
                className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-bold hover:bg-violet-400 transition-colors disabled:opacity-50"
              >
                {applying ? 'Applying…' : '⚡ Apply Now'}
              </button>
            )}
            <a
              href={`/api/applications/${record.id}/resume`}
              target="_blank"
              className="px-4 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-sm font-bold hover:bg-emerald-400 transition-colors"
            >
              View Resume PDF
            </a>
            {record.job.url && (
              <a
                href={record.job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-semibold hover:border-zinc-500 transition-colors"
              >
                Open Job Posting ↗
              </a>
            )}
          </div>

          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Saved locally</p>
            <p className="text-xs font-mono text-zinc-500 break-all bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
              data/applications/{record.id}/
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [selected, setSelected] = useState<ApplicationRecord | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'fit' | 'ats'>('date')
  const [loaded, setLoaded] = useState(false)
  const prevCountRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [agentRes, appsRes] = await Promise.all([
        fetch('/api/agent'),
        fetch('/api/applications'),
      ])
      const agentData = await agentRes.json()
      setStatus(agentData.status)
      setLog(agentData.log || [])
      setApplications(await appsRes.json())
    } catch {
      // keep last known state
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [refresh])

  // Desktop notification when the agent adds a new application
  useEffect(() => {
    if (!loaded) return
    const prev = prevCountRef.current
    prevCountRef.current = applications.length
    if (prev === null || applications.length <= prev) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
      return
    }
    if (Notification.permission === 'granted') {
      const latest = applications[0]
      new Notification('SmartResume: new application', {
        body: latest ? `${latest.job.title} @ ${latest.job.company}` : `${applications.length - prev} new`,
      })
    }
  }, [applications, loaded])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? applications : applications.filter((a) => a.status === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (a) =>
          a.job.title.toLowerCase().includes(q) ||
          a.job.company.toLowerCase().includes(q) ||
          (a.job.location || '').toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    if (sortBy === 'fit') sorted.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
    else if (sortBy === 'ats') sorted.sort((a, b) => (b.atsScore?.score ?? 0) - (a.atsScore?.score ?? 0))
    else sorted.sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''))
    return sorted
  }, [applications, filter, search, sortBy])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: applications.length }
    for (const app of applications) map[app.status] = (map[app.status] || 0) + 1
    return map
  }, [applications])

  return (
    <main className="min-h-[calc(100vh-57px)] bg-zinc-950 text-zinc-100 px-4 sm:px-8 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-emerald-400 uppercase tracking-[0.2em] mb-1">
              Mission Control
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">Applications Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Everything the agent found, tailored, and applied to. Saved locally in data/.
            </p>
          </div>
        </header>

        <AgentPanel status={status} log={log} onChanged={refresh} />

        <section>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {['all', 'collected', 'applied', 'prepared', 'needs_manual', 'failed'].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filter === key
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {key === 'all' ? 'All' : (STATUS_STYLES[key]?.label ?? key)}
                <span className="ml-1.5 font-mono">{counts[key] || 0}</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, company…"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-48"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'fit' | 'ats')}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="date">Newest first</option>
                <option value="fit">Best fit</option>
                <option value="ats">Highest ATS</option>
              </select>
            </div>
          </div>

          {!loaded ? (
            <div className="text-zinc-500 text-sm py-16 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-2xl py-16 text-center">
              <p className="text-4xl mb-3">🛰️</p>
              <p className="text-zinc-300 font-semibold">No applications yet</p>
              <p className="text-zinc-500 text-sm mt-1 max-w-md mx-auto">
                Set your job titles in Preferences, then start the agent above or run{' '}
                <span className="font-mono text-emerald-400">npm run agent -- 3</span> to hunt for 3 hours.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((record) => (
                <li key={record.id}>
                  <button
                    onClick={() => setSelected(record)}
                    className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 transition-colors px-5 py-4 flex flex-wrap items-center gap-4"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-zinc-100">{record.job.title}</p>
                      <p className="text-sm text-zinc-400">
                        {record.job.company}
                        {record.job.location ? ` · ${record.job.location}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                      {SOURCE_LABELS[record.job.source] ?? record.job.source}
                    </span>
                    <div className="flex items-center gap-4">
                      <ScoreRing score={record.fitScore} label="Fit" />
                      <ScoreRing score={record.atsScore.score} label="ATS" />
                    </div>
                    <StatusBadge status={record.status} />
                    <span className="text-xs text-zinc-500 font-mono w-28 text-right">
                      {formatTime(record.appliedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected && (
        <DetailDrawer
          record={selected}
          onClose={() => setSelected(null)}
          onApplied={(updated) => {
            setSelected(updated)
            refresh()
          }}
        />
      )}
    </main>
  )
}
