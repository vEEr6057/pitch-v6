import { NextRequest, NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"
import Groq from "groq-sdk"

const assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY || "" })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" })

interface Scores {
  usageOfKeywords: number
  pronunciation: number
  fluency: number
  objectionHandling: number
  queryResolution: number
  eyeContact: number
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
async function analyzeEyeContact(videoFile: File): Promise<{ score: number; details: any }> {
  try {
    // Call the eye contact analysis API
    const formData = new FormData()
    formData.append('video', videoFile)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-eye-contact`, {
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

// Helper function to evaluate transcript
async function evaluateTranscript(transcript: string): Promise<Omit<Scores, 'eyeContact'>> {
  try {
    const prompt = `You are an expert pharmaceutical sales pitch evaluator. Analyze the following sales pitch transcript and provide scores (0-100) for these metrics:

1. Usage of Keywords: How effectively does the pitch use pharmaceutical terminology, product benefits, and medical keywords?
2. Pronunciation: Based on the written transcript, assess the clarity and professionalism of language use (word choice, grammar).
3. Fluency: How smooth and natural is the flow of ideas? Are there logical transitions between points?
4. Objection Handling: Does the pitch anticipate and address potential customer concerns or objections?
5. Query Resolution: How well does the pitch provide clear answers and solutions to potential questions?

Transcript:
"""
${transcript}
"""

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "usageOfKeywords": <number 0-100>,
  "pronunciation": <number 0-100>,
  "fluency": <number 0-100>,
  "objectionHandling": <number 0-100>,
  "queryResolution": <number 0-100>,
  "reasoning": {
    "usageOfKeywords": "<brief explanation>",
    "pronunciation": "<brief explanation>",
    "fluency": "<brief explanation>",
    "objectionHandling": "<brief explanation>",
    "queryResolution": "<brief explanation>"
  }
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    
    // Clean response (remove markdown if present)
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, "")
    }
    
    const parsed = JSON.parse(cleanedResponse)
    
    return {
      usageOfKeywords: Math.round(parsed.usageOfKeywords || 0),
      pronunciation: Math.round(parsed.pronunciation || 0),
      fluency: Math.round(parsed.fluency || 0),
      objectionHandling: Math.round(parsed.objectionHandling || 0),
      queryResolution: Math.round(parsed.queryResolution || 0)
    }
  } catch (error) {
    console.error("Evaluation error:", error)
    // Return default scores if evaluation fails
    return {
      usageOfKeywords: 50,
      pronunciation: 50,
      fluency: 50,
      objectionHandling: 50,
      queryResolution: 50
    }
  }
}

// Helper function to compare results
async function compareResults(videoA: VideoResult, videoB: VideoResult): Promise<{ 
  overallDifference: number
  strengths: string[]
  improvements: string[]
}> {
  try {
    const prompt = `Compare these two pharmaceutical sales pitch evaluations and provide insights:

Video A (Benchmark):
- Keywords: ${videoA.scores.usageOfKeywords}/100
- Pronunciation: ${videoA.scores.pronunciation}/100
- Fluency: ${videoA.scores.fluency}/100
- Objection Handling: ${videoA.scores.objectionHandling}/100
- Query Resolution: ${videoA.scores.queryResolution}/100
- Eye Contact: ${videoA.scores.eyeContact}/100
Transcript: ${videoA.transcript.slice(0, 300)}...

Video B (User's Pitch):
- Keywords: ${videoB.scores.usageOfKeywords}/100
- Pronunciation: ${videoB.scores.pronunciation}/100
- Fluency: ${videoB.scores.fluency}/100
- Objection Handling: ${videoB.scores.objectionHandling}/100
- Query Resolution: ${videoB.scores.queryResolution}/100
- Eye Contact: ${videoB.scores.eyeContact}/100
Transcript: ${videoB.transcript.slice(0, 300)}...

Provide specific, actionable insights. Respond ONLY with valid JSON:
{
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"]
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 512
    })

    const responseText = completion.choices[0]?.message?.content || "{}"
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, "")
    }
    
    const parsed = JSON.parse(cleanedResponse)
    
    // Calculate overall difference
    const avgA = Object.values(videoA.scores).reduce((a, b) => a + b, 0) / 6
    const avgB = Object.values(videoB.scores).reduce((a, b) => a + b, 0) / 6
    
    return {
      overallDifference: Math.round(avgB - avgA),
      strengths: parsed.strengths || ["Good overall performance"],
      improvements: parsed.improvements || ["Continue practicing"]
    }
  } catch (error) {
    console.error("Comparison error:", error)
    return {
      overallDifference: 0,
      strengths: ["Good overall performance"],
      improvements: ["Continue practicing to improve consistency"]
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoAFile = formData.get("videoA") as File
    const videoBFile = formData.get("videoB") as File

    if (!videoAFile || !videoBFile) {
      return NextResponse.json(
        { error: "Both videoA and videoB are required" },
        { status: 400 }
      )
    }

    // Process Video A
    console.log("Processing Video A...")
    const [videoATranscript, videoAEyeContact] = await Promise.all([
      transcribeVideo(videoAFile),
      analyzeEyeContact(videoAFile)
    ])
    
    const videoATextScores = await evaluateTranscript(videoATranscript.transcript)
    
    const videoAResult: VideoResult = {
      scores: {
        ...videoATextScores,
        eyeContact: videoAEyeContact.score
      },
      transcript: videoATranscript.transcript,
      eyeContactDetails: videoAEyeContact.details
    }

    // Process Video B
    console.log("Processing Video B...")
    const [videoBTranscript, videoBEyeContact] = await Promise.all([
      transcribeVideo(videoBFile),
      analyzeEyeContact(videoBFile)
    ])
    
    const videoBTextScores = await evaluateTranscript(videoBTranscript.transcript)
    
    const videoBResult: VideoResult = {
      scores: {
        ...videoBTextScores,
        eyeContact: videoBEyeContact.score
      },
      transcript: videoBTranscript.transcript,
      eyeContactDetails: videoBEyeContact.details
    }

    // Compare results
    console.log("Comparing results...")
    const comparison = await compareResults(videoAResult, videoBResult)

    // Generate eye contact feedback
    const getEyeContactFeedback = (score: number): string => {
      if (score >= 80) return "Excellent eye contact maintained throughout. Great connection with audience."
      if (score >= 60) return "Good eye contact. Try to maintain gaze for longer periods."
      if (score >= 40) return "Moderate eye contact. Focus on looking directly at camera more consistently."
      return "Limited eye contact detected. Practice looking directly at camera while speaking."
    }

    const result: ComparisonResult = {
      videoA: videoAResult,
      videoB: videoBResult,
      comparison,
      eyeContactAnalysis: {
        videoA: {
          score: videoAResult.scores.eyeContact,
          feedback: getEyeContactFeedback(videoAResult.scores.eyeContact)
        },
        videoB: {
          score: videoBResult.scores.eyeContact,
          feedback: getEyeContactFeedback(videoBResult.scores.eyeContact)
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Evaluation error:", error)
    return NextResponse.json(
      { 
        error: "Failed to evaluate videos",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
