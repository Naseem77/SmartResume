import type { AtsScore as AtsScoreType } from '@/types/resume'

function grade(score: number) {
  if (score >= 90) return { label: 'A', verdict: 'Excellent', pill: 'bg-green-100 text-green-800' }
  if (score >= 75) return { label: 'B', verdict: 'Good', pill: 'bg-teal-100 text-teal-700' }
  if (score >= 60) return { label: 'C', verdict: 'Fair', pill: 'bg-yellow-100 text-yellow-800' }
  return { label: 'D', verdict: 'Needs Work', pill: 'bg-red-100 text-red-800' }
}

function tip(key: string, value: number): string | null {
  if (key === 'keywordMatch' && value < 70) return 'Add more keywords from the job description to your experience bullets'
  if (key === 'sectionCompleteness' && value < 80) return 'Make sure Summary, Experience, Education, and Skills sections are all filled'
  if (key === 'formattingCompliance' && value < 80) return 'Avoid tables, columns, and graphics for better ATS parsing'
  if (key === 'relevance' && value < 70) return 'Tailor your experience bullets to more closely match the role requirements'
  return null
}

function ScoreBar({ label, value, tipKey }: { label: string; value: number; tipKey: string }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const icon = value >= 80 ? '✓' : value >= 60 ? '!' : '✗'
  const iconColor = value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'
  const t = tip(tipKey, value)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold text-xs w-4 ${iconColor}`}>{icon}</span>
          <span className="text-gray-700 font-medium">{label}</span>
        </div>
        <span className={`font-semibold text-sm ${iconColor}`}>{value}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      {t && <p className="text-xs text-gray-500 italic pl-5">{t}</p>}
    </div>
  )
}

export default function AtsScore({ atsScore }: { atsScore: AtsScoreType }) {
  const { score, breakdown, suggestions } = atsScore
  const { label, verdict, pill } = grade(score)
  const ringColor = score >= 90 ? 'border-green-400' : score >= 75 ? 'border-teal-400' : score >= 60 ? 'border-yellow-400' : 'border-red-400'
  const scoreColor = score >= 90 ? 'text-green-600' : score >= 75 ? 'text-teal-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">ATS Score</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pill}`}>{verdict}</span>
      </div>

      {/* Score Circle */}
      <div className="flex flex-col items-center py-5">
        <div className={`w-24 h-24 rounded-full border-8 ${ringColor} flex flex-col items-center justify-center`}>
          <span className={`text-3xl font-bold leading-none ${scoreColor}`}>{score}</span>
          <span className="text-xs text-gray-400 mt-0.5">/ 100</span>
        </div>
        <span className={`mt-2 text-sm font-bold ${scoreColor}`}>Grade {label}</span>
      </div>

      {/* Breakdown */}
      <div className="px-5 pb-4 space-y-4">
        <ScoreBar label="Keyword Match" value={breakdown.keywordMatch} tipKey="keywordMatch" />
        <ScoreBar label="Section Completeness" value={breakdown.sectionCompleteness} tipKey="sectionCompleteness" />
        <ScoreBar label="Formatting" value={breakdown.formattingCompliance} tipKey="formattingCompliance" />
        <ScoreBar label="Role Relevance" value={breakdown.relevance} tipKey="relevance" />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-5 pb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Suggestions</p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex gap-2.5 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <span className="text-orange-600 font-bold text-sm shrink-0">{i + 1}</span>
              <p className="text-sm text-orange-800">{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
