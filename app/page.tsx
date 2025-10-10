"use client"

import { useState, useRef, ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ScoreChart from "@/components/score-chart"
import AudioRecorderAssemblyAI from "@/components/audio-recorder-assemblyai"

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
  voiceAKeywords?: string[];
  voiceBKeywords?: string[];
  differences?: string;
  detailedNotes: {
    metric: string;
    voiceAScore: number;
    voiceBScore: number;
    factors: string[];
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
  const [voiceBAudio, setVoiceBudio] = useState<Blob | null>(null) // Store audio blob for A-A mode
  
  // Evaluation mode: "text" (T-T) or "audio" (A-A)
  const [evaluationMode, setEvaluationMode] = useState<"text" | "audio">("text")
  
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

      // Upload and transcribe voiceA using OpenAI Whisper (FAST - 2-3 seconds!)
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json()
        throw new Error(errorData.error || "Failed to process audio file")
      }

      const { text } = await transcribeRes.json()

      if (!text || text.trim().length < 5) {
        throw new Error("Could not extract speech from audio file")
      }

      // Evaluate voiceA (speech-based) - user never sees the transcript
      const evaluateRes = await fetch("/api/refine-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
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
  const handleSpeechTranscript = (text: string, audioBlob?: Blob) => {
    setVoiceBTranscript(text)
    if (audioBlob) {
      setVoiceBudio(audioBlob) // Store audio for A-A mode
    }
    setComparisonResult(null) // Clear previous comparison
  }

  // Handle comparison evaluation
  async function handleCompareVoices(): Promise<void> {
    if (!voiceAResult || !voiceBTranscript) return

    setError(null)
    setIsComparing(true)
    setComparisonResult(null)

    try {
      // Use NEW AI comparison endpoint that compares both pitches together
      const compareRes = await fetch("/api/compare-pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceATranscript: voiceAResult.refinedText,
          voiceBTranscript: voiceBTranscript,
        }),
      })

      if (!compareRes.ok) {
        throw new Error("Failed to compare pitches")
      }

      const comparisonData = await compareRes.json()
      
      // Update voiceB result with new scores
      const voiceBData = {
        refinedText: voiceBTranscript,
        scores: comparisonData.voiceB,
        extractedKeywords: [],
        notes: comparisonData.reasoning,
      }
      setVoiceBResult(voiceBData)

      // Update voiceA result with potentially adjusted scores
      const updatedVoiceAResult = {
        ...voiceAResult,
        scores: comparisonData.voiceA,
      }
      setVoiceAResult(updatedVoiceAResult)

      // Create simple comparison result
      const metrics = [
        { key: "usageOfKeywords", name: "Usage of Keywords" },
        { key: "pronunciation", name: "Pronunciation" },
        { key: "fluency", name: "Fluency" },
        { key: "objectionHandling", name: "Objection Handling" },
        { key: "queryResolution", name: "Query Resolution" },
      ]

      // Generate detailed factors for each metric - ONLY Voice B analysis
      const generateFactors = (metric: string, voiceBScore: number, voiceBText: string): string[] => {
        const factors: string[] = []
        
        // Word count analysis - only Voice B
        const voiceBWords = voiceBText.split(/\s+/).filter(w => w).length
        factors.push(`Word count: Your Pitch (${voiceBWords} words)`)
        
        // Quality indicators based on Voice B score only
        if (voiceBScore >= 80) {
          factors.push(`Your Pitch: Strong performance (${voiceBScore}/100)`)
        } else if (voiceBScore >= 60) {
          factors.push(`Your Pitch: Good performance with room for improvement (${voiceBScore}/100)`)
        } else if (voiceBScore >= 40) {
          factors.push(`Your Pitch: Moderate performance, needs improvement (${voiceBScore}/100)`)
        } else {
          factors.push(`Your Pitch: Needs significant improvement (${voiceBScore}/100)`)
        }
        
        return factors
      }

      const detailedNotes = metrics.map((metric) => ({
        metric: metric.name,
        voiceAScore: comparisonData.voiceA[metric.key as keyof Scores],
        voiceBScore: comparisonData.voiceB[metric.key as keyof Scores],
        factors: generateFactors(
          metric.name,
          comparisonData.voiceB[metric.key as keyof Scores],
          voiceBData.refinedText
        )
      }))

      setComparisonResult({
        voiceA: updatedVoiceAResult,
        voiceB: voiceBData,
        voiceAKeywords: comparisonData.voiceAKeywords || [],
        voiceBKeywords: comparisonData.voiceBKeywords || [],
        differences: comparisonData.differences || "",
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
      </header>

      {/* Box 1: Upload VoiceA (Original Pitch) */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-base md:text-lg font-bold text-gray-800 text-center">
            Upload Original Pitch (VoiceA)
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

                {/* Audio Player for uploaded file */}
                <div className="rounded-md bg-green-50 border border-green-200 p-3">
                  <p className="font-medium text-green-800 mb-2">🎵 Reference Audio (Voice A):</p>
                  <audio 
                    src={URL.createObjectURL(voiceAFile)} 
                    controls 
                    className="w-full"
                  />
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
                    <p className="text-sm font-medium text-green-800">Original pitch uploaded and evaluated</p>
                  </div>
                )}

                {voiceAStatus === "error" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">Processing failed. Please try again.</p>
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
        <CardContent className="p-4 md:p-6 space-y-4">
          <AudioRecorderAssemblyAI onTranscript={handleSpeechTranscript} />
          
          {/* Evaluate Button and Mode Toggle */}
          <div className="space-y-3">
            <Button 
              onClick={handleCompareVoices} 
              disabled={!voiceAResult || !voiceBTranscript || isComparing}
              className="w-full"
            >
              {isComparing ? "Evaluating..." : "Evaluate"}
            </Button>

            {/* Show mode toggle after user can evaluate */}
            {voiceAResult && voiceBTranscript && !isComparing && (
              <div className="flex items-center justify-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs font-medium text-gray-600">Evaluation Mode:</span>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setEvaluationMode("audio")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-l-md border transition-colors",
                      evaluationMode === "audio"
                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    A-A
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvaluationMode("text")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-r-md border transition-colors",
                      evaluationMode === "text"
                        ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    T-T
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {evaluationMode === "audio" ? "(Audio Analysis)" : "(Text Analysis)"}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Box 3: Comparison Chart and Detailed Notes */}
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
                AI Analysis & Scoring Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show Your Pitch Keywords Only */}
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">Your Pitch Keywords</h3>
                  <ul className="space-y-1">
                    {comparisonResult.voiceBKeywords && comparisonResult.voiceBKeywords.length > 0 ? (
                      comparisonResult.voiceBKeywords.map((keyword, idx) => (
                        <li key={idx} className="text-sm text-green-800">• {keyword}</li>
                      ))
                    ) : (
                      <li className="text-sm text-green-600 italic">Keywords not extracted</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Key Differences */}
              {comparisonResult.differences && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-amber-900 mb-2">Key Differences</h3>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">{comparisonResult.differences}</p>
                </div>
              )}

              {/* Score comparison by metric */}
              {comparisonResult.detailedNotes.map((note: any, index: number) => (
                <div key={index} className="border-b pb-6 last:border-b-0">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">{note.metric}</h3>
                  
                  {/* Combined Score and Analysis Box */}
                  <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                    {/* Score Display */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-green-900">Your Pitch</span>
                      <span className="text-4xl font-bold text-green-700">{note.voiceBScore}</span>
                    </div>
                    
                    {/* Analysis Factors */}
                    <div className="border-t border-green-200 pt-3">
                      <h4 className="text-xs font-semibold text-green-800 mb-2 uppercase tracking-wide">Analysis Factors:</h4>
                      <ul className="space-y-1.5">
                        {note.factors.map((factor: string, fIdx: number) => (
                          <li key={fIdx} className="text-sm text-green-900/80">• {factor}</li>
                        ))}
                      </ul>
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