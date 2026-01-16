import { NextRequest, NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"
import Groq from "groq-sdk"

// Configure route to accept larger bodies
export const runtime = 'nodejs'
export const maxDuration = 300

const assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY || "" })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" })

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
  referenceTranscript: string // Video A transcript for reference
}

// Helper function to transcribe video
async function transcribeVideo(videoFile: File): Promise<{ transcript: string; duration: number }> {
  try {
    // Convert File to Buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to AssemblyAI
    const uploadUrl = await assemblyai.files.upload(buffer)
    
    // Transcribe
    const transcript = await assemblyai.transcripts.transcribe({
      audio: uploadUrl,
      language_code: "en"
    })
    
    if (transcript.status === "error") {
      throw new Error(transcript.error || "Transcription failed")
    }
    
    return {
      transcript: transcript.text || "",
      duration: (transcript.audio_duration || 0) / 1000
    }
  } catch (error) {
    console.error("Transcription error:", error)
    throw new Error(`Failed to transcribe video: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Helper function to analyze eye contact (placeholder - actual MediaPipe implementation in separate endpoint)
async function analyzeEyeContact(videoFile: File, request?: NextRequest): Promise<{ score: number; details: any }> {
  try {
    // Get base URL from environment or request headers
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    
    if (!baseUrl && request) {
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      baseUrl = `${protocol}://${host}`
    }
    
    if (!baseUrl) {
      baseUrl = 'http://localhost:3000'
    }
    
    console.log(`Calling eye contact API at: ${baseUrl}/api/analyze-eye-contact`)
    
    // Call the eye contact analysis API
    const formData = new FormData()
    formData.append('video', videoFile)
    
    const response = await fetch(`${baseUrl}/api/analyze-eye-contact`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Eye contact analysis failed')
    }
    
    const result = await response.json()
    return {
      score: result.score || 0,
      details: result.details || {}
    }
  } catch (error) {
    console.error("Eye contact analysis error:", error)
    // Return default values if analysis fails
    return {
      score: 50,
      details: {
        totalFrames: 0,
        eyeContactFrames: 0,
        faceDetectionRate: 0
      }
    }
  }
}

