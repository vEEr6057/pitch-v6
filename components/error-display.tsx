import { FC } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorDisplayProps {
  error: string | null
  onDismiss: () => void
}

export const ErrorDisplay: FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
      <AlertCircle className="w-5 h-5" />
      <p>{error}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="ml-auto"
      >
        Dismiss
      </Button>
    </div>
  )
}
