import { FC } from "react"

interface EyeContactAnalysisProps {
  videoAFeedback: string
  videoBFeedback: string
}

export const EyeContactAnalysis: FC<EyeContactAnalysisProps> = ({ 
  videoAFeedback, 
  videoBFeedback 
}) => {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold mb-2">👁️ Eye Contact Analysis</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium mb-1">Video A (Benchmark)</p>
          <p className="text-sm text-gray-700">{videoAFeedback}</p>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Video B (Your Pitch)</p>
          <p className="text-sm text-gray-700">{videoBFeedback}</p>
        </div>
      </div>
    </div>
  )
}
