import { NextRequest, NextResponse } from "next/server"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import ffmpeg from "fluent-ffmpeg"

// Placeholder for MediaPipe integration
// In production, this would use MediaPipe Face Mesh for accurate gaze detection
// For now, we'll simulate eye contact analysis

interface EyeContactResult {
  score: number
  details: {
    totalFrames: number
    eyeContactFrames: number
    faceDetectionRate: number
  }
}

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

async function analyzeEyeContactSimulated(videoPath: string): Promise<EyeContactResult> {
  try {
    // Get video metadata
    const { duration, fps } = await extractVideoMetadata(videoPath)
    const totalFrames = Math.floor(duration * fps)

    // TODO: Implement actual MediaPipe Face Mesh analysis
    // This is a placeholder implementation that simulates eye contact detection
    // In production, you would:
    // 1. Extract frames from video using FFmpeg
    // 2. Process each frame with MediaPipe Face Mesh
    // 3. Calculate gaze direction using facial landmarks (468 points)
    // 4. Determine if person is looking at camera (forward gaze)
    // 5. Count frames with eye contact

    // Simulated analysis (replace with actual MediaPipe implementation)
    // For now, return a random score between 60-85 for testing
    const eyeContactFrames = Math.floor(totalFrames * (0.6 + Math.random() * 0.25))
    const score = Math.round((eyeContactFrames / totalFrames) * 100)

    return {
      score,
      details: {
        totalFrames,
        eyeContactFrames,
        faceDetectionRate: 0.95 // Simulated face detection rate
      }
    }
  } catch (error) {
    console.error('Eye contact analysis error:', error)
    throw error
  }
}

// Actual MediaPipe implementation (commented out - requires setup)
/*
import { FaceMesh } from '@mediapipe/face_mesh'
import { Camera } from '@mediapipe/camera_utils'

async function analyzeEyeContactMediaPipe(videoPath: string): Promise<EyeContactResult> {
  const faceMesh = new FaceMesh({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    }
  })

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  })

  let totalFrames = 0
  let eyeContactFrames = 0
  let facesDetected = 0

  faceMesh.onResults((results) => {
    totalFrames++
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      facesDetected++
      const landmarks = results.multiFaceLandmarks[0]
      
      // Eye landmarks indices
      const leftEye = landmarks[468] // Left iris center
      const rightEye = landmarks[473] // Right iris center
      const noseTip = landmarks[1]
      
      // Calculate gaze direction
      const gazeVector = {
        x: (leftEye.x + rightEye.x) / 2 - noseTip.x,
        y: (leftEye.y + rightEye.y) / 2 - noseTip.y,
        z: (leftEye.z + rightEye.z) / 2 - noseTip.z
      }
      
      // Check if looking at camera (forward gaze)
      // Forward gaze has minimal x and y deviation
      const isLookingAtCamera = Math.abs(gazeVector.x) < 0.1 && Math.abs(gazeVector.y) < 0.1
      
      if (isLookingAtCamera) {
        eyeContactFrames++
      }
    }
  })

  // Process video frames
  // ... (frame extraction and processing logic)

  const score = Math.round((eyeContactFrames / totalFrames) * 100)
  const faceDetectionRate = facesDetected / totalFrames

  return {
    score,
    details: {
      totalFrames,
      eyeContactFrames,
      faceDetectionRate
    }
  }
}
*/

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
    
    tempFilePath = join(tmpdir(), `video-${Date.now()}.${videoFile.name.split('.').pop()}`)
    await writeFile(tempFilePath, buffer)

    // Analyze eye contact
    const result = await analyzeEyeContactSimulated(tempFilePath)

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
      } catch (err) {
        console.error("Failed to delete temp file:", err)
      }
    }
  }
}
