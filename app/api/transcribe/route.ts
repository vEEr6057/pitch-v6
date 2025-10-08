import { NextRequest, NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"

// Initialize AssemblyAI client with FREE API key
// Get your own free key at: https://www.assemblyai.com/dashboard/signup
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || "7e3c4d5a8f9b2e1d6c3a5b7f9e2d4c6a", // Demo key (get your own free key!)
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log('Transcription request received')

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

    console.log(`Transcribing audio file: ${audioFile.name} (${audioFile.size} bytes)`)

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload audio to AssemblyAI and transcribe (100% FREE!)
    console.log('Uploading to AssemblyAI...')
    const transcript = await client.transcripts.transcribe({
      audio: buffer,
      speech_model: 'best', // Use best quality model (still free!)
    })

    console.log('Transcription status:', transcript.status)

    if (transcript.status === 'error') {
      console.error('AssemblyAI error:', transcript.error)
      return NextResponse.json(
        { error: transcript.error || "Transcription failed" },
        { status: 500 }
      )
    }

    const transcribedText = transcript.text || ''

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
    
    return NextResponse.json(
      {
        error: error?.message || "Failed to transcribe audio. Please try again.",
      },
      { status: 500 }
    )
  }
}