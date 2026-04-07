'use client'

import { useState } from 'react'
import type { Profile } from '@/types/resume'

interface Props {
  onImport: (profile: Profile) => void
}

export default function LinkedInImport({ onImport }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'blocked' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    setStatus('idle')
    setErrorMsg('')

    try {
      const res = await fetch('/api/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (data.success && data.profile) {
        onImport(data.profile)
        setStatus('success')
      } else if (data.blocked) {
        setStatus('blocked')
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Unknown error')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error')
    }

    setLoading(false)
  }

  return (
    <div className="border border-teal-200 rounded-xl p-4 bg-teal-50 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-teal-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        <p className="text-sm font-semibold text-teal-800">Import from LinkedIn</p>
        <span className="text-xs text-teal-500 font-normal">(experimental)</span>
      </div>

      <p className="text-xs text-teal-600 leading-relaxed">
        We'll try to fetch your public profile. This may not work if LinkedIn blocks the request — your existing data won't be affected.
      </p>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white placeholder:text-gray-400"
          placeholder="https://linkedin.com/in/your-profile"
          value={url}
          onChange={e => { setUrl(e.target.value); setStatus('idle') }}
          onKeyDown={e => e.key === 'Enter' && handleImport()}
        />
        <button
          onClick={handleImport}
          disabled={!url.trim() || loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>

      {/* Success */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="font-bold">✓</span>
          Profile imported — review and save below.
        </div>
      )}

      {/* Blocked by LinkedIn */}
      {status === 'blocked' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1.5">
          <p className="text-sm font-semibold text-amber-800">LinkedIn blocked the request</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            LinkedIn requires login to view profiles. You can still fill in your profile manually below — it only takes a few minutes.
          </p>
        </div>
      )}

      {/* Other error */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-700">Import failed — please fill in your profile manually below.</p>
          {errorMsg && <p className="text-xs text-red-400 mt-0.5">{errorMsg}</p>}
        </div>
      )}
    </div>
  )
}
