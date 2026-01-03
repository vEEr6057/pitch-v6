import { useState, useRef } from "react"
import { VIDEO_CONFIG } from "@/constants/video-config"

export function useVideoRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONFIG.RECORDING_RESOLUTION,
        audio: true
      })
      
      videoStreamRef.current = stream
      
      const videoPreview = document.getElementById('videoPreview') as HTMLVideoElement
      if (videoPreview) {
        videoPreview.srcObject = stream
        videoPreview.play()
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const file = new File([blob], `pitch-recording-${Date.now()}.webm`, { type: 'video/webm' })
        
        setRecordedFile(file)
        setRecordedUrl(URL.createObjectURL(blob))
        
        stream.getTracks().forEach(track => track.stop())
        videoStreamRef.current = null
        
        if (videoPreview) videoPreview.srcObject = null
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording()
        }
      }, VIDEO_CONFIG.RECORDING_DURATION)
      
    } catch (err) {
      throw new Error('Failed to access camera/microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const clear = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedFile(null)
    setRecordedUrl(null)
    if (isRecording) stopRecording()
  }

  return { isRecording, recordedFile, recordedUrl, startRecording, stopRecording, clear }
}