// Helper function to evaluate transcript with insights and suggestions
async function evaluateTranscript(
  transcript: string, 
  eyeContactScore: number,
  eyeContactDetails: { totalFrames: number; eyeContactFrames: number; faceDetectionRate: number }
): Promise<Scores> {
  try {
    const prompt = `You are an expert pharmaceutical sales pitch evaluator. Analyze the following sales pitch transcript and provide comprehensive evaluation with scores (0-100), insights, and suggestions.

TRANSCRIPT:
"""
${transcript}
"""

EYE CONTACT DATA (from video analysis):
- Score: ${eyeContactScore}/100
- Frames analyzed: ${eyeContactDetails.totalFrames}
- Frames with eye contact: ${eyeContactDetails.eyeContactFrames}
- Detection rate: ${(eyeContactDetails.faceDetectionRate * 100).toFixed(0)}%

TASK: Evaluate across 6 metrics. For each metric provide:
1. score (0-100): Numerical score
2. insights (1-2 sentences): Analysis of performance
3. suggestion (1 sentence): Actionable improvement

METRICS:
1. Usage of Keywords: How effectively does the pitch use pharmaceutical terminology, product benefits, and medical keywords?
2. Pronunciation: Based on the written transcript, assess the clarity and professionalism of language use (word choice, grammar).
3. Fluency: How smooth and natural is the flow of ideas? Are there logical transitions between points?
4. Objection Handling: Does the pitch anticipate and address potential customer concerns or objections?
5. Query Resolution: How well does the pitch provide clear answers and solutions to potential questions?
6. Eye Contact: Based on the eye contact data provided above, evaluate camera engagement and visual connection.

SCORING GUIDANCE:
- 90-100: Excellent - Professional, complete, highly effective
- 70-89: Good - Solid performance with minor areas for improvement
- 50-69: Average - Adequate but needs significant improvements
- 30-49: Below Average - Multiple issues, requires substantial work
- 0-29: Poor - Major deficiencies, needs complete rework

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "usageOfKeywords": {"score": 75, "insights": "...", "suggestion": "..."},
  "pronunciation": {"score": 70, "insights": "...", "suggestion": "..."},
  "fluency": {"score": 72, "insights": "...", "suggestion": "..."},
  "objectionHandling": {"score": 68, "insights": "...", "suggestion": "..."},
  "queryResolution": {"score": 70, "insights": "...", "suggestion": "..."},
  "eyeContact": {"score": ${eyeContactScore}, "insights": "...", "suggestion": "..."}
}

IMPORTANT: For eyeContact, use the provided score (${eyeContactScore}) and generate insights/suggestions based on that score and the frame data.`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2000,
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    
    // Clean response (remove markdown if present)
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, "")
    }
    
    const scores = JSON.parse(cleanedResponse)

    // Validate structure
    if (!scores.usageOfKeywords || !scores.eyeContact) {
      throw new Error("Invalid response structure from AI")
    }

    return scores
  } catch (error) {
    console.error("Evaluation error:", error)
    // Return default values with generic feedback
    return {
      usageOfKeywords: { score: 50, insights: "Unable to evaluate keywords", suggestion: "Try again" },
      pronunciation: { score: 50, insights: "Unable to evaluate pronunciation", suggestion: "Try again" },
      fluency: { score: 50, insights: "Unable to evaluate fluency", suggestion: "Try again" },
      objectionHandling: { score: 50, insights: "Unable to evaluate objection handling", suggestion: "Try again" },
      queryResolution: { score: 50, insights: "Unable to evaluate query resolution", suggestion: "Try again" },
      eyeContact: { score: eyeContactScore, insights: "Video analysis completed", suggestion: "Maintain consistent camera focus" }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if API keys are available
    console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY)
    console.log("ASSEMBLYAI_API_KEY exists:", !!process.env.ASSEMBLYAI_API_KEY)
    
    if (!process.env.GROQ_API_KEY || !process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: "API keys not configured on server" },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    const videoAUrl = formData.get("videoAUrl") as string
    const videoBUrl = formData.get("videoBUrl") as string

    if (!videoAUrl || !videoBUrl) {
      return NextResponse.json(
        { error: "Both videoAUrl and videoBUrl are required" },
        { status: 400 }
      )
    }

    // Fetch videos from blob storage
    console.log("Fetching videos from blob storage...")
    const [videoAResponse, videoBResponse] = await Promise.all([
      fetch(videoAUrl),
      fetch(videoBUrl)
    ])
    
    const [videoABuffer, videoBBuffer] = await Promise.all([
      videoAResponse.arrayBuffer(),
      videoBResponse.arrayBuffer()
    ])
    
    const videoAFile = new File([videoABuffer], 'videoA.webm', { type: 'video/webm' })
    const videoBFile = new File([videoBBuffer], 'videoB.webm', { type: 'video/webm' })

    // Process Video A - transcription only (for reference)
    console.log("Processing Video A (reference transcript only)...")
    const videoATranscript = await transcribeVideo(videoAFile)

    // Process Video B - full evaluation
    console.log("Processing Video B...")
    const [videoBTranscript, videoBEyeContact] = await Promise.all([
      transcribeVideo(videoBFile),
      analyzeEyeContact(videoBFile, request)
    ])
    
    const videoBScores = await evaluateTranscript(
      videoBTranscript.transcript,
      videoBEyeContact.score,
      videoBEyeContact.details
    )
    
    const result: EvaluationResult = {
      scores: videoBScores,
      transcript: videoBTranscript.transcript,
      referenceTranscript: videoATranscript.transcript
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate videos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

