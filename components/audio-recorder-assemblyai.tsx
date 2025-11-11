"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface AudioRecorderProps {
  onTranscript: (text: string, audioBlob?: Blob) => void
}

export default function AudioRecorderAssemblyAI({ onTranscript }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")
  const [audioURL, setAudioURL] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setTranscript("")
      setAudioURL(null)
      audioChunksRef.current = []

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm', // Supported by most browsers
      })
      
      mediaRecorderRef.current = mediaRecorder

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Send to AssemblyAI for transcription
        await transcribeAudio(audioBlob)
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      
    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Failed to access microphone. Please grant permission.")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Convert WebM to a format AssemblyAI can handle
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      // Send to our transcription API
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Transcription failed")
      }

      const { text } = await response.json()
      
      if (!text || text.trim().length < 5) {
        throw new Error("Could not extract speech from recording. Please speak clearly and try again.")
      }

      setTranscript(text)
      onTranscript(text, audioBlob) // Pass both transcript and audio blob
      
    } catch (err) {
      console.error("Transcription error:", err)
      setError(err instanceof Error ? err.message : "Failed to transcribe audio")
    } finally {
      setIsProcessing(false)
    }
  }

  const clearRecording = useCallback(() => {
    setTranscript("")
    setAudioURL(null)
    setError(null)
    onTranscript("")
    audioChunksRef.current = []
  }, [onTranscript])

  return (
    <div className="space-y-3">
      <div className="flex flex-row items-center gap-3 flex-wrap">
        {!isRecording && !isProcessing && !transcript && (
          <Button 
            onClick={startRecording}
            variant="outline"
            className="border-2 border-orange-500 text-orange-700 hover:bg-orange-50 hover:text-orange-700"
          >
            🎤 Start Recording
          </Button>
        )}
        
        {isRecording && (
          <Button 
            onClick={stopRecording}
            variant="destructive"
            className="animate-pulse"
          >
            ⏹ Stop Recording
          </Button>
        )}

        {transcript && (
          <Button 
            onClick={clearRecording}
            variant="outline"
            size="sm"
          >
            Clear Recording
          </Button>
        )}
        
        <span className={`text-sm ${
          isRecording 
            ? "text-red-600 font-medium" 
            : isProcessing 
            ? "text-blue-600 font-medium"
            : "text-muted-foreground"
        }`}>
          {isRecording 
            ? "🔴 Recording... Click Stop when finished" 
            : isProcessing
            ? "⚙️ Processing your speech..."
            : transcript
            ? "✅ Recording complete"
            : "Click Start to record your pitch"
          }
        </span>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {isRecording && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
          <div className="flex items-start">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping mt-1.5 mr-2" />
            <div className="text-red-800">
              <p className="font-medium mb-1">🎙️ Recording Active</p>
              <p>Speak clearly at a normal pace. Click "Stop Recording" when you're done.</p>
              <p className="mt-1 text-red-700">Your recording will be automatically transcribed using AI!</p>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
          <div className="flex items-start">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mt-1.5 mr-2" />
            <div className="text-blue-800">
              <p className="font-medium mb-1">⚙️ Processing Your Speech</p>
              <p>Using AI to transcribe your recording... This usually takes 2-5 seconds.</p>
            </div>
          </div>
        </div>
      )}

      {audioURL && transcript && (
        <div className="space-y-3">
          <div className="rounded-md bg-green-50 border border-green-200 p-3">
            <p className="font-medium text-green-800 mb-2">🎵 Your Recording:</p>
            <audio src={audioURL} controls className="w-full" />
          </div>
          
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm">
            <p className="font-medium text-blue-800 mb-2">📝 Transcription:</p>
            <p className="text-blue-700 whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
      )}
    </div>
  )
}
