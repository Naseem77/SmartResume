'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/apply', label: 'Generate', icon: '✨' },
  { href: '/dashboard', label: 'Dashboard', icon: '📡' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

function ThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="relative w-14 h-8 rounded-full border border-gray-300 dark:border-zinc-600 bg-gray-100 dark:bg-zinc-800 transition-colors duration-300"
    >
      <span
        suppressHydrationWarning
        className={`absolute top-0.5 left-0.5 w-6.5 h-6.5 rounded-full bg-white dark:bg-zinc-950 shadow flex items-center justify-center text-xs transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          dark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-teal-500/25 group-hover:scale-105 transition-transform">
          S
        </span>
        <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-zinc-100">
          Smart<span className="text-teal-600 dark:text-teal-400">Resume</span>
        </span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-500/10'
              }`}
            >
              <span className="hidden sm:inline mr-1.5">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1 sm:mx-2" />
        <ThemeToggle />
      </div>
    </nav>
  )
}
