import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 }
      )
    }

    // Get audio file from form data
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Check file size
    if (audioFile.size < 50) {
      return NextResponse.json(
        { error: "Audio file is too small or empty" },
        { status: 400 }
      )
    }

    // Convert File to proper format for OpenAI
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create a File object with proper structure
    const file = new File([buffer], audioFile.name || "audio.mp3", {
      type: audioFile.type || "audio/mpeg",
    })

    console.log(`Transcribing audio file: ${file.name} (${file.size} bytes)`)

    // Use OpenAI Whisper API directly (FAST transcription - 2-3 seconds!)
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en",
      response_format: "text",
    })

    const transcribedText = typeof transcription === "string" ? transcription : transcription.toString()

    console.log(`Transcription result: ${transcribedText.substring(0, 100)}...`)

    if (!transcribedText || transcribedText.trim().length < 5) {
      return NextResponse.json(
        { error: "Could not extract speech from audio file. Please ensure the audio contains clear speech." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      text: transcribedText.trim(),
    })
  } catch (error: any) {
    console.error("Transcription error:", error)
    
    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." },
        { status: 500 }
      )
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "OpenAI API rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        error: error?.message || "Failed to transcribe audio. Please try again.",
      },
      { status: 500 }
    )
  }
}