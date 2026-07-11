'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Provider = 'claude' | 'openai'

interface SettingsPayload {
  settings: Record<string, unknown>
  hasSecrets: Record<string, boolean>
  env: Record<string, string | null>
  envKeyConfigured: boolean
}

interface FieldDef {
  key: string
  label: string
  hint?: string
  type: 'text' | 'secret' | 'number' | 'toggle'
  placeholder?: string
  suffix?: string
}

interface SectionDef {
  id: string
  icon: string
  title: string
  subtitle: string
  fields: FieldDef[]
}

const SECTIONS: SectionDef[] = [
  {
    id: 'ai',
    icon: '🧠',
    title: 'AI Provider',
    subtitle: 'Provider, key, and the models that write and score your resumes',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'secret', hint: 'Stored locally in personaldata/settings.json, never sent anywhere but your provider', placeholder: 'sk-... or sk-ant-...' },
      { key: 'model', label: 'Model', type: 'text', hint: 'Main model for resume generation', placeholder: 'gpt-4o' },
      { key: 'matcherModel', label: 'Matcher model', type: 'text', hint: 'Cheaper model used for job-fit screening', placeholder: 'gpt-4o-mini' },
    ],
  },
  {
    id: 'agent',
    icon: '🤖',
    title: 'Agent Behavior',
    subtitle: 'How the agent runs and what it does with matches',
    fields: [
      { key: 'collectOnly', label: 'Review before applying', type: 'toggle', hint: 'On: collect matches for one-click review. Off: apply automatically' },
      { key: 'agentRunHours', label: 'Default run length', type: 'number', hint: 'Used when you don\u2019t pass hours explicitly', suffix: 'hours' },
      { key: 'agentPollMinutes', label: 'Search cycle interval', type: 'number', hint: 'Minutes between search sweeps', suffix: 'min' },
      { key: 'agentMaxApplications', label: 'Max applications per run', type: 'number', hint: 'The agent stops after this many', suffix: 'apps' },
      { key: 'generateCoverLetter', label: 'Generate cover letters', type: 'toggle', hint: 'Write a tailored cover letter for every application' },
    ],
  },
  {
    id: 'boards',
    icon: '🌐',
    title: 'Job Board Keys',
    subtitle: 'LinkedIn works without keys. Add these to unlock more boards',
    fields: [
      { key: 'indeedPublisherId', label: 'Indeed publisher ID', type: 'text', placeholder: '1234567890' },
      { key: 'glassdoorPartnerId', label: 'Glassdoor partner ID', type: 'text', placeholder: '12345' },
      { key: 'glassdoorApiKey', label: 'Glassdoor API key', type: 'secret', placeholder: 'key...' },
    ],
  },
  {
    id: 'autoapply',
    icon: '🚀',
    title: 'Auto-Submit',
    subtitle: 'Let the agent complete LinkedIn Easy Apply on its own',
    fields: [
      { key: 'autoApply', label: 'Auto-submit Easy Apply', type: 'toggle', hint: 'Automating logins may violate LinkedIn\u2019s terms. Use at your own risk' },
      { key: 'linkedinEmail', label: 'LinkedIn email', type: 'text', placeholder: 'you@example.com' },
      { key: 'linkedinPassword', label: 'LinkedIn password', type: 'secret', placeholder: '••••••••' },
      { key: 'autoApplyHeadless', label: 'Headless browser', type: 'toggle', hint: 'Off: watch the browser window while it applies' },
    ],
  },
]

