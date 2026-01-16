"use client"

import { useState, useRef, ChangeEvent } from "react"
import { upload } from '@vercel/blob/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ScoreChart from "@/components/score-chart"
import { Upload, Video, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

// Hardcoded reference video (Video A) - always use this for comparison
const VIDEO_A_URL = "https://n2ap5g7ig7wnxcyo.public.blob.vercel-storage.com/Untitled%20Video.mp4"

// Define interfaces for video evaluation
interface MetricScore {
  score: number
  insights: string
  suggestion: string
}

interface Scores {
  usageOfKeywords: MetricScore
  pronunciation: MetricScore
  fluency: MetricScore
  objectionHandling: MetricScore
  queryResolution: MetricScore
  eyeContact: MetricScore
}

interface EvaluationResult {
  scores: Scores
  transcript: string
  referenceTranscript: string
}

export default function Page() {
  // VideoB (User) states
  const [videoBFile, setVideoBFile] = useState<File | null>(null)
  const [videoBUrl, setVideoBUrl] = useState<string | null>(null)
  const [videoBStatus, setVideoBStatus] = useState<"idle" | "processing" | "completed" | "error">("idle")
  const [isRecording, setIsRecording] = useState(false)
  const videoBInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  
  // Evaluation states
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Recording guidelines
  const [showGuidelines, setShowGuidelines] = useState(false)

  // Handle VideoB upload
  const handleVideoBUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError("Please upload a valid video file")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("Video file is too large (max 50MB)")
      return
    }

    setVideoBFile(file)
    setVideoBUrl(URL.createObjectURL(file))
    setVideoBStatus("processing")
    setError(null)
    setEvaluationResult(null)

    setTimeout(() => setVideoBStatus("completed"), 500)
  }

  // Start video recording
  const handleStartRecording = async () => {
    setShowGuidelines(true)
    setError(null)
    setIsRecording(true) // Set this FIRST so video element renders
    
    try {
      // Stop any existing streams first
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop())
        videoStreamRef.current = null
        // Wait a bit for resources to be released
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Use simpler constraints to avoid issues
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      videoStreamRef.current = stream
      
      // Wait for video element to be rendered in DOM
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Show preview
      const videoPreview = document.getElementById('videoPreview') as HTMLVideoElement
      if (videoPreview) {
        videoPreview.srcObject = stream
        videoPreview.onloadedmetadata = () => {
          videoPreview.play().catch(err => console.error('Play failed:', err))
        }
      } else {
        console.warn('Video preview element not found')
      }
      
      // Wait a bit for stream to stabilize
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Find supported mimeType
      let mimeType = 'video/webm'
      const possibleTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ]
      
      for (const type of possibleTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      console.log('Using mimeType:', mimeType)
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      })
      
      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log('Data chunk received:', e.data.size, 'bytes')
          chunks.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        console.log('Recording stopped, total chunks:', chunks.length)
        const blob = new Blob(chunks, { type: mimeType })
        console.log('Final blob size:', blob.size, 'bytes')
        const extension = mimeType.includes('webm') ? 'webm' : 'mp4'
        const file = new File([blob], `pitch-recording-${Date.now()}.${extension}`, { type: mimeType })
        
        setVideoBFile(file)
        setVideoBUrl(URL.createObjectURL(blob))
        setVideoBStatus("completed")
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop())
        videoStreamRef.current = null
        
        // Clear preview
        if (videoPreview) {
          videoPreview.srcObject = null
        }
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Request data every 100ms
      
      console.log('MediaRecorder started')
      
      // Auto-stop after 45 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          handleStopRecording()
        }
      }, 45000)
      
    } catch (err) {
      console.error('Recording error:', err)
      
      // Clean up on error
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop())
        videoStreamRef.current = null
      }
      
      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permission denied. Please allow camera and microphone access in your browser settings.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera or microphone found. Please connect a device.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera/microphone is busy. Please refresh the page and try again.')
        } else {
          setError(`Recording failed: ${err.message}. Please refresh the page and try again.`)
        }
      } else {
        setError('Failed to access camera/microphone. Please refresh the page and try again.')
      }
      setShowGuidelines(false)
    }
  }

  // Stop video recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setShowGuidelines(false)
    }
  }

  // Clear VideoB
  const handleClearVideoB = () => {
    if (videoBUrl) URL.revokeObjectURL(videoBUrl)
    
    // Stop recording if active
    if (isRecording) {
      handleStopRecording()
    }
    
    // Clean up stream
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop())
      videoStreamRef.current = null
    }
    
    // Clear video preview
    const videoPreview = document.getElementById('videoPreview') as HTMLVideoElement
    if (videoPreview) {
      videoPreview.srcObject = null
    }
    
    setVideoBFile(null)
    setVideoBUrl(null)
    setVideoBStatus("idle")
    setEvaluationResult(null)
    if (videoBInputRef.current) {
      videoBInputRef.current.value = ""
    }
  }

  // Evaluate both videos
  const handleEvaluate = async () => {
    if (!videoBFile) {
      setError("Please record or upload Video B")
      return
    }

    setIsEvaluating(true)
    setError(null)
    setEvaluationResult(null)

    try {
      // Step 1: Upload only Video B (Video A is hardcoded)
      console.log('Uploading Video B to blob storage...')
      console.log('Using hardcoded Video A:', VIDEO_A_URL)
      
      console.log('Uploading Video B:', videoBFile.name, videoBFile.size, 'bytes')
      const videoBBlob = await upload(videoBFile.name, videoBFile, {
        access: 'public',
        handleUploadUrl: '/api/upload-video',
      })
      console.log('Video B uploaded:', videoBBlob.url)

      // Step 2: Send blob URLs for evaluation
      const formData = new FormData()
      formData.append('videoAUrl', VIDEO_A_URL)
      formData.append('videoBUrl', videoBBlob.url)

      const response = await fetch('/api/evaluate-videos', {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const responseText = await response.text()
        console.log('Response body:', responseText)
        
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = JSON.parse(responseText)
          throw new Error(errorData.error || 'Failed to evaluate videos')
        } else {
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`)
        }
      }

      const result = await response.json()
      setEvaluationResult(result)
    } catch (err) {
      console.error('Evaluation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to evaluate videos')
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {/* IntelliMedia Logo */}
          <div className="flex justify-center mb-4">
            <div 
              className="h-16 md:h-20 w-48 md:w-56 bg-contain bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('https://intellimedianetworks.com/wp-content/uploads/2021/04/im-logo.svg')"
              }}
              aria-label="IntelliMedia Networks"
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 text-orange-500">Voice Pitch Comparison</h1>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Video Upload Section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* VideoB - User */}
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
                Record Your Pitch (VideoB)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!videoBFile ? (
                <div className="space-y-4">
                  {/* Recording Guidelines */}
                  {showGuidelines && (
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
                  )}
                  
                  {/* Video Preview */}
                  {isRecording && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                      <video
                        id="videoPreview"
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Recording Controls */}
                  {!isRecording ? (
                    <>
                      <Button
                        onClick={handleStartRecording}
                        variant="outline"
                        className="w-full border-2 border-orange-500 text-orange-700 hover:bg-orange-50 hover:text-orange-700"
                      >
                        Start Recording
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleStopRecording}
                      variant="destructive"
                      className="w-full"
                    >
                      Stop Recording
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={videoBUrl || undefined}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {videoBStatus === "processing" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-sm text-blue-600">Processing...</span>
                        </>
                      )}
                      {videoBStatus === "completed" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Ready</span>
                        </>
                      )}
                      {videoBStatus === "error" && (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600">Error</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearVideoB}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    File: {videoBFile.name} ({(videoBFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evaluate Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={handleEvaluate}
            disabled={!videoBFile || isEvaluating}
            className="w-full disabled:bg-gray-400 disabled:text-white disabled:opacity-100"
          >
            {isEvaluating ? "Evaluating..." : "Evaluate"}
          </Button>
        </div>

        {/* Results */}
        {evaluationResult && (
          <>
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
                  Performance Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScoreChart data={evaluationResult.scores} />
              </CardContent>
            </Card>

            {/* Detailed Scoring Notes */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
                  AI Analysis & Scoring Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reference Transcript */}
                <details className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 cursor-pointer">
                  <summary className="font-semibold text-blue-900 mb-2 cursor-pointer">
                    Reference Transcript (Video A)
                  </summary>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap mt-2">
                    {evaluationResult.referenceTranscript}
                  </p>
                </details>

                {/* Score breakdown by metric with insights and suggestions */}
                {Object.entries(evaluationResult.scores).map(([key, metric]) => {
                  const metricLabels: Record<string, string> = {
                    usageOfKeywords: 'Usage of Keywords',
                    pronunciation: 'Pronunciation',
                    fluency: 'Fluency',
                    objectionHandling: 'Objection Handling',
                    queryResolution: 'Query Resolution',
                    eyeContact: 'Eye Contact'
                  }
                  
                  return (
                    <div key={key} className="border-b pb-6 last:border-b-0">
                      <h3 className="font-semibold text-lg mb-4 text-gray-900">{metricLabels[key]}</h3>
                      
                      {/* Combined Score and Analysis Box */}
                      <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                        {/* Score Display */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-semibold text-green-900">Your Pitch</span>
                          <span className="text-4xl font-bold text-green-700">{metric.score}</span>
                        </div>
                        
                        {/* Analysis Factors */}
                        <div className="border-t border-green-200 pt-3 space-y-3">
                          <div>
                            <h4 className="text-xs font-semibold text-green-800 mb-2 uppercase tracking-wide">Insights:</h4>
                            <p className="text-sm text-green-900/90">{metric.insights}</p>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-semibold text-green-800 mb-2 uppercase tracking-wide">Suggestion:</h4>
                            <p className="text-sm text-green-900/90">{metric.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}
