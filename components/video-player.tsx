import { FC } from "react"

interface VideoPlayerProps {
  url: string | null
  fileName: string
  fileSize: number
}

export const VideoPlayer: FC<VideoPlayerProps> = ({ url, fileName, fileSize }) => {
  return (
    <div className="space-y-4">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          src={url || undefined}
          controls
          className="w-full h-full"
        />
      </div>
      <p className="text-xs text-gray-500">
        File: {fileName} ({(fileSize / 1024 / 1024).toFixed(2)}MB)
      </p>
    </div>
  )
}
