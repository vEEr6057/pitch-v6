import { FC } from "react"

interface TranscriptDisplayProps {
  label: string
  transcript: string
}

export const TranscriptDisplay: FC<TranscriptDisplayProps> = ({ label, transcript }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-semibold mb-2">📝 {label}</h4>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcript}</p>
    </div>
  )
}
