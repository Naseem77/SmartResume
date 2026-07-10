import { Fraunces, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import AgentDemo from '@/components/AgentDemo'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '600', '900'], style: ['normal', 'italic'], variable: '--font-fraunces' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-jb' })

const BOARDS = ['LinkedIn', 'Indeed', 'Glassdoor']

const STEPS = [
  {
    num: '01',
    title: 'Teach it who you are',
    desc: 'Fill your profile once: experience, skills, what you want, how fresh the postings must be. It lives in a folder on your machine, not in someone\u2019s cloud.',
  },
  {
    num: '02',
    title: 'Set it loose',
    desc: 'Start it from the dashboard or the terminal with a number of hours. It searches, scores every job against you, and writes an ATS-verified resume per match.',
  },
  {
    num: '03',
    title: 'Come back to applications',
    desc: 'Every match lands on your dashboard with a fit score, an ATS breakdown, and a finished PDF. Review, tweak, apply in one click.',
  },
]

const TICKETS = [
  { value: '0-100', label: 'ATS score, auto-fixed until it clears your bar' },
  { value: '4', label: 'job boards searched in every cycle' },
  { value: '100%', label: 'local. No cloud, no account, no telemetry' },
  { value: '1 click', label: 'from matched job to submitted application' },
]

export default function Home() {
  return (
    <main className={`${fraunces.variable} ${jetbrains.variable} relative min-h-[calc(100vh-57px)] overflow-hidden bg-[#faf9f6] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100`}>
      {/* atmosphere */}
      <div className="dot-grid absolute inset-0" aria-hidden />
      <div className="noise-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="orb-a absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-teal-300/25 dark:bg-teal-500/12 blur-3xl" aria-hidden />
      <div className="orb-b absolute top-[45%] -right-32 w-[26rem] h-[26rem] rounded-full bg-cyan-300/20 dark:bg-cyan-500/10 blur-3xl" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-0">
        {/* eyebrow */}
        <p className="rise text-center text-xs tracking-[0.35em] uppercase text-teal-700 dark:text-teal-400 mb-8" style={{ fontFamily: 'var(--font-jb)' }}>
          {'// autonomous job agent · runs on your machine'}
        </p>

        {/* hero headline */}
        <h1
          className="rise text-center text-6xl sm:text-8xl leading-[0.95] tracking-tight mb-8"
          style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 900, animationDelay: '0.08s' }}
        >
          While you sleep,
          <br />
          <em className="bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent pr-2" style={{ fontWeight: 600 }}>
            it applies.
          </em>
        </h1>

        <p className="rise text-center text-lg sm:text-xl text-gray-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-12" style={{ animationDelay: '0.16s' }}>
          SmartResume hunts job boards for hours, writes a tailored, ATS-verified resume for every match, and queues each application for one click. Try it right here:
        </p>

        {/* interactive demo */}
        <div className="rise mb-8" style={{ animationDelay: '0.24s' }}>
          <AgentDemo />
        </div>

        {/* CTAs */}
        <div className="rise flex flex-col sm:flex-row justify-center gap-3 mb-20" style={{ animationDelay: '0.32s' }}>
          <Link
            href="/profile"
            className="btn-shine px-8 py-3.5 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-500 transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:-translate-y-0.5 text-center"
          >
            Start in 5 minutes
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3.5 border-2 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl font-bold text-lg hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-all bg-white/60 dark:bg-zinc-900/60 backdrop-blur text-center"
          >
            Open Dashboard
          </Link>
        </div>
      </div>

      {/* marquee */}
      <div className="relative border-y border-gray-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 backdrop-blur py-4 overflow-hidden mb-24">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap" style={{ fontFamily: 'var(--font-jb)' }}>
          {[0, 1].map(copy => (
            <div key={copy} className="flex gap-10 items-center" aria-hidden={copy === 1}>
              {Array.from({ length: 3 }).flatMap((_, r) =>
                BOARDS.map(b => (
                  <span key={`${r}-${b}`} className="flex items-center gap-10 text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                    {b} <span className="text-teal-500">✦</span>
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pb-24">
        {/* editorial steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-24">
          {STEPS.map((s, i) => (
            <div key={s.num} className={`rise ${i === 1 ? 'md:translate-y-8' : ''}`} style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
              <p className="num-outline text-8xl leading-none mb-4 select-none" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 900 }} aria-hidden>
                {s.num}
              </p>
              <h3 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 600 }}>
                {s.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* ticket stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
          {TICKETS.map((t, i) => (
            <div
              key={t.value}
              className="rise bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 border-dashed rounded-2xl p-5 text-center hover:border-teal-400 dark:hover:border-teal-500/60 hover:-translate-y-1 transition-all shadow-sm"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <p className="text-3xl mb-1 text-teal-600 dark:text-teal-400" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 900 }}>
                {t.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-snug">{t.label}</p>
            </div>
          ))}
        </div>

        {/* CTA band */}
        <div className="relative overflow-hidden rounded-3xl bg-teal-700 dark:bg-teal-800 text-white px-8 py-14 text-center shadow-2xl shadow-teal-900/30">
          <div className="dot-grid absolute inset-0 opacity-40" aria-hidden />
          <div className="relative">
            <h2 className="text-4xl sm:text-5xl mb-4" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 900 }}>
              Stop tailoring resumes <em style={{ fontWeight: 600 }}>by hand.</em>
            </h2>
            <p className="text-teal-100 mb-8 max-w-xl mx-auto">
              Five minutes of setup, then the agent does the boring part of your job hunt forever.
            </p>
            <Link
              href="/profile"
              className="btn-shine inline-block px-10 py-4 bg-white text-teal-800 rounded-xl font-bold text-lg hover:bg-teal-50 transition-all shadow-lg hover:-translate-y-0.5"
            >
              Build my profile →
            </Link>
            <p className="mt-6 text-xs text-teal-200/80" style={{ fontFamily: 'var(--font-jb)' }}>
              no cloud · no account · powered by Claude AI or OpenAI
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
