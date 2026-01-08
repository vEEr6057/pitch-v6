import { NextRequest, NextResponse } from "next/server"
import { writeFile, unlink, readdir, mkdir } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import ffmpeg from "fluent-ffmpeg"
import { createHash } from "crypto"

interface EyeContactResult {
  score: number
  details: {
    totalFrames: number
    eyeContactFrames: number
    faceDetectionRate: number
  }
}

// Extract video metadata
async function extractVideoMetadata(videoPath: string): Promise<{ duration: number; fps: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      // Extract FPS
      let fps = 30 // default
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/')
        fps = parseInt(num) / parseInt(den)
      }

      // Extract duration
      const duration = parseFloat(metadata.format.duration || '0')

      resolve({ duration, fps })
    })
  })
}

// Extract frames from video at specified intervals
async function extractFrames(videoPath: string, outputDir: string, framesPerSecond: number = 2): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=${framesPerSecond}`,
        '-frame_pts 1'
      ])
      .output(join(outputDir, 'frame-%04d.jpg'))
      .on('end', async () => {
        // Count extracted frames
        const files = await readdir(outputDir)
        const frameCount = files.filter(f => f.startsWith('frame-') && f.endsWith('.jpg')).length
        resolve(frameCount)
      })
      .on('error', (err) => reject(err))
      .run()
  })
}

// Analyze eye contact using frame-based heuristics
// NOTE: This is a PLACEHOLDER implementation
// For production, you need to implement actual computer vision:
// - Use TensorFlow.js with Face Landmarks Detection model
// - Use MediaPipe Face Mesh via WASM
// - Or call a Python service with OpenCV + MediaPipe
async function analyzeEyeContactFromFrames(framesDir: string, totalFrames: number): Promise<EyeContactResult> {
  try {
    const files = await readdir(framesDir)
    const frameFiles = files.filter(f => f.startsWith('frame-') && f.endsWith('.jpg'))
    
    // TODO: YOU MUST IMPLEMENT ACTUAL FACE DETECTION HERE
    // Example workflow:
    // 1. Load each frame image
    // 2. Detect face using face detection model
    // 3. Extract facial landmarks (especially eyes, nose, face orientation)
    // 4. Calculate gaze vector from landmark positions
    // 5. Determine if gaze is directed toward camera (threshold check)
    // 6. Count frames where eye contact is detected
    
    // Current placeholder: Just returns 70% as default
    // This will give same score to all videos - NOT REAL ANALYSIS
    const eyeContactFrames = Math.floor(totalFrames * 0.7)
    const score = Math.round((eyeContactFrames / totalFrames) * 100)

    console.log(`⚠️ PLACEHOLDER: Returning default 70% eye contact score`)
    console.log(`Total frames analyzed: ${totalFrames}`)
    console.log(`Eye contact frames (placeholder): ${eyeContactFrames}`)

    return {
      score,
      details: {
        totalFrames,
        eyeContactFrames,
        faceDetectionRate: 0.95 // Placeholder
      }
    }
  } catch (error) {
    console.error('Frame analysis error:', error)
    throw error
  }
}

export const maxDuration = 60

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null
  let framesDir: string | null = null

  try {
    const formData = await request.formData()
    const videoFile = formData.get("video") as File

    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a video file." },
        { status: 400 }
      )
    }

    // Save video to temp file
    const bytes = await videoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const timestamp = Date.now()
    const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8)
    tempFilePath = join(tmpdir(), `video-${timestamp}-${hash}.${videoFile.name.split('.').pop()}`)
    framesDir = join(tmpdir(), `frames-${timestamp}-${hash}`)
    
    await writeFile(tempFilePath, buffer)
    await mkdir(framesDir, { recursive: true })

    console.log(`Processing video: ${tempFilePath}`)

    // Get video metadata
    const { duration, fps } = await extractVideoMetadata(tempFilePath)
    console.log(`Video metadata: duration=${duration}s, fps=${fps}`)

    // Extract frames (2 per second for analysis)
    console.log(`Extracting frames to: ${framesDir}`)
    const frameCount = await extractFrames(tempFilePath, framesDir, 2)
    console.log(`Extracted ${frameCount} frames`)

    // Analyze eye contact from frames
    const result = await analyzeEyeContactFromFrames(framesDir, frameCount)
    
    console.log(`Eye contact analysis complete: score=${result.score}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Eye contact analysis error:", error)
    return NextResponse.json(
      { 
        error: "Failed to analyze eye contact",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch (err) {
        console.error("Failed to delete temp video file:", err)
      }
    }
    
    if (framesDir) {
      try {
        const files = await readdir(framesDir).catch(() => [])
        await Promise.all(files.map(f => unlink(join(framesDir!, f)).catch(() => {})))
        await import('fs').then(fs => fs.promises.rmdir(framesDir!).catch(() => {}))
      } catch (err) {
        console.error("Failed to delete frames directory:", err)
      }
    }
  }
}
