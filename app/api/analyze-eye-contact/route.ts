import { NextRequest, NextResponse } from "next/server"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { exec } from "child_process"
import { promisify } from "util"
import { createHash } from "crypto"

const execPromise = promisify(exec)

interface EyeContactResult {
  score: number
  details: {
    totalFrames: number
    eyeContactFrames: number
    faceDetectionRate: number
  }
}

async function analyzeEyeContactPython(videoPath: string): Promise<EyeContactResult> {
  try {
    // Get the path to Python script (enhanced version with head pose + gaze)
    const scriptPath = join(process.cwd(), 'scripts', 'enhanced_eye_contact.py')

    console.log(`Running Python eye contact analysis: ${scriptPath}`)
    console.log(`Video path: ${videoPath}`)

    // Execute Python script
    const { stdout, stderr } = await execPromise(`python3 "${scriptPath}" "${videoPath}"`)

    if (stderr) {
      console.error('Python stderr:', stderr)
    }

    console.log('Python stdout:', stdout)

    // Parse JSON output from Python
    const result = JSON.parse(stdout.trim())

    if (result.error) {
      throw new Error(result.error)
    }

    return {
      score: result.score || 0,
      details: result.details || {
        totalFrames: 0,
        eyeContactFrames: 0,
        faceDetectionRate: 0
      }
    }
  } catch (error) {
    console.error('Python analysis error:', error)
    throw error
  }
}

export const maxDuration = 60

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

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
    const extension = videoFile.name.split('.').pop() || 'webm'
    tempFilePath = join(tmpdir(), `video-${timestamp}-${hash}.${extension}`)

    await writeFile(tempFilePath, buffer)

    console.log(`Video saved to: ${tempFilePath}`)
    console.log(`File size: ${buffer.length} bytes`)

    // Run Python analysis
    const result = await analyzeEyeContactPython(tempFilePath)

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
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
        console.log(`Cleaned up temp file: ${tempFilePath}`)
      } catch (err) {
        console.error("Failed to delete temp file:", err)
      }
    }
  }
}
