import { FC } from "react"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

interface StatusIndicatorProps {
  status: "idle" | "processing" | "completed" | "error"
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({ status }) => {
  if (status === "idle") return null

  return (
    <div className="flex items-center gap-2">
      {status === "processing" && (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-blue-600">Processing...</span>
        </>
      )}
      {status === "completed" && (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">Ready</span>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Error</span>
        </>
      )}
    </div>
  )
}
