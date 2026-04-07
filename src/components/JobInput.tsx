'use client'

import { useState } from 'react'

interface Props {
  onJobReady: (jobDescription: string, jobTitle: string) => void
}

export default function JobInput({ onJobReady }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualText, setManualText] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [scraped, setScraped] = useState<{ jobTitle?: string; description?: string } | null>(null)
  const [scrapeError, setScrapeError] = useState('')

  const handleScrape = async () => {
    setLoading(true)
    setScrapeError('')
    setShowManual(false)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.success) {
        setScraped(data)
      } else {
        setScrapeError(data.error || 'Could not extract job description')
        setShowManual(true)
      }
    } catch {
      setScrapeError('Network error')
      setShowManual(true)
    }
    setLoading(false)
  }

  if (scraped) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-medium text-sm">Job description extracted successfully</p>
          {scraped.jobTitle && <p className="text-green-900 font-semibold mt-1">{scraped.jobTitle}</p>}
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {scraped.description}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setScraped(null); setScrapeError('') }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >Try different URL</button>
          <button
            onClick={() => onJobReady(scraped.description!, scraped.jobTitle || 'Role')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >Generate Resume</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste job URL (LinkedIn, Glassdoor, Greenhouse, etc.)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && url && handleScrape()}
        />
        <button
          onClick={handleScrape}
          disabled={!url || loading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? 'Fetching...' : 'Fetch Job'}
        </button>
      </div>

      {scrapeError && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {scrapeError} — please paste the job description manually below.
        </p>
      )}

      <button
        onClick={() => setShowManual(m => !m)}
        className="text-sm text-blue-600 hover:underline"
      >
        {showManual ? 'Hide manual input' : 'Or paste job description manually'}
      </button>

      {showManual && (
        <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Senior Software Engineer"
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={8}
              placeholder="Paste the full job description here..."
              value={manualText}
              onChange={e => setManualText(e.target.value)}
            />
          </div>
          <button
            onClick={() => onJobReady(manualText, manualTitle || 'Role')}
            disabled={!manualText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >Generate Resume</button>
        </div>
      )}
    </div>
  )
}
