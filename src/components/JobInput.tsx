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
  const [showFullDesc, setShowFullDesc] = useState(false)

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
    const wordCount = scraped.description ? scraped.description.split(/\s+/).length : 0
    const hasRequirements = scraped.description ? /requirement|qualification|must have|you (will|should|must)/i.test(scraped.description) : false
    let sourceDomain = ''
    try { sourceDomain = new URL(url).hostname.replace('www.', '') } catch {}

    return (
      <div className="space-y-4">
        {/* Summary Panel */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">Job Found</p>
              <p className="text-lg font-bold text-gray-900">{scraped.jobTitle || 'Untitled Role'}</p>
            </div>
            <span className="shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">&#x2713;</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {sourceDomain && (
              <span className="text-xs bg-white border border-teal-200 text-teal-700 px-2.5 py-1 rounded-full font-medium">{sourceDomain}</span>
            )}
            <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-medium">{wordCount} words</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${hasRequirements ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {hasRequirements ? 'Requirements detected' : 'No requirements section'}
            </span>
          </div>
        </div>

        {/* Collapsible full description */}
        <div>
          <button
            onClick={() => setShowFullDesc(v => !v)}
            className="text-sm text-teal-600 hover:underline flex items-center gap-1"
          >
            {showFullDesc ? 'Hide description' : 'Show full description'}
            <span className="text-xs">{showFullDesc ? '▲' : '▼'}</span>
          </button>
          {showFullDesc && (
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {scraped.description}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { setScraped(null); setScrapeError(''); setShowFullDesc(false) }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >Try different URL</button>
          <button
            onClick={() => onJobReady(scraped.description!, scraped.jobTitle || 'Role')}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
          >Generate Resume &#x2192;</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Paste job URL (LinkedIn, Glassdoor, Greenhouse, etc.)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && url && handleScrape()}
        />
        <button
          onClick={handleScrape}
          disabled={!url || loading}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors whitespace-nowrap"
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
        className="text-sm text-teal-600 hover:underline"
      >
        {showManual ? 'Hide manual input' : 'Or paste job description manually'}
      </button>

      {showManual && (
        <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Senior Software Engineer"
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={8}
              placeholder="Paste the full job description here..."
              value={manualText}
              onChange={e => setManualText(e.target.value)}
            />
          </div>
          <button
            onClick={() => onJobReady(manualText, manualTitle || 'Role')}
            disabled={!manualText.trim()}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >Generate Resume</button>
        </div>
      )}
    </div>
  )
}
