import { NextRequest, NextResponse } from 'next/server'
import { extractAudioFromVideo, checkFFmpegAvailable } from '@/lib/audio-extractor'

export const maxDuration = 60

/**
 * POST /api/extract-audio
 * Extract audio track from video file
 * 
 * Request: FormData with 'video' file
 * Response: Audio file (MP3) with metadata headers
 */
export async function POST(request: NextRequest) {
    try {
        // Check if FFmpeg is available
        const ffmpegAvailable = await checkFFmpegAvailable()
        if (!ffmpegAvailable) {
            return NextResponse.json(
                {
                    error: 'FFmpeg not found',
                    details: 'FFmpeg is required for audio extraction. Please install FFmpeg on the server.'
                },
                { status: 500 }
            )
        }

        const formData = await request.formData()
        const videoFile = formData.get('video') as File

        if (!videoFile) {
            return NextResponse.json(
                { error: 'Video file is required' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!videoFile.type.startsWith('video/')) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload a video file.' },
                { status: 400 }
            )
        }

        console.log(`[ExtractAudio] Processing video: ${videoFile.name} (${videoFile.size} bytes)`)

        // Convert to buffer
        const arrayBuffer = await videoFile.arrayBuffer()
        const videoBuffer = Buffer.from(arrayBuffer)

        // Extract audio
        const result = await extractAudioFromVideo(videoBuffer, {
            format: 'mp3',
            sampleRate: 16000,  // Optimal for speech recognition
            channels: 1,        // Mono for speech
            bitrate: '128k'
        })

        console.log(`[ExtractAudio] Audio extracted successfully: ${result.duration}s`)

        // Return audio file with metadata headers
        return new NextResponse(new Uint8Array(result.audioBuffer), {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': result.audioBuffer.length.toString(),
                'Content-Disposition': `attachment; filename="audio.${result.format}"`,
                'X-Audio-Duration': result.duration.toString(),
                'X-Audio-Sample-Rate': result.sampleRate.toString(),
                'X-Audio-Channels': result.channels.toString(),
                'X-Audio-Format': result.format
            }
        })
    } catch (error) {
        console.error('[ExtractAudio] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to extract audio',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/extract-audio
 * Check if audio extraction is available
 */
export async function GET() {
    try {
        const ffmpegAvailable = await checkFFmpegAvailable()

        if (ffmpegAvailable) {
            const { getFFmpegVersion } = await import('@/lib/audio-extractor')
            const version = await getFFmpegVersion()

            return NextResponse.json({
                available: true,
                ffmpegVersion: version,
                supportedFormats: ['mp3', 'wav'],
                defaultSampleRate: 16000,
                defaultChannels: 1
            })
        } else {
            return NextResponse.json({
                available: false,
                error: 'FFmpeg not found'
            })
        }
    } catch (error) {
        return NextResponse.json({
            available: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
