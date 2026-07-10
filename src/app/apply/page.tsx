'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import JobInput from '@/components/JobInput'
import ResumePreview from '@/components/ResumePreview'
import AtsScore from '@/components/AtsScore'
import type { GenerateResult } from '@/types/resume'

type Step = 'input' | 'generating' | 'result'

export default function ApplyPage() {
  const [step, setStep] = useState<Step>('input')
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [profileEmpty, setProfileEmpty] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(profile => {
      const isEmpty = !profile.name && !profile.email && profile.experience?.length === 0 && profile.education?.length === 0
      if (isEmpty) setProfileEmpty(true)
    }).catch(() => setProfileEmpty(true))
  }, [])

  const handleGenerate = async (jobDescription: string, jobTitle: string) => {
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, jobTitle }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data: GenerateResult = await res.json()
      setResult(data)
      setStep('result')
    } catch {
      setError('Failed to generate resume. Please try again.')
      setStep('input')
    }
  }

  const handleDownload = async () => {
    if (!result) return
    setDownloading(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: result.resume, jobTitle: result.jobTitle }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume-${result.jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF download failed. Please try again.')
    }
    setDownloading(false)
  }

  const stepMap: Record<Step, { num: number; label: string }> = {
    input:      { num: 1, label: 'Paste a job URL' },
    generating: { num: 2, label: 'Tailoring your resume' },
    result:     { num: 3, label: 'Your resume is ready' },
  }
  const { num: stepNum, label: stepLabel } = stepMap[step]

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate Resume</h1>
          <p className="text-gray-500 mt-1">Paste a job URL and we&apos;ll tailor your resume to match.</p>
        </div>

        <div className="mb-6 flex gap-2 items-center text-sm text-gray-400">
          <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">{stepNum}</span>
          Step {stepNum} of 3 — {stepLabel}
        </div>

        {profileEmpty && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-teal-800 font-medium text-sm">Your profile is empty</p>
              <p className="text-teal-600 text-sm mt-0.5">Fill in your experience, education, and skills so we can tailor your resume.</p>
            </div>
            <Link
              href="/profile"
              className="ml-6 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors whitespace-nowrap"
            >
              Set Up Profile
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {step === 'input' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Job Posting</h2>
            <JobInput onJobReady={handleGenerate} />
          </div>
        )}

        {step === 'generating' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Tailoring your resume...</p>
            <p className="text-gray-400 text-sm mt-1">This usually takes 15–30 seconds</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{result.jobTitle}</h2>
                <p className="text-gray-400 text-sm">Resume tailored for this role</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setResult(null) }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >New Resume</button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {downloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <ResumePreview resume={result.resume} />
              </div>
              <div>
                <AtsScore atsScore={result.atsScore} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
