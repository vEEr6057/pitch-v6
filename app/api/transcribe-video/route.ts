import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'

export const runtime = 'nodejs'
export const maxDuration = 60

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json()

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      )
    }

    console.log('Transcribing video:', videoUrl)

    // Transcribe audio from video URL
    const transcript = await assemblyai.transcripts.transcribe({
      audio: videoUrl
    })

    if (transcript.status === 'error') {
      console.error('Transcription error:', transcript.error)
      return NextResponse.json(
        { error: 'Transcription failed', details: transcript.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transcript: transcript.text || ''
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
