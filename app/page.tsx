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

      // Generate detailed explanations for each metric
      const generateExplanation = (transcript: string, score: number, metricKey: string) => {
        const words = transcript.split(/\s+/).filter(Boolean);
        const sentences = transcript.split(/[.!?]+/).filter(Boolean);
        const avgWordLength = transcript.replace(/\s/g, '').length / Math.max(1, words.length);
        
        // Detect various speech patterns
        const fillers = (transcript.match(/\b(um|uh|you know|like|well|so|let me|I mean|basically|actually)\b/gi) || []).length;
        const conversationalMarkers = (transcript.match(/\b(and then|after that|next|finally|first|second|because|since|however|although|but)\b/gi) || []).length;
        const interactiveLanguage = (transcript.match(/\b(I understand|I see|that's a good point|you might be thinking|let me address|what if|suppose|imagine|many people ask|common concern|often hear)\b/gi) || []).length;
        const questions = (transcript.match(/\?/g) || []).length;
        const engagementWords = (transcript.match(/\b(would you|consider|please|may)\b/gi) || []).length;
        const persuasiveWords = (transcript.match(/\b(advantage|benefit|value|improve|better|best|solution|opportunity|effective|efficient|quality|save|proven|guarantee|recommend)\b/gi) || []).length;
        const hasIntro = /^(greetings|hello|hi|good|dear|welcome)/i.test(transcript);
        const hasConclusion = /(thank|appreciate|consider|conclusion|in summary|sincerely|regards)/i.test(transcript);
        
        const factors: string[] = [];
        
        if (metricKey === "usageOfKeywords") {
          factors.push(`Word count: ${words.length} words analyzed`);
          factors.push(`Key terms identified and weighted by frequency and position`);
          factors.push(`Domain-specific vocabulary usage evaluated`);
          if (hasIntro) factors.push("✓ Keywords present in introduction");
          if (hasConclusion) factors.push("✓ Keywords present in conclusion");
        } else if (metricKey === "pronunciation") {
          factors.push(`Average word length: ${avgWordLength.toFixed(1)} characters`);
          if (fillers > 0) factors.push(`Natural speech markers detected: ${fillers}`);
          factors.push(`Sentence structure: ${sentences.length} sentence${sentences.length !== 1 ? 's' : ''}`);
          if (avgWordLength < 5) factors.push("✓ Clear, concise word choices");
          if (sentences > 2) factors.push("✓ Good pacing with multiple sentences");
        } else if (metricKey === "fluency") {
          factors.push(`Speech length: ${words.length} words`);
          if (conversationalMarkers > 0) factors.push(`Flow markers used: ${conversationalMarkers} (sequence & logic connectors)`);
          factors.push(`Sentence variety: ${sentences.length} sentence${sentences.length !== 1 ? 's' : ''}`);
          if (sentences > 1 && sentences < 8) factors.push("✓ Optimal sentence variety for speech");
          if (words.length > 30) factors.push("✓ Appropriate length for detailed pitch");
        } else if (metricKey === "objectionHandling") {
          if (interactiveLanguage > 0) factors.push(`Interactive phrases used: ${interactiveLanguage}`);
          if (persuasiveWords > 0) factors.push(`Persuasive language: ${persuasiveWords} power words`);
          if (questions > 0) factors.push(`Engagement questions: ${questions}`);
          if (hasIntro && hasConclusion) factors.push("✓ Strong opening and closing");
          if (factors.length === 0) factors.push("Limited interactive or persuasive elements detected");
        } else if (metricKey === "queryResolution") {
          if (questions > 0) factors.push(`Questions asked: ${questions} (shows engagement)`);
          if (engagementWords > 0) factors.push(`Engagement phrases: ${engagementWords} (considerate language)`);
          factors.push(`Overall clarity: ${sentences.length > 0 ? 'Multiple clear points' : 'Single statement'}`);
          if (hasConclusion) factors.push("✓ Clear conclusion provided");
        }
        
        return factors;
      };

      // Create detailed comparison notes with bullet-point explanations
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
        voiceAFactors: generateExplanation(voiceAResult.refinedText, voiceAResult.scores[metric.key as keyof Scores], metric.key),
        voiceBFactors: generateExplanation(voiceBData.refinedText, voiceBData.scores[metric.key as keyof Scores], metric.key),
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
          <AudioRecorderAssemblyAI onTranscript={handleSpeechTranscript} />
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
              {comparisonResult.detailedNotes.map((note: any, index: number) => (
                <div key={index} className="border-b pb-6 last:border-b-0">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">{note.metric}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* VoiceA Explanation */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-blue-900">Reference Pitch</span>
                        <span className="text-2xl font-bold text-blue-700">{note.voiceAScore}</span>
                      </div>
                      <div className="text-sm text-blue-800 space-y-1.5">
                        <p className="font-medium mb-2">Score factors:</p>
                        <ul className="space-y-1">
                          {note.voiceAFactors.map((factor: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2 mt-0.5">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* VoiceB Explanation */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-green-900">Your Pitch</span>
                        <span className="text-2xl font-bold text-green-700">{note.voiceBScore}</span>
                      </div>
                      <div className="text-sm text-green-800 space-y-1.5">
                        <p className="font-medium mb-2">Score factors:</p>
                        <ul className="space-y-1">
                          {note.voiceBFactors.map((factor: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2 mt-0.5">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
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