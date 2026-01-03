import { FC } from "react"
import { Upload } from "lucide-react"

interface VideoUploaderProps {
  onUpload: (file: File) => void
  inputRef: React.RefObject<HTMLInputElement>
  acceptFormats?: string
}

export const VideoUploader: FC<VideoUploaderProps> = ({ 
  onUpload, 
  inputRef,
  acceptFormats = "video/mp4,video/webm,video/mov"
}) => {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={acceptFormats}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
        className="hidden"
        id="video-upload"
      />
      <label htmlFor="video-upload">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
          <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 mb-1">
            Click to upload video
          </p>
          <p className="text-xs text-gray-500">
            MP4, WebM, MOV (max 50MB, 30-45s)
          </p>
        </div>
      </label>
    </>
  )
}
