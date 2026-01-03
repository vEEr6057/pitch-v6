import { FC } from "react"

interface RecordingGuidelinesProps {
  show: boolean
}

export const RecordingGuidelines: FC<RecordingGuidelinesProps> = ({ show }) => {
  if (!show) return null

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
      <h4 className="font-semibold text-sm mb-2">📹 Recording Best Practices</h4>
      <ul className="text-xs space-y-1">
        <li>✅ Face close to camera (30-40% of frame)</li>
        <li>✅ Good lighting (face camera, not window)</li>
        <li>✅ Stable camera position</li>
        <li>✅ Look directly at camera</li>
        <li>✅ Natural eye contact</li>
        <li>✅ Clean background</li>
      </ul>
    </div>
  )
}
