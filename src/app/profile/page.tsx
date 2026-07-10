'use client'

import { useState } from 'react'
import ProfileForm from '@/components/ProfileForm'
import PreferencesForm from '@/components/PreferencesForm'

const TABS = [
  {
    id: 'profile' as const,
    label: 'Profile Details',
    icon: '👤',
    title: 'My Profile',
    subtitle: 'Your base resume info. Fill this in once: we do the rest for each job.',
  },
  {
    id: 'preferences' as const,
    label: 'Search Preferences',
    icon: '🎯',
    title: 'Job Search Preferences',
    subtitle: 'Tell the agent what to hunt for: titles, seniority, freshness, and thresholds.',
  },
]

export default function ProfilePage() {
  const [tab, setTab] = useState<'profile' | 'preferences'>('profile')
  const active = TABS.find((t) => t.id === tab)!
  const activeIndex = TABS.findIndex((t) => t.id === tab)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Step 1 of 2
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">{active.title}</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1">{active.subtitle}</p>
        </div>

        <div
          role="tablist"
          aria-label="Profile sections"
          className="relative grid grid-cols-2 bg-gray-200/70 dark:bg-zinc-800/70 rounded-2xl p-1.5 mb-8 select-none"
        >
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] bg-white dark:bg-zinc-900 rounded-xl shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative z-10 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                tab === t.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div key={tab} className="tab-panel-enter">
          {tab === 'profile' ? <ProfileForm /> : <PreferencesForm />}
        </div>
      </div>
    </main>
  )
}
