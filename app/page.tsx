"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ScoreChart from "@/components/score-chart"
import SpeechRecognition from "@/components/speech-recognition"

// Define interfaces for better type organization
interface Scores {
  usageOfKeywords: number;
  pronunciation: number;
  fluency: number;
  objectionHandling: number;
  queryResolution: number;
}

interface ScorePayload {
  refinedText: string;
  scores: Scores;
  extractedKeywords?: string[];
  notes?: string;
}

interface ComparisonResult {
  voiceA: ScorePayload;
  voiceB: ScorePayload;
  detailedNotes: {
    metric: string;
    voiceAScore: number;
    voiceBScore: number;
    voiceAExplanation: string;
    voiceBExplanation: string;
  }[];
}

export default function Page() {
  // VoiceA (Upload) states
  const [voiceAFile, setVoiceAFile] = useState<File | null>(null)
  const [voiceAStatus, setVoiceAStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "error">("idle")
  const [voiceAResult, setVoiceAResult] = useState<ScorePayload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // VoiceB (Recording) states
  const [voiceBTranscript, setVoiceBTranscript] = useState<string>("")
  const [voiceBResult, setVoiceBResult] = useState<ScorePayload | null>(null)
  
  // Comparison states
  const [isComparing, setIsComparing] = useState<boolean>(false)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Handle VoiceA file upload
  const handleVoiceAUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVoiceAFile(file)
    setVoiceAStatus("uploading")
    setError(null)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("audio", file)

      setVoiceAStatus("processing")

      // Upload and transcribe voiceA
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!transcribeRes.ok) {
        throw new Error("Failed to process audio file")
      }

      const { text } = await transcribeRes.json()

      // Evaluate voiceA (speech-based)
      const evaluateRes = await fetch("/api/refine-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text || "Audio processed",
          keywords: [],
          isSpeechInput: true,
        }),
      })

      if (!evaluateRes.ok) {
        throw new Error("Failed to evaluate audio")
      }

      const result = await evaluateRes.json()
      setVoiceAResult(result)
      setVoiceAStatus("completed")
    } catch (err) {
      console.error("VoiceA processing error:", err)
      setError(err instanceof Error ? err.message : "Failed to process audio")
      setVoiceAStatus("error")
    }
  }

  // Clear voiceA upload
  const handleClearVoiceA = () => {
    setVoiceAFile(null)
    setVoiceAStatus("idle")
    setVoiceAResult(null)
    setComparisonResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handler for speech recognition transcript (VoiceB)
  const handleSpeechTranscript = (text: string) => {
    setVoiceBTranscript(text)
    setComparisonResult(null) // Clear previous comparison
  }

  // Handle comparison evaluation
  async function handleCompareVoices(): Promise<void> {
    if (!voiceAResult || !voiceBTranscript) return

    setError(null)
    setIsComparing(true)
    setComparisonResult(null)

    try {
      // Evaluate voiceB
      const voiceBRes = await fetch("/api/refine-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: voiceBTranscript,
          keywords: [],
          isSpeechInput: true, // Always speech-based
        }),
      })

      if (!voiceBRes.ok) {
        throw new Error("Failed to evaluate VoiceB")
      }

      const voiceBData = await voiceBRes.json()
      setVoiceBResult(voiceBData)

      // Create detailed comparison notes
      const metrics = [
        { key: "usageOfKeywords", name: "Usage of Keywords" },
        { key: "pronunciation", name: "Pronunciation" },
        { key: "fluency", name: "Fluency" },
        { key: "objectionHandling", name: "Objection Handling" },
        { key: "queryResolution", name: "Query Resolution" },
      ]

      const detailedNotes = metrics.map((metric) => ({
        metric: metric.name,
        voiceAScore: voiceAResult.scores[metric.key as keyof Scores],
        voiceBScore: voiceBData.scores[metric.key as keyof Scores],
        voiceAExplanation: `Reference pitch scored ${voiceAResult.scores[metric.key as keyof Scores]} based on speech delivery patterns.`,
        voiceBExplanation: `Your pitch scored ${voiceBData.scores[metric.key as keyof Scores]} based on speech delivery patterns.`,
      }))

      setComparisonResult({
        voiceA: voiceAResult,
        voiceB: voiceBData,
        detailedNotes,
      })
    } catch (err) {
      console.error("Comparison error:", err)
      setError(err instanceof Error ? err.message : "Comparison failed")
    } finally {
      setIsComparing(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <header className="space-y-4 md:space-y-6 text-center p-4 md:p-8">
        {/* IntelliMedia Logo */}
        <div className="flex justify-center">
          <div 
            className="h-16 md:h-20 w-48 md:w-56 bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://intellimedianetworks.com/wp-content/uploads/2021/04/im-logo.svg')"
            }}
            aria-label="IntelliMedia Networks"
          />
        </div>
        
        {/* Main Heading */}
        <h1 className="text-pretty text-2xl md:text-3xl">Voice Pitch Comparison</h1>
        <p className="text-sm md:text-base text-muted-foreground">Compare reference pitch with your delivery</p>
      </header>

      {/* Box 1: Upload VoiceA (Reference Pitch) */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
            Upload Reference Pitch (VoiceA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleVoiceAUpload}
              className="hidden"
              id="voiceA-upload"
            />
            
            {voiceAStatus === "idle" && (
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full md:w-auto"
              >
                Choose Audio File
              </Button>
            )}

            {voiceAFile && (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 truncate">{voiceAFile.name}</p>
                    <p className="text-xs text-blue-700">
                      {(voiceAFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleClearVoiceA}
                    disabled={voiceAStatus === "uploading" || voiceAStatus === "processing"}
                  >
                    Remove
                  </Button>
                </div>

                {voiceAStatus === "uploading" && (
                  <div className="text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                  </div>
                )}

                {voiceAStatus === "processing" && (
                  <div className="text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="text-sm text-muted-foreground mt-2">Processing audio...</p>
                  </div>
                )}

                {voiceAStatus === "completed" && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-800">✓ Reference pitch uploaded and evaluated</p>
                  </div>
                )}

                {voiceAStatus === "error" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">✗ Processing failed. Please try again.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Box 2: Record VoiceB (Your Pitch) */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
            Record Your Pitch (VoiceB)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <SpeechRecognition onTranscript={handleSpeechTranscript} />
        </CardContent>
      </Card>

      {/* Box 3: VoiceB Transcript */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
            Your Pitch Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className={cn("w-full min-h-32 rounded-md border bg-background p-3 text-sm")}
            value={voiceBTranscript}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              setVoiceBTranscript(e.target.value)
              setComparisonResult(null) // Clear comparison when editing
            }}
            placeholder="Your spoken text will appear here. You can also edit it manually."
          />
          
          <Button 
            onClick={handleCompareVoices} 
            disabled={!voiceAResult || !voiceBTranscript || isComparing}
            className="w-full md:w-auto"
          >
            {isComparing ? "Evaluating..." : "Evaluate & Compare"}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Box 4: Comparison Chart and Detailed Notes */}
      {comparisonResult && (
        <>
          <Card className="shadow-md border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
                Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreChart
                voiceAData={[
                  { metric: "Usage of Keywords", score: comparisonResult.voiceA.scores.usageOfKeywords },
                  { metric: "Pronunciation", score: comparisonResult.voiceA.scores.pronunciation },
                  { metric: "Fluency", score: comparisonResult.voiceA.scores.fluency },
                  { metric: "Objection Handling", score: comparisonResult.voiceA.scores.objectionHandling },
                  { metric: "Query Resolution", score: comparisonResult.voiceA.scores.queryResolution },
                ]}
                voiceBData={[
                  { metric: "Usage of Keywords", score: comparisonResult.voiceB.scores.usageOfKeywords },
                  { metric: "Pronunciation", score: comparisonResult.voiceB.scores.pronunciation },
                  { metric: "Fluency", score: comparisonResult.voiceB.scores.fluency },
                  { metric: "Objection Handling", score: comparisonResult.voiceB.scores.objectionHandling },
                  { metric: "Query Resolution", score: comparisonResult.voiceB.scores.queryResolution },
                ]}
              />
            </CardContent>
          </Card>

          {/* Detailed Scoring Notes */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
                Detailed Scoring Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {comparisonResult.detailedNotes.map((note, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0">
                  <h3 className="font-semibold text-base mb-3 text-gray-900">{note.metric}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* VoiceA Explanation */}
                    <div className="bg-blue-50 p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">Reference Pitch</span>
                        <span className="text-lg font-bold text-blue-700">{note.voiceAScore}</span>
                      </div>
                      <p className="text-sm text-blue-800">{note.voiceAExplanation}</p>
                    </div>

                    {/* VoiceB Explanation */}
                    <div className="bg-green-50 p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">Your Pitch</span>
                        <span className="text-lg font-bold text-green-700">{note.voiceBScore}</span>
                      </div>
                      <p className="text-sm text-green-800">{note.voiceBExplanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  )
}