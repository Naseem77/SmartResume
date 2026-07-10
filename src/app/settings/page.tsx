'use client'

import { useCallback, useEffect, useState } from 'react'

interface SettingsView {
  provider: 'claude' | 'openai' | null
  model: string | null
  hasApiKey: boolean
  apiKey: string | null
  envKeyConfigured: boolean
  envProvider: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsView | null>(null)
  const [editing, setEditing] = useState(false)
  const [provider, setProvider] = useState<'claude' | 'openai'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [revealed, setRevealed] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data: SettingsView = await res.json()
      setSettings(data)
      setProvider(data.provider || (data.envProvider === 'openai' ? 'openai' : 'claude'))
      setModel(data.model || '')
      setRevealed(null)
    } catch {
      setError('Could not load settings')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const body: Record<string, string> = { provider, model }
      if (apiKey.trim()) body.apiKey = apiKey.trim()
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Save failed')
      } else {
        setMessage('Settings saved ✓')
        setApiKey('')
        setEditing(false)
        await refresh()
        setTimeout(() => setMessage(''), 2500)
      }
    } finally {
      setBusy(false)
    }
  }

  const reveal = async () => {
    if (revealed) {
      setRevealed(null)
      return
    }
    const res = await fetch('/api/settings?reveal=1')
    const data = await res.json()
    setRevealed(data.apiKey)
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await fetch('/api/settings', { method: 'DELETE' })
      setConfirmDelete(false)
      setMessage('Stored key deleted ✓')
      await refresh()
      setTimeout(() => setMessage(''), 2500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            ⚙️ Settings
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">LLM Provider</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1">
            Manage your AI key from the UI. Keys saved here take priority over environment variables
            and are stored locally in personaldata/settings.json.
          </p>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6 space-y-6">
          {!settings ? (
            <p className="text-sm text-gray-400 dark:text-zinc-500">Loading…</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">Stored API key</p>
                  {settings.hasApiKey ? (
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg break-all">
                        {revealed || settings.apiKey}
                      </code>
                      <button
                        onClick={reveal}
                        className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                      >
                        {revealed ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-zinc-500">
                      No key stored in the UI.{' '}
                      {settings.envKeyConfigured
                        ? 'Using the key from your .env.local.'
                        : 'No key found in .env.local either: add one below to get started.'}
                    </p>
                  )}
                </div>
                {settings.hasApiKey && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-500/40 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>

              {(editing || !settings.hasApiKey) && (
                <div className="space-y-4 border-t border-gray-100 dark:border-zinc-800 pt-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Provider</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['openai', 'claude'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProvider(p)}
                          className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            provider === p
                              ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-sm'
                              : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-500'
                          }`}
                        >
                          {p === 'openai' ? '🤖 OpenAI' : '✴️ Claude'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">API key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={provider === 'openai' ? 'sk-…' : 'sk-ant-…'}
                      className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Model <span className="font-normal text-gray-400 dark:text-zinc-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={provider === 'openai' ? 'gpt-4o' : 'claude-opus-4-6'}
                      className="w-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={save}
                      disabled={busy || (!apiKey.trim() && !settings.hasApiKey)}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {busy ? 'Saving…' : settings.hasApiKey ? 'Update Key' : 'Save Key'}
                    </button>
                    {editing && (
                      <button
                        onClick={() => {
                          setEditing(false)
                          setApiKey('')
                        }}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:border-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-4">
          🔒 Your key never leaves this machine. It is saved to personaldata/settings.json, which is
          excluded from version control.
        </p>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Delete stored key?</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">
              The key saved in Settings will be permanently removed. If a key exists in .env.local it
              will be used instead; otherwise AI features stop working until you add a new key.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 text-sm font-semibold hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
