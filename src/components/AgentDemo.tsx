'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface TermLine {
  text: string
  color: string
  bold?: boolean
}

const COMPANIES = ['Wix', 'Monday.com', 'Lemonade', 'Fiverr', 'JFrog', 'Riskified', 'Gong', 'AppsFlyer']

function buildScript(title: string): TermLine[] {
  const t = title.trim() || 'Software Engineer'
  const seed = t.length + t.charCodeAt(0)
  const company = COMPANIES[seed % COMPANIES.length]
  const company2 = COMPANIES[(seed + 3) % COMPANIES.length]
  const found = 18 + (seed % 14)
  const fresh = 5 + (seed % 6)
  const fit = 84 + (seed % 13)
  const ats1 = 68 + (seed % 9)
  return [
    { text: `$ npm run agent -- 3 --title "${t}"`, color: 'text-zinc-500' },
    { text: `agent started · 3h run · collect mode`, color: 'text-zinc-400' },
    { text: `searching linkedin · alljobs: "${t}"`, color: 'text-cyan-300' },
    { text: `found ${found} jobs · ${fresh} new after dedupe`, color: 'text-zinc-300' },
    { text: `match: ${t} @ ${company} ......... ${fit}/100 ✓`, color: 'text-emerald-300' },
    { text: `match: ${t} @ ${company2} ......... ${Math.max(52, fit - 31)}/100 ✗ skipped`, color: 'text-zinc-500' },
    { text: `tailoring resume · rewriting bullets · matching keywords`, color: 'text-zinc-300' },
    { text: `ATS check: ${ats1}/100 → fixing gaps → 9${seed % 8}/100 ✓`, color: 'text-emerald-300' },
    { text: `saved → data/applications/${company.toLowerCase().replace(/\W/g, '-')}-${t.toLowerCase().split(/\s+/).slice(0, 3).join('-')}/resume.pdf`, color: 'text-teal-300' },
    { text: `✦ ready for one-click apply on your dashboard`, color: 'text-amber-300', bold: true },
  ]
}

export default function AgentDemo() {
  const [title, setTitle] = useState('')
  const [lines, setLines] = useState<TermLine[]>([])
  const [typing, setTyping] = useState<TermLine | null>(null)
  const [typed, setTyped] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const runId = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = timers.current
    return () => saved.forEach(clearTimeout)
  }, [])

  const wait = (ms: number, id: number) =>
    new Promise<void>((resolve, reject) => {
      const h = setTimeout(() => (runId.current === id ? resolve() : reject(new Error('cancelled'))), ms)
      timers.current.push(h)
    })

  const run = async () => {
    const id = ++runId.current
    timers.current.forEach(clearTimeout)
    timers.current = []
    setLines([])
    setTyped('')
    setDone(false)
    setRunning(true)
    const script = buildScript(title)
    try {
      for (const line of script) {
        if (runId.current !== id) return
        setTyping(line)
        for (let c = 1; c <= line.text.length; c += 3) {
          setTyped(line.text.slice(0, c))
          await wait(12, id)
        }
        setTyped(line.text)
        setTyping(null)
        setLines(prev => [...prev, line])
        await wait(line.text.startsWith('$') ? 500 : 320, id)
      }
      if (runId.current === id) {
        setDone(true)
        setRunning(false)
      }
    } catch {
      /* run cancelled */
    }
  }

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `perspective(1100px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
  }

  const resetTilt = () => {
    const card = cardRef.current
    if (card) card.style.transform = 'perspective(1100px) rotateY(0deg) rotateX(0deg)'
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* input row */}
      <form
        onSubmit={e => {
          e.preventDefault()
          run()
        }}
        className="flex flex-col sm:flex-row gap-2 mb-5"
      >
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500 font-mono text-sm select-none" aria-hidden>
            ❯
          </span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Type a job title... e.g. Backend Engineer"
            aria-label="Job title for the demo"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 transition-colors shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={running}
          className="btn-shine px-6 py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-500 disabled:opacity-60 transition-all shadow-lg shadow-teal-500/30 whitespace-nowrap"
        >
          {running ? 'Agent running…' : '▶ Watch it work'}
        </button>
      </form>

      {/* terminal card */}
      <div
        ref={cardRef}
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        className="rounded-2xl overflow-hidden border border-zinc-700/60 bg-zinc-950 shadow-2xl shadow-teal-900/25 transition-transform duration-150 will-change-transform"
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="ml-3 text-xs text-zinc-400 font-mono truncate">smartresume · agent</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-mono">
            {running ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="text-emerald-400">live</span>
              </>
            ) : done ? (
              <span className="text-amber-300">✓ 1 application ready</span>
            ) : (
              <span className="text-zinc-500">idle</span>
            )}
          </span>
        </div>
        <div className="p-5 font-mono text-[13px] leading-relaxed text-left min-h-64">
          {lines.length === 0 && !typing && (
            <p className="text-zinc-500">
              # This is a live simulation of a real agent run.
              <br /># Type a job title above and press <span className="text-teal-400">▶ Watch it work</span>
              <span className="caret text-teal-400"> ▊</span>
            </p>
          )}
          {lines.map((line, i) => (
            <p key={i} className={`${line.color} ${line.bold ? 'font-bold' : ''}`}>
              {line.text}
            </p>
          ))}
          {typing && (
            <p className={typing.color}>
              {typed}
              <span className="caret text-teal-400">▊</span>
            </p>
          )}
          {done && (
            <p className="mt-3">
              <Link
                href="/profile"
                className="inline-block px-4 py-2 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 font-bold hover:bg-teal-500/25 transition-colors"
              >
                Do it for real → set up your profile
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
