import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-57px)] bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          AI-Powered Resume Tailoring
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          The right resume<br />for every job
        </h1>
        <p className="text-xl text-gray-500 mb-3">
          Paste a job URL. Get a tailored, ATS-optimized resume in seconds.
        </p>
        <p className="text-gray-400 text-sm mb-10">
          Powered by Claude AI &amp; OpenAI • Supports LinkedIn, Glassdoor, Greenhouse, and more
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/profile"
            className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            Get Started
          </Link>
          <Link
            href="/apply"
            className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:border-blue-300 hover:text-blue-700 transition-colors"
          >
            Generate Resume
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 text-left">
          {[
            { title: 'Set up your profile', desc: 'Enter your experience, education, skills, and projects once.' },
            { title: 'Paste a job URL', desc: 'From any job board — or paste the description manually.' },
            { title: 'Download & apply', desc: 'Tailored ATS-safe PDF with your score, ready to submit.' },
          ].map((step, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mb-3">
                {i + 1}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
