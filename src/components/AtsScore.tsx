import type { AtsScore as AtsScoreType } from '@/types/resume'

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function AtsScore({ atsScore }: { atsScore: AtsScoreType }) {
  const { score, breakdown, suggestions } = atsScore
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  const ringColor = score >= 80 ? 'border-green-500' : score >= 60 ? 'border-yellow-500' : 'border-red-500'

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm space-y-5">
      <div className="flex items-center gap-5">
        <div className={`w-20 h-20 rounded-full border-8 ${ringColor} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">ATS Score</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {score >= 80
              ? 'Great match — should pass most ATS filters.'
              : score >= 60
              ? 'Good match. A few improvements could help.'
              : 'Needs improvement to pass ATS filters.'}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <ScoreBar label="Keyword Match" value={breakdown.keywordMatch} />
        <ScoreBar label="Section Completeness" value={breakdown.sectionCompleteness} />
        <ScoreBar label="Formatting Compliance" value={breakdown.formattingCompliance} />
        <ScoreBar label="Role Relevance" value={breakdown.relevance} />
      </div>
      {suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Suggestions</p>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-sm text-blue-700 flex gap-2">
                <span className="mt-0.5">•</span><span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
