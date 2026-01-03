import { FC } from "react"

interface StrengthsImprovementsProps {
  strengths: string[]
  improvements: string[]
}

export const StrengthsImprovements: FC<StrengthsImprovementsProps> = ({ 
  strengths, 
  improvements 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">💪 Strengths</h4>
        <ul className="space-y-1">
          {strengths.map((strength, idx) => (
            <li key={idx} className="text-sm text-green-700">✓ {strength}</li>
          ))}
        </ul>
      </div>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-800 mb-2">🎯 Areas to Improve</h4>
        <ul className="space-y-1">
          {improvements.map((improvement, idx) => (
            <li key={idx} className="text-sm text-amber-700">→ {improvement}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
