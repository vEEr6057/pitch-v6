"use client"

import { useState, ChangeEvent, FormEvent, MouseEvent } from "react"
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

// Define additional interfaces for the component
interface ApiRequest {
  transcript: string;
  keywords: string[];
  isSpeechInput?: boolean;
}

interface ApiError {
  message: string;
}

export default function Page() {
  const [transcript, setTranscript] = useState<string>("")
  const [loadingRefine, setLoadingRefine] = useState<boolean>(false)
  const [result, setResult] = useState<ScorePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSpeechInput, setIsSpeechInput] = useState<boolean>(false) // Track input source

  async function handleRefineAndScoreWithTranscript(t?: string): Promise<void> {
    setError(null)
    setLoadingRefine(true)
    setResult(null)
    try {
      const requestBody: ApiRequest = {
        transcript: (t ?? transcript) || "",
        keywords: [], // auto-identify in API but not displayed
        isSpeechInput: isSpeechInput, // Pass speech input flag
      }
      
      const res = await fetch("/api/refine-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "Failed to refine/score")
      }
      
      const data = (await res.json()) as ScorePayload
      setResult(data)
    } catch (e: unknown) {
      const error = e as Error | ApiError
      setError(error.message || "Refine/score failed")
    } finally {
      setLoadingRefine(false)
    }
  }

  // Handler for speech recognition transcript
  const handleSpeechTranscript = (text: string) => {
    setTranscript(text);
    setIsSpeechInput(true); // Mark as speech input
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="space-y-6 text-center p-8">
        {/* IntelliMedia Logo */}
        <div className="flex justify-center">
          <div 
            className="h-20 w-56 bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('https://intellimedianetworks.com/wp-content/uploads/2021/04/im-logo.svg')"
            }}
            aria-label="IntelliMedia Networks"
          />
        </div>
        
        {/* Main Heading */}
        <h1 className="text-pretty">Sales Pitch - Demo</h1>
      </header>

      {/* 1. Speech Recognition Component */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800 text-center">Get Started - Enhance Your Sales Pitch Effectiveness</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <SpeechRecognition onTranscript={handleSpeechTranscript} />
        </CardContent>
      </Card>

      {/* 2. Transcript Text Area */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-lg font-bold text-gray-800 text-center">Transcript Generated from Audio Recording</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className={cn("w-full min-h-28 rounded-md border bg-background p-3 text-sm")}
            value={transcript}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              setTranscript(e.target.value);
              // If user manually types/edits, mark as text input
              if (e.target.value !== transcript) {
                setIsSpeechInput(false);
              }
            }}
            placeholder="Spoken text will appear here. You can also type or edit manually."
          />
          <div className="flex items-center gap-3">
            <Button 
              onClick={(e: MouseEvent<HTMLButtonElement>) => handleRefineAndScoreWithTranscript()} 
              disabled={!transcript || loadingRefine}
            >
              {loadingRefine ? "Refining & Scoring…" : "Refine & Score"}
            </Button>
            
            {transcript && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                isSpeechInput 
                  ? "bg-green-100 text-green-800" 
                  : "bg-blue-100 text-blue-800"
              }`}>
                {isSpeechInput ? "Speech Input" : "Text Input"}
              </span>
            )}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {/* 3. Scores Section */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-lg font-bold text-gray-800 text-center">AI-Generated Version Insights and Keyword Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <>
              {result.notes && (
                <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Evaluation Method:</p>
                  <p>{result.notes}</p>
                </div>
              )}
              <ScoreChart
                data={[
                  { metric: "Usage of Keywords", score: result.scores.usageOfKeywords },
                  { metric: "Pronunciation", score: result.scores.pronunciation },
                  { metric: "Fluency", score: result.scores.fluency },
                  { metric: "Objection Handling", score: result.scores.objectionHandling },
                  { metric: "Query Resolution", score: result.scores.queryResolution },
                ]}
              />
              {/* Keywords are identified in the backend but not displayed */}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Scores will appear here after refinement.</p>
          )}
        </CardContent>
      </Card>

      {/* 4. Finalised Text */}
      <Card className="shadow-md border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-balance text-lg font-bold text-gray-800 text-center">AI-Curated Final Text Version</CardTitle>
        </CardHeader>
        <CardContent>
          {result?.refinedText ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.refinedText}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Run "Refine & Score" to see the finalised output.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}