import { FC } from "react"
import { Scores } from "@/types"
import { METRIC_LABELS } from "@/constants/metric-labels"
import { cn } from "@/lib/utils"

interface MetricBreakdownProps {
  scores: Scores
  referenceScores: Scores
}

export const MetricBreakdown: FC<MetricBreakdownProps> = ({ scores, referenceScores }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(scores).map(([key, value]) => {
        const referenceScore = referenceScores[key as keyof Scores]
        const diff = value - referenceScore
        const label = METRIC_LABELS[key as keyof typeof METRIC_LABELS]
        
        return (
          <div key={key} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">{label}</h4>
              <span className={cn(
                "text-xs font-medium",
                diff >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {diff >= 0 ? "+" : ""}{diff.toFixed(0)} vs benchmark
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">{value}/100</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
