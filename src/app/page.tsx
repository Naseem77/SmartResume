import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-57px)] bg-linear-to-br from-teal-50 via-white to-cyan-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-3xl w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-teal-200">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse inline-block" />
          AI-Powered Resume Tailoring
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-5 leading-tight tracking-tight">
          The right resume<br />
          <span className="text-teal-600 underline decoration-teal-200 decoration-4 underline-offset-4">for every job</span>
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Paste a job URL. Get a tailored, ATS-optimized resume in seconds — powered by Claude AI or OpenAI.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
          <Link
            href="/profile"
            className="px-8 py-3.5 bg-teal-600 text-white rounded-xl font-semibold text-lg hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:-translate-y-0.5"
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            href="/apply"
            className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:border-teal-400 hover:text-teal-700 transition-all"
          >
            Generate Resume
          </Link>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 text-sm text-gray-400 mb-10">
          {['5 min setup', 'ATS-optimized PDF', 'Claude & OpenAI'].map(s => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
              {s}
            </span>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          {[
            { icon: '🔒', label: 'No account needed', sub: 'Data stays on your machine' },
            { icon: '🌐', label: 'Any job board', sub: 'LinkedIn, Glassdoor, Greenhouse...' },
            { icon: '📄', label: 'Clean PDF export', sub: 'ATS-safe formatting' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm text-left">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-400">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          {[
            { num: '1', title: 'Set up your profile', desc: 'Enter your experience, education, and skills once. We save it locally — no account needed.' },
            { num: '2', title: 'Paste a job URL', desc: 'From any job board. We scrape the description automatically — or paste it manually.' },
            { num: '3', title: 'Download & apply', desc: 'AI tailors your resume to the role. Get an ATS score, then download a clean PDF.' },
          ].map(step => (
            <div key={step.num} className="bg-white rounded-2xl border border-l-4 border-gray-100 border-l-teal-500 shadow-sm p-6 hover:shadow-md hover:border-teal-300 transition-all">
              <div className="w-9 h-9 bg-teal-600 text-white rounded-xl flex items-center justify-center text-sm font-bold mb-4">
                {step.num}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-gray-400 text-center">Your data stays on your machine — no cloud, no account.</p>
      </div>
    </main>
  )
}
