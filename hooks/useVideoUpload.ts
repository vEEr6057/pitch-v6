import { useState } from "react"

export function useVideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "error">("idle")

  const handleUpload = (uploadedFile: File) => {
    setFile(uploadedFile)
    setUrl(URL.createObjectURL(uploadedFile))
    setStatus("processing")
    setTimeout(() => setStatus("completed"), 500)
  }

  const clear = () => {
    if (url) URL.revokeObjectURL(url)
    setFile(null)
    setUrl(null)
    setStatus("idle")
  }

  return { file, url, status, handleUpload, clear }
}
