import { FC } from "react"

interface VideoPreviewProps {
  isRecording: boolean
}

export const VideoPreview: FC<VideoPreviewProps> = ({ isRecording }) => {
  if (!isRecording) return null

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
      <video
        id="videoPreview"
        autoPlay
        muted
        className="w-full h-full mirror"
      />
    </div>
  )
}
