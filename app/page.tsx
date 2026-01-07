"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ScoreChart from "@/components/score-chart"
import { Upload, Video, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

// Define interfaces for video evaluation
interface Scores {
  usageOfKeywords: number
  pronunciation: number
  fluency: number
  objectionHandling: number
  queryResolution: number
  eyeContact: number // NEW metric
}

interface VideoResult {
  scores: Scores
  transcript: string
  eyeContactDetails?: {
    totalFrames: number
    eyeContactFrames: number
    faceDetectionRate: number
  }
}

interface ComparisonResult {
  videoA: VideoResult
  videoB: VideoResult
  comparison: {
    overallDifference: number
    strengths: string[]
    improvements: string[]
  }
  eyeContactAnalysis: {
    videoA: { score: number; feedback: string }
    videoB: { score: number; feedback: string }
  }
}

export default function Page() {
  // VideoA (Reference) states
  const [videoAFile, setVideoAFile] = useState<File | null>(null)
  const [videoAUrl, setVideoAUrl] = useState<string | null>(null)
  const [videoAStatus, setVideoAStatus] = useState<"idle" | "processing" | "completed" | "error">("idle")
  const videoAInputRef = useRef<HTMLInputElement>(null)
  
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
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Recording guidelines
  const [showGuidelines, setShowGuidelines] = useState(false)

  // Handle VideoA upload
  const handleVideoAUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('video/')) {
      setError("Please upload a valid video file")
      return
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError("Video file is too large (max 50MB)")
      return
    }

    setVideoAFile(file)
    setVideoAUrl(URL.createObjectURL(file))
    setVideoAStatus("processing")
    setError(null)
    setComparisonResult(null)

    // Status will be updated to "completed" when user clicks evaluate
    setTimeout(() => setVideoAStatus("completed"), 500)
  }

  // Clear VideoA
  const handleClearVideoA = () => {
    if (videoAUrl) URL.revokeObjectURL(videoAUrl)
    setVideoAFile(null)
    setVideoAUrl(null)
    setVideoAStatus("idle")
    setComparisonResult(null)
    if (videoAInputRef.current) {
      videoAInputRef.current.value = ""
    }
  }

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
    setComparisonResult(null)

    setTimeout(() => setVideoBStatus("completed"), 500)
  }

  // Start video recording
  const handleStartRecording = async () => {
    setShowGuidelines(true)
    setError(null)
    
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
      
      // Show preview
      const videoPreview = document.getElementById('videoPreview') as HTMLVideoElement
      if (videoPreview) {
        videoPreview.srcObject = stream
        await videoPreview.play()
      }
      
      // Wait a bit for stream to stabilize
      await new Promise(resolve => setTimeout(resolve, 200))
      
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
          chunks.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
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
      mediaRecorder.start()
      setIsRecording(true)
      
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
    setComparisonResult(null)
    if (videoBInputRef.current) {
      videoBInputRef.current.value = ""
    }
  }

  // Evaluate both videos
  const handleEvaluate = async () => {
    if (!videoAFile || !videoBFile) {
      setError("Please upload both videos")
      return
    }

    setIsEvaluating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('videoA', videoAFile)
      formData.append('videoB', videoBFile)

      const response = await fetch('/api/evaluate-videos', {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        // Try to get response body for debugging
        const responseText = await response.text()
        console.log('Response body:', responseText)
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = JSON.parse(responseText)
          throw new Error(errorData.error || 'Failed to evaluate videos')
        } else {
          // Handle non-JSON error responses
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`)
        }
      }

      const result = await response.json()
      setComparisonResult(result)
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* VideoA - Reference */}
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
                Upload Original Pitch (VideoA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!videoAFile ? (
                <div className="space-y-4">
                  <input
                    ref={videoAInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/mov"
                    onChange={handleVideoAUpload}
                    className="hidden"
                    id="videoA-upload"
                  />
                  <div className="flex flex-col items-center gap-4">
                    <Button
                      onClick={() => videoAInputRef.current?.click()}
                      className="w-full md:w-auto bg-black hover:bg-gray-800 text-white"
                    >
                      Choose Video File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={videoAUrl || undefined}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {videoAStatus === "processing" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-sm text-blue-600">Processing...</span>
                        </>
                      )}
                      {videoAStatus === "completed" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Ready</span>
                        </>
                      )}
                      {videoAStatus === "error" && (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600">Error</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearVideoA}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    File: {videoAFile.name} ({(videoAFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
                        muted
                        className="w-full h-full mirror"
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
            disabled={!videoAFile || !videoBFile || isEvaluating}
            className="w-full disabled:bg-gray-400 disabled:text-white disabled:opacity-100"
          >
            {isEvaluating ? "Evaluating..." : "Evaluate"}
          </Button>
        </div>

        {/* Results */}
        {comparisonResult && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Evaluation Results - Video B Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chart */}
              <ScoreChart
                data={comparisonResult.videoB.scores}
                referenceData={comparisonResult.videoA.scores}
              />

              {/* Metrics Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(comparisonResult.videoB.scores).map(([key, value]) => {
                  const referenceScore = comparisonResult.videoA.scores[key as keyof Scores]
                  const diff = value - referenceScore
                  const labels: { [key: string]: string } = {
                    usageOfKeywords: "Usage of Keywords",
                    pronunciation: "Pronunciation",
                    fluency: "Fluency",
                    objectionHandling: "Objection Handling",
                    queryResolution: "Query Resolution",
                    eyeContact: "Eye Contact"
                  }
                  
                  return (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">{labels[key]}</h4>
                        <span className={cn(
                          "text-xs font-medium",
                          diff >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {diff >= 0 ? "+" : ""}{diff.toFixed(0)} vs benchmark
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold">{value}/100</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Eye Contact Analysis */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2">👁️ Eye Contact Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Video A (Benchmark)</p>
                    <p className="text-sm text-gray-700">
                      {comparisonResult.eyeContactAnalysis.videoA.feedback}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Video B (Your Pitch)</p>
                    <p className="text-sm text-gray-700">
                      {comparisonResult.eyeContactAnalysis.videoB.feedback}
                    </p>
                  </div>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">💪 Strengths</h4>
                  <ul className="space-y-1">
                    {comparisonResult.comparison.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-green-700">✓ {strength}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">🎯 Areas to Improve</h4>
                  <ul className="space-y-1">
                    {comparisonResult.comparison.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-sm text-amber-700">→ {improvement}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Transcripts */}
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">📝 Video A Transcript</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comparisonResult.videoA.transcript}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">📝 Video B Transcript</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comparisonResult.videoB.transcript}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