export default function SettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null)
  const [provider, setProvider] = useState<Provider | ''>('')
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [aiOpen, setAiOpen] = useState<boolean | null>(null)
  const [confirmAiDelete, setConfirmAiDelete] = useState(false)

  const applyPayload = useCallback((payload: SettingsPayload) => {
    setData(payload)
    setProvider((payload.settings.provider as Provider) || '')
    setForm({ ...payload.settings })
    setDirty(new Set())
    setRevealed({})
  }, [])

  const load = useCallback(async () => {
    const res = await fetch('/api/settings')
    applyPayload((await res.json()) as SettingsPayload)
  }, [applyPayload])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((payload: SettingsPayload) => applyPayload(payload))
  }, [applyPayload])

  const markDirty = (key: string, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(d => new Set(d).add(key))
  }

  const clearOverride = (key: string) => markDirty(key, null)

  const reveal = async (key: string) => {
    const res = await fetch('/api/settings?reveal=1')
    const payload = await res.json()
    setRevealed(r => ({ ...r, [key]: payload.settings[key] || '' }))
  }

  const isDirty = dirty.size > 0

  const save = async () => {
    if (!isDirty) return
    setSaving(true)
    setError('')
    const body: Record<string, unknown> = {}
    for (const key of dirty) body[key] = form[key]
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setError(payload.error || 'Failed to save settings')
      return
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2200)
    if (dirty.has('apiKey')) setAiOpen(null)
    await load()
  }

  const resetAll = async () => {
    await fetch('/api/settings', { method: 'DELETE' })
    setConfirmReset(false)
    await load()
  }

  const deleteAiConfig = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: null, apiKey: null, model: null, matcherModel: null }),
    })
    setConfirmAiDelete(false)
    setAiOpen(null)
    await load()
  }

  const overrideCount = useMemo(() => {
    if (!data) return 0
    return Object.entries(form).filter(([, v]) => v !== undefined && v !== null && v !== '').length
  }, [form, data])

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-gray-400 dark:text-zinc-500 animate-pulse">Loading settings…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 py-12 px-4">
      <div className="max-w-3xl mx-auto pb-24">
        {/* header */}
        <div className="rise mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Everything here is optional: values you save override <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-xs font-mono">.env.local</code>, and fields left empty fall back to it.
            <span className="ml-2 inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium">{overrideCount} saved override{overrideCount === 1 ? '' : 's'}</span>
          </p>
        </div>

        {/* sections */}
        {SECTIONS.map((section, si) => {
          const isAi = section.id === 'ai'
          const hasKey = Boolean(data.hasSecrets.apiKey)
          const open = !isAi || (aiOpen ?? !hasKey)
          const effectiveProvider = (provider || data.env.provider || 'claude') as Provider
          return (
          <div key={section.id} className="rise bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 mb-6" style={{ animationDelay: `${0.05 + si * 0.06}s` }}>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 flex items-center justify-center text-lg" aria-hidden>{section.icon}</span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-tight">{section.title}</h2>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{section.subtitle}</p>
              </div>
              {isAi && hasKey && (
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {open ? (
                    <button
                      onClick={() => setAiOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >Close</button>
                  ) : (
                    <>
                      <button
                        onClick={() => setAiOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-200 dark:border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
                      >✎ Edit</button>
                      <button
                        onClick={() => setConfirmAiDelete(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-500/40 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      >Delete</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {isAi && !open ? (
              /* collapsed summary */
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Provider', value: effectiveProvider === 'openai' ? 'GPT · OpenAI' : 'Claude · Anthropic' },
                  { label: 'API key', value: (data.settings.apiKey as string) || '••••••••' },
                  { label: 'Model', value: (form.model as string) || data.env.model || 'default' },
                  { label: 'Matcher', value: (form.matcherModel as string) || data.env.matcherModel || 'default' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 px-3 py-2.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-0.5">{item.label}</p>
                    <p className="text-sm font-mono truncate text-gray-700 dark:text-zinc-300">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                {isAi && (
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {([
                      { id: 'claude' as Provider, name: 'Claude', by: 'Anthropic' },
                      { id: 'openai' as Provider, name: 'GPT', by: 'OpenAI' },
                    ]).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setProvider(p.id); markDirty('provider', p.id) }}
                        className={`rounded-xl border-2 p-4 text-left transition-all ${
                          effectiveProvider === p.id
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 shadow-sm'
                            : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">{p.by}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {section.fields.map(field => (
                    <FieldRow
                      key={field.key}
                      field={field}
                      value={form[field.key]}
                      envValue={data.env[field.key] ?? null}
                      hasSecret={Boolean(data.hasSecrets[field.key])}
                      revealedValue={revealed[field.key]}
                      onChange={v => markDirty(field.key, v)}
                      onClear={() => clearOverride(field.key)}
                      onReveal={() => reveal(field.key)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          )
        })}

        {/* danger zone */}
        <div className="rise bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-500/30 rounded-2xl shadow-sm p-6" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400">Reset saved settings</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Deletes personaldata/settings.json. Your .env.local is untouched.</p>
            </div>
            <button
              onClick={() => setConfirmReset(true)}
              className="shrink-0 px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >Reset all</button>
          </div>
        </div>

        {/* sticky save bar */}
        <div className="sticky bottom-4 z-10 mt-8">
          <div className="flex items-center justify-between gap-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-lg px-5 py-3">
            <p className="text-xs text-gray-500 dark:text-zinc-400 min-w-0 truncate">
              {error
                ? <span className="text-rose-500 font-medium">{error}</span>
                : savedFlash
                  ? <span className="text-teal-600 dark:text-teal-400 font-semibold">Saved ✓ The next agent run picks these up.</span>
                  : isDirty
                    ? `${dirty.size} unsaved change${dirty.size === 1 ? '' : 's'}`
                    : 'All changes saved'}
            </p>
            <button
              onClick={save}
              disabled={!isDirty || saving}
              className="shrink-0 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-500 disabled:opacity-40 transition-all shadow-md shadow-teal-600/20"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* AI delete confirm modal */}
      {confirmAiDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 tab-panel-enter">
            <h3 className="text-lg font-bold mb-2">Delete AI configuration?</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              The saved provider, API key, model, and matcher model will be deleted. Values from .env.local keep working. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAiDelete(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={deleteAiConfig} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 transition-colors">Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {/* reset confirm modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 tab-panel-enter">
            <h3 className="text-lg font-bold mb-2">Reset all saved settings?</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              Every value saved on this page will be deleted, including API keys. Values from .env.local keep working. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmReset(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
              <button onClick={resetAll} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 transition-colors">Yes, reset</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function SourceChip({ saved, env }: { saved: boolean; env: string | null }) {
  return (
    <span className={`ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
      saved
        ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30'
        : env
          ? 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
          : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-400 dark:text-zinc-500 border border-gray-100 dark:border-zinc-800'
    }`}>
      {saved ? 'saved' : env ? '.env.local' : 'default'}
    </span>
  )
}

function FieldRow({ field, value, envValue, hasSecret, revealedValue, onChange, onClear, onReveal }: {
  field: FieldDef
  value: unknown
  envValue: string | null
  hasSecret: boolean
  revealedValue?: string
  onChange: (v: unknown) => void
  onClear: () => void
  onReveal: () => void
}) {
  const [show, setShow] = useState(false)
  const saved = value !== undefined && value !== null && value !== ''

  if (field.type === 'toggle') {
    const effective = typeof value === 'boolean' ? value : envValue === 'true'
    return (
      <div className="flex items-center gap-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{field.label}</p>
          {field.hint && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{field.hint}</p>}
        </div>
        <SourceChip saved={typeof value === 'boolean'} env={envValue} />
        {typeof value === 'boolean' && (
          <button onClick={onClear} className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" title="Remove override">↺</button>
        )}
        <button
          role="switch"
          aria-checked={effective}
          aria-label={field.label}
          onClick={() => onChange(!effective)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${effective ? 'bg-teal-500' : 'bg-gray-300 dark:bg-zinc-700'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${effective ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="flex items-center gap-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{field.label}</p>
          {field.hint && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{field.hint}</p>}
        </div>
        <SourceChip saved={saved} env={envValue} />
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={1}
            value={typeof value === 'number' ? value : ''}
            placeholder={envValue ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-20 border border-gray-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-right bg-white dark:bg-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {field.suffix && <span className="text-xs text-gray-400 dark:text-zinc-500 w-10">{field.suffix}</span>}
        </div>
      </div>
    )
  }

  // text and secret
  const isSecret = field.type === 'secret'
  const displayValue = typeof value === 'string' ? value : ''
  const showingStored = isSecret && value === undefined && revealedValue !== undefined && show
  const secretPlaceholder = isSecret && hasSecret && value === undefined && !showingStored
  const inputValue = showingStored ? revealedValue : displayValue

  const toggleShow = () => {
    if (!show && isSecret && hasSecret && value === undefined && revealedValue === undefined) {
      onReveal()
    }
    setShow(s => !s)
  }

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-sm font-medium">{field.label}</p>
        <SourceChip saved={saved || (isSecret && hasSecret && value === undefined)} env={envValue} />
      </div>
      {field.hint && <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2 -mt-1">{field.hint}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={isSecret && !show ? 'password' : 'text'}
            value={inputValue}
            placeholder={secretPlaceholder ? 'saved · click the eye to view or type to replace' : (field.placeholder || envValue || '')}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className={`w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-800/80 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${isSecret ? 'pr-10' : ''}`}
          />
          {isSecret && (
            <button
              type="button"
              onClick={toggleShow}
              aria-label={show ? `Hide ${field.label}` : `Show ${field.label}`}
              title={show ? 'Hide' : 'Show'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 dark:text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-zinc-700/60 transition-colors"
            >
              {show ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
        </div>
        {(saved || (isSecret && hasSecret)) && (
          <button onClick={onClear} className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-rose-300 hover:text-rose-500 transition-colors" title="Clear saved value">✕</button>
        )}
      </div>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
