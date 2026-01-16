# MP4 Processing Implementation Plan
## Video-Based Sales Pitch Evaluation with Eye Contact Analysis

**Generated:** January 13, 2026  
**Version:** MVP 1.0  
**Status:** Implementation Ready

---

## Executive Summary

This document outlines the complete implementation of MP4 video processing for pharmaceutical sales pitch evaluation, adding **eye contact analysis** as a 6th metric alongside the existing 5 transcript-based metrics.

### Key Principles

✅ **Parallel Processing**: Audio and video pipelines run independently  
✅ **No Refactoring**: Existing transcript evaluation remains unchanged  
✅ **Deterministic**: Eye contact is quantitative, non-LLM-based  
✅ **Aggregation**: Results merge only at final step  
✅ **Phased Rollout**: MVP first, advanced features later

---

## 1. System Architecture

### High-Level Flow

```
MP4 Upload
 ├─▶ Audio Extraction ─▶ AssemblyAI ─▶ Transcript ─▶ Groq (5 metrics)
 │                                                          │
 └─▶ Video Frames ─▶ Face/Gaze Analysis ─▶ Eye Contact ────┘
                                                            │
                                                            ▼
                                                    Aggregator (6 metrics)
                                                            │
                                                            ▼
                                                        Frontend
```

### Processing Pipeline

```typescript
interface ProcessingPipeline {
  // PARALLEL STAGE 1: Audio Track
  audioExtraction: {
    input: MP4File
    tool: "FFmpeg"
    output: MP3Buffer
    duration: "~300ms"
  }
  
  // PARALLEL STAGE 2: Transcription
  transcription: {
    input: MP3Buffer
    service: "AssemblyAI"
    output: TranscriptText
    duration: "~10-15s"
  }
  
  // PARALLEL STAGE 3: Text Evaluation
  textEvaluation: {
    input: TranscriptText
    service: "Groq AI (Llama 3.3 70B)"
    output: {
      usageOfKeywords: number      // 0-100
      pronunciation: number         // 0-100
      fluency: number              // 0-100
      objectionHandling: number    // 0-100
      queryResolution: number      // 0-100
    }
    duration: "~2-3s"
  }
  
  // PARALLEL STAGE 4: Video Analysis
  videoAnalysis: {
    input: MP4File
    frameRate: "5-8 FPS sampling"
    service: "MediaPipe Face Mesh"
    output: {
      eyeContact: number           // 0-100
      confidence: number           // 0-1
      details: {
        totalFrames: number
        eyeContactFrames: number
        faceDetectionRate: number
      }
    }
    duration: "~2-3s per minute"
  }
  
  // AGGREGATION STAGE
  aggregation: {
    inputs: [textEvaluation.output, videoAnalysis.output]
    output: {
      scores: {
        usageOfKeywords: number
        pronunciation: number
        fluency: number
        objectionHandling: number
        queryResolution: number
        eyeContact: number         // NEW
      }
      transcript: string
      eyeContactDetails: object
      insights: string
      suggestions: string[]
    }
  }
}
```

---

## 2. Audio Extraction Implementation

### Technology Choice

**Selected:** FFmpeg binary (server-side)  
**Rationale:**
- Faster than ffmpeg.wasm (no WASM overhead)
- More reliable for production
- Already available on most deployment platforms
- Lower memory usage

### Implementation

```typescript
// lib/audio-extractor.ts

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execPromise = promisify(exec)

export interface AudioExtractionResult {
  audioBuffer: Buffer
  format: 'mp3'
  duration: number
  sampleRate: number
  channels: number
}

export async function extractAudioFromVideo(
  videoBuffer: Buffer,
  options: {
    format?: 'mp3' | 'wav'
    sampleRate?: number
    channels?: number
  } = {}
): Promise<AudioExtractionResult> {
  const { format = 'mp3', sampleRate = 16000, channels = 1 } = options
  
  const timestamp = Date.now()
  const videoPath = join(tmpdir(), `video-${timestamp}.mp4`)
  const audioPath = join(tmpdir(), `audio-${timestamp}.${format}`)
  
  try {
    // Write video to temp file
    await writeFile(videoPath, videoBuffer)
    
    // Extract audio using FFmpeg
    // -vn: no video
    // -acodec: audio codec
    // -ar: sample rate
    // -ac: audio channels
    const command = `ffmpeg -i "${videoPath}" -vn -acodec ${format === 'mp3' ? 'libmp3lame' : 'pcm_s16le'} -ar ${sampleRate} -ac ${channels} "${audioPath}"`
    
    await execPromise(command)
    
    // Read extracted audio
    const audioBuffer = await readFile(audioPath)
    
    // Get audio duration
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`)
    const duration = parseFloat(stdout.trim())
    
    return {
      audioBuffer,
      format,
      duration,
      sampleRate,
      channels
    }
  } finally {
    // Cleanup temp files
    await Promise.all([
      unlink(videoPath).catch(() => {}),
      unlink(audioPath).catch(() => {})
    ])
  }
}
```

### API Endpoint

```typescript
// app/api/extract-audio/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { extractAudioFromVideo } from '@/lib/audio-extractor'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    
    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      )
    }
    
    // Convert to buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    const videoBuffer = Buffer.from(arrayBuffer)
    
    // Extract audio
    const result = await extractAudioFromVideo(videoBuffer, {
      format: 'mp3',
      sampleRate: 16000,
      channels: 1
    })
    
    // Return audio file
    return new NextResponse(result.audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.length.toString(),
        'X-Audio-Duration': result.duration.toString(),
        'X-Audio-Sample-Rate': result.sampleRate.toString()
      }
    })
  } catch (error) {
    console.error('Audio extraction error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

---

## 3. Enhanced Eye Contact Analysis

### Operational Definition

> **Eye Contact Score** = Percentage of speaking time where the subject's gaze vector intersects the camera FOV within a tolerance angle (±15°)

### Feature Extraction

```python
# scripts/enhanced_eye_contact.py

import cv2
import mediapipe as mp
import numpy as np
import json
import sys

class EyeContactAnalyzer:
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # 3D model points for head pose estimation
        self.model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye left corner
            (225.0, 170.0, -135.0),      # Right eye right corner
            (-150.0, -150.0, -125.0),    # Left Mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ])
    
    def estimate_head_pose(self, landmarks, frame_shape):
        """
        Estimate head pose using solvePnP
        Returns: (yaw, pitch, roll) in degrees
        """
        h, w = frame_shape[:2]
        
        # 2D image points from landmarks
        image_points = np.array([
            (landmarks[1].x * w, landmarks[1].y * h),      # Nose tip
            (landmarks[152].x * w, landmarks[152].y * h),  # Chin
            (landmarks[33].x * w, landmarks[33].y * h),    # Left eye left corner
            (landmarks[263].x * w, landmarks[263].y * h),  # Right eye right corner
            (landmarks[61].x * w, landmarks[61].y * h),    # Left mouth corner
            (landmarks[291].x * w, landmarks[291].y * h)   # Right mouth corner
        ], dtype="double")
        
        # Camera matrix
        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype="double")
        
        # Distortion coefficients
        dist_coeffs = np.zeros((4, 1))
        
        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            self.model_points,
            image_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Extract Euler angles
        pose_matrix = cv2.hconcat((rotation_matrix, translation_vector))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(pose_matrix)
        
        pitch = euler_angles[0][0]
        yaw = euler_angles[1][0]
        roll = euler_angles[2][0]
        
        return yaw, pitch, roll
    
    def estimate_gaze_direction(self, landmarks, frame_shape):
        """
        Estimate gaze direction from iris positions
        Returns: (horizontal_angle, vertical_angle) in degrees
        """
        h, w = frame_shape[:2]
        
        # Get iris centers (MediaPipe refine_landmarks=True provides iris landmarks)
        left_iris = landmarks[468]
        right_iris = landmarks[473]
        
        # Get eye corners for reference
        left_eye_left = landmarks[33]
        left_eye_right = landmarks[133]
        right_eye_left = landmarks[362]
        right_eye_right = landmarks[263]
        
        # Calculate iris position relative to eye corners
        # Left eye
        left_eye_width = abs(left_eye_right.x - left_eye_left.x)
        left_iris_offset = (left_iris.x - left_eye_left.x) / left_eye_width if left_eye_width > 0 else 0.5
        
        # Right eye
        right_eye_width = abs(right_eye_right.x - right_eye_left.x)
        right_iris_offset = (right_iris.x - right_eye_left.x) / right_eye_width if right_eye_width > 0 else 0.5
        
        # Average iris offset (0.5 = center, <0.5 = looking left, >0.5 = looking right)
        avg_horizontal_offset = (left_iris_offset + right_iris_offset) / 2
        
        # Convert to angle (approximate)
        # Assuming ±30° range for full eye movement
        horizontal_angle = (avg_horizontal_offset - 0.5) * 60
        
        # Vertical gaze (simplified)
        avg_iris_y = (left_iris.y + right_iris.y) / 2
        avg_eye_center_y = (left_eye_left.y + left_eye_right.y + right_eye_left.y + right_eye_right.y) / 4
        vertical_offset = (avg_iris_y - avg_eye_center_y) * h
        vertical_angle = vertical_offset * 0.5  # Approximate conversion
        
        return horizontal_angle, vertical_angle
    
    def is_looking_at_camera(self, yaw, pitch, gaze_h, gaze_v, thresholds):
        """
        Determine if person is looking at camera
        """
        head_threshold = thresholds.get('head', 20)  # ±20° for head pose
        gaze_threshold = thresholds.get('gaze', 15)  # ±15° for gaze
        
        # Check head pose
        head_centered = abs(yaw) < head_threshold and abs(pitch) < head_threshold
        
        # Check gaze direction
        gaze_centered = abs(gaze_h) < gaze_threshold and abs(gaze_v) < gaze_threshold
        
        # Both conditions should be met
        return head_centered and gaze_centered
    
    def analyze_video(self, video_path, sample_fps=8):
        """
        Analyze video for eye contact
        Returns: score (0-100) and detailed metrics
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "error": "Failed to open video",
                "score": 0,
                "confidence": 0,
                "details": {
                    "totalFrames": 0,
                    "eyeContactFrames": 0,
                    "faceDetectionRate": 0
                }
            }
        
        # Get video FPS
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        frame_skip = max(1, int(video_fps / sample_fps))
        
        total_frames = 0
        face_detected_frames = 0
        eye_contact_frames = 0
        frame_count = 0
        
        thresholds = {
            'head': 20,  # Head pose tolerance
            'gaze': 15   # Gaze tolerance
        }
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            if frame_count % frame_skip != 0:
                continue
            
            total_frames += 1
            
            # Convert to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process frame
            results = self.face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                face_detected_frames += 1
                landmarks = results.multi_face_landmarks[0].landmark
                
                # Estimate head pose
                yaw, pitch, roll = self.estimate_head_pose(landmarks, frame.shape)
                
                # Estimate gaze direction
                gaze_h, gaze_v = self.estimate_gaze_direction(landmarks, frame.shape)
                
                # Check if looking at camera
                if self.is_looking_at_camera(yaw, pitch, gaze_h, gaze_v, thresholds):
                    eye_contact_frames += 1
        
        cap.release()
        self.face_mesh.close()
        
        # Calculate metrics
        if total_frames == 0:
            return {
                "error": "No frames processed",
                "score": 0,
                "confidence": 0,
                "details": {
                    "totalFrames": 0,
                    "eyeContactFrames": 0,
                    "faceDetectionRate": 0
                }
            }
        
        face_detection_rate = face_detected_frames / total_frames
        eye_contact_ratio = eye_contact_frames / total_frames
        eye_contact_score = int(eye_contact_ratio * 100)
        
        # Confidence based on face detection rate
        confidence = min(face_detection_rate, 1.0)
        
        return {
            "score": eye_contact_score,
            "confidence": round(confidence, 2),
            "details": {
                "totalFrames": total_frames,
                "eyeContactFrames": eye_contact_frames,
                "faceDetectionRate": round(face_detection_rate, 2)
            }
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video path required"}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    try:
        analyzer = EyeContactAnalyzer()
        result = analyzer.analyze_video(video_path, sample_fps=8)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "error": f"Analysis failed: {str(e)}",
            "score": 0,
            "confidence": 0,
            "details": {
                "totalFrames": 0,
                "eyeContactFrames": 0,
                "faceDetectionRate": 0
            }
        }))
        sys.exit(1)
```

---

## 4. Complete Evaluation Pipeline

### Unified Evaluation Endpoint

```typescript
// app/api/evaluate-mp4/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { extractAudioFromVideo } from '@/lib/audio-extractor'
import { AssemblyAI } from 'assemblyai'
import Groq from 'groq-sdk'
import { analyzeEyeContactPython } from '@/lib/eye-contact-analyzer'

export const maxDuration = 300

const assemblyai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY || '' })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

interface EvaluationResult {
  scores: {
    usageOfKeywords: number
    pronunciation: number
    fluency: number
    objectionHandling: number
    queryResolution: number
    eyeContact: number
  }
  transcript: string
  eyeContactDetails: {
    totalFrames: number
    eyeContactFrames: number
    faceDetectionRate: number
    confidence: number
  }
  insights: string
  suggestions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    
    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      )
    }
    
    // Convert to buffer
    const arrayBuffer = await videoFile.arrayBuffer()
    const videoBuffer = Buffer.from(arrayBuffer)
    
    // PARALLEL PROCESSING
    const [audioResult, eyeContactResult] = await Promise.all([
      // Pipeline 1: Audio → Transcript → Text Evaluation
      (async () => {
        // Step 1: Extract audio
        const audio = await extractAudioFromVideo(videoBuffer)
        
        // Step 2: Transcribe
        const uploadUrl = await assemblyai.files.upload(audio.audioBuffer)
        const transcript = await assemblyai.transcripts.transcribe({
          audio: uploadUrl,
          language_code: 'en'
        })
        
        if (transcript.status === 'error') {
          throw new Error(transcript.error || 'Transcription failed')
        }
        
        // Step 3: Evaluate transcript
        const scores = await evaluateTranscript(transcript.text || '')
        
        return {
          transcript: transcript.text || '',
          scores
        }
      })(),
      
      // Pipeline 2: Video → Eye Contact Analysis
      analyzeEyeContactPython(videoBuffer)
    ])
    
    // AGGREGATION
    const result: EvaluationResult = {
      scores: {
        ...audioResult.scores,
        eyeContact: eyeContactResult.score
      },
      transcript: audioResult.transcript,
      eyeContactDetails: {
        ...eyeContactResult.details,
        confidence: eyeContactResult.confidence
      },
      insights: await generateInsights(audioResult.transcript, audioResult.scores, eyeContactResult.score),
      suggestions: await generateSuggestions(audioResult.scores, eyeContactResult.score)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to evaluate video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function evaluateTranscript(transcript: string) {
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
  "queryResolution": <number 0-100>
}`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 1024
  })

  const responseText = completion.choices[0]?.message?.content || '{}'
  let cleanedResponse = responseText.trim()
  
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
  }
  
  const parsed = JSON.parse(cleanedResponse)
  
  return {
    usageOfKeywords: Math.round(parsed.usageOfKeywords || 0),
    pronunciation: Math.round(parsed.pronunciation || 0),
    fluency: Math.round(parsed.fluency || 0),
    objectionHandling: Math.round(parsed.objectionHandling || 0),
    queryResolution: Math.round(parsed.queryResolution || 0)
  }
}

async function generateInsights(transcript: string, scores: any, eyeContact: number): Promise<string> {
  const avgScore = (scores.usageOfKeywords + scores.pronunciation + scores.fluency + scores.objectionHandling + scores.queryResolution + eyeContact) / 6
  
  if (avgScore >= 80) {
    return `Excellent performance! Your pitch demonstrates strong pharmaceutical knowledge, clear communication, and professional delivery. Eye contact score of ${eyeContact}% shows good camera engagement.`
  } else if (avgScore >= 60) {
    return `Good performance with room for improvement. Focus on strengthening your pharmaceutical terminology and maintaining consistent eye contact (current: ${eyeContact}%).`
  } else {
    return `Your pitch needs improvement in several areas. Practice using more pharmaceutical terminology, improve speech fluency, and work on maintaining eye contact with the camera (current: ${eyeContact}%).`
  }
}

async function generateSuggestions(scores: any, eyeContact: number): Promise<string[]> {
  const suggestions: string[] = []
  
  if (scores.usageOfKeywords < 70) {
    suggestions.push('Incorporate more pharmaceutical terminology and medical keywords')
  }
  if (scores.fluency < 70) {
    suggestions.push('Practice smoother transitions between ideas')
  }
  if (scores.objectionHandling < 70) {
    suggestions.push('Address potential customer concerns proactively')
  }
  if (eyeContact < 60) {
    suggestions.push('Maintain more consistent eye contact with the camera')
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Continue practicing to maintain your excellent performance')
  }
  
  return suggestions
}
```

---

## 5. Frontend Updates

### Video Input Component

```typescript
// components/video-input.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Video } from 'lucide-react'

interface VideoInputProps {
  onVideoSelect: (file: File) => void
  label: string
}

export function VideoInput({ onVideoSelect, label }: VideoInputProps) {
  const [preview, setPreview] = useState<string | null>(null)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onVideoSelect(file)
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }
  
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">{label}</label>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        {preview ? (
          <video
            src={preview}
            controls
            className="w-full max-h-64 rounded-lg"
          />
        ) : (
          <div className="space-y-2">
            <Video className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-600">
              Upload MP4, WebM, or MOV file
            </p>
          </div>
        )}
        
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
          id={`video-input-${label}`}
        />
        
        <Button
          onClick={() => document.getElementById(`video-input-${label}`)?.click()}
          className="mt-4"
        >
          <Upload className="mr-2 h-4 w-4" />
          {preview ? 'Change Video' : 'Upload Video'}
        </Button>
      </div>
    </div>
  )
}
```

### 6-Metric Chart Component

```typescript
// components/six-metric-chart.tsx

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface SixMetricChartProps {
  scores: {
    usageOfKeywords: number
    pronunciation: number
    fluency: number
    objectionHandling: number
    queryResolution: number
    eyeContact: number
  }
  benchmarkScores?: {
    usageOfKeywords: number
    pronunciation: number
    fluency: number
    objectionHandling: number
    queryResolution: number
    eyeContact: number
  }
}

export function SixMetricChart({ scores, benchmarkScores }: SixMetricChartProps) {
  const data = [
    {
      metric: 'Keywords',
      'Your Score': scores.usageOfKeywords,
      'Benchmark': benchmarkScores?.usageOfKeywords || 0
    },
    {
      metric: 'Pronunciation',
      'Your Score': scores.pronunciation,
      'Benchmark': benchmarkScores?.pronunciation || 0
    },
    {
      metric: 'Fluency',
      'Your Score': scores.fluency,
      'Benchmark': benchmarkScores?.fluency || 0
    },
    {
      metric: 'Objection',
      'Your Score': scores.objectionHandling,
      'Benchmark': benchmarkScores?.objectionHandling || 0
    },
    {
      metric: 'Resolution',
      'Your Score': scores.queryResolution,
      'Benchmark': benchmarkScores?.queryResolution || 0
    },
    {
      metric: 'Eye Contact',
      'Your Score': scores.eyeContact,
      'Benchmark': benchmarkScores?.eyeContact || 0
    }
  ]
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="metric" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <ReferenceLine y={70} stroke="#fbbf24" strokeDasharray="3 3" label="Target" />
        <Bar dataKey="Your Score" fill="#3b82f6" />
        {benchmarkScores && <Bar dataKey="Benchmark" fill="#10b981" />}
      </BarChart>
    </ResponsiveContainer>
  )
}
```

---

## 6. Deployment Considerations

### Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/evaluate-mp4/route.ts": {
      "maxDuration": 300
    },
    "app/api/analyze-eye-contact/route.ts": {
      "maxDuration": 60
    },
    "app/api/extract-audio/route.ts": {
      "maxDuration": 60
    }
  },
  "build": {
    "env": {
      "PYTHON_VERSION": "3.11"
    }
  }
}
```

### Environment Variables

```env
# Required
ASSEMBLYAI_API_KEY=xxxxx
GROQ_API_KEY=gsk_xxxxx

# Optional
FFMPEG_PATH=/usr/bin/ffmpeg
PYTHON_PATH=/usr/bin/python3
```

### Cost Estimates

| Service | Free Tier | Cost per Request | Monthly Estimate (1000 evals) |
|---------|-----------|------------------|-------------------------------|
| AssemblyAI | 5 hrs/month | $0.00025/sec | ~$12.50 (50 hrs) |
| Groq | Free | $0 | $0 |
| Vercel | 100GB-hrs | Varies | ~$0-20 |
| **Total** | | | **~$12-33/month** |

---

## 7. Phased Rollout

### MVP (Week 1) ✅

- [x] MP4 upload support
- [x] Audio extraction (FFmpeg)
- [x] Eye contact analysis (MediaPipe)
- [x] 6-metric display
- [x] Parallel processing

### Phase 2 (Week 2-3)

- [ ] Speech-only segments (VAD gating)
- [ ] Eye contact during speaking time only
- [ ] Confidence weighting
- [ ] Caching for repeated videos

### Phase 3 (Week 4-6)

- [ ] Emotion alignment (face affect vs objection handling)
- [ ] Trainer vs benchmark gaze comparison
- [ ] Per-section eye contact timeline
- [ ] Advanced gaze calibration

### Phase 4 (Future)

- [ ] Real-time webcam ingestion
- [ ] On-device inference (TensorFlow.js)
- [ ] Coach feedback overlays
- [ ] Multi-person detection

---

## 8. Testing Strategy

### Unit Tests

```typescript
// __tests__/audio-extraction.test.ts
describe('Audio Extraction', () => {
  it('should extract MP3 from MP4', async () => {
    const videoBuffer = await readFile('test-video.mp4')
    const result = await extractAudioFromVideo(videoBuffer)
    expect(result.format).toBe('mp3')
    expect(result.duration).toBeGreaterThan(0)
  })
})

// __tests__/eye-contact.test.ts
describe('Eye Contact Analysis', () => {
  it('should return score between 0-100', async () => {
    const result = await analyzeEyeContact('test-video.mp4')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/full-pipeline.test.ts
describe('Full Evaluation Pipeline', () => {
  it('should process MP4 and return 6 metrics', async () => {
    const formData = new FormData()
    formData.append('video', testVideoFile)
    
    const response = await fetch('/api/evaluate-mp4', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    expect(result.scores).toHaveProperty('usageOfKeywords')
    expect(result.scores).toHaveProperty('pronunciation')
    expect(result.scores).toHaveProperty('fluency')
    expect(result.scores).toHaveProperty('objectionHandling')
    expect(result.scores).toHaveProperty('queryResolution')
    expect(result.scores).toHaveProperty('eyeContact')
  })
})
```

---

## 9. Performance Benchmarks

### Expected Latency

| Step | Duration | Optimization |
|------|----------|--------------|
| Audio extraction | 300ms | FFmpeg binary |
| Transcription | 10-15s | AssemblyAI (parallel) |
| Text evaluation | 2-3s | Groq (parallel) |
| Eye contact | 2-3s/min | 8 FPS sampling |
| **Total (30s video)** | **~15-20s** | Parallel processing |

### Memory Usage

- Video buffer: ~10-50MB (depending on quality)
- Audio buffer: ~1-2MB
- Frame processing: ~50-100MB peak
- **Total peak**: ~100-150MB per request

---

## 10. Troubleshooting Guide

### FFmpeg Not Found

```bash
# Windows
choco install ffmpeg

# Mac
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg

# Verify
ffmpeg -version
```

### Python Dependencies

```bash
pip install opencv-python mediapipe numpy
```

### Eye Contact Score Always Low

- Check lighting (face must be visible)
- Verify face occupies 30-40% of frame
- Ensure camera is stable
- Subject should look directly at camera

### Transcription Fails

- Verify ASSEMBLYAI_API_KEY is set
- Check audio is clear in video
- Ensure video contains speech

---

## Conclusion

This implementation provides a **robust, scalable, and cost-effective** solution for MP4-based sales pitch evaluation with eye contact analysis. The parallel processing architecture ensures fast response times, while the deterministic eye contact metric provides trustworthy, quantitative feedback.

**Key Success Factors:**
✅ No refactoring of existing transcript pipeline  
✅ Eye contact isolated and non-LLM-based  
✅ Parallel processing for optimal performance  
✅ Phased rollout for iterative improvement  
✅ Clear separation of concerns (audio vs video)

**Next Steps:**
1. Implement audio extraction utility
2. Enhance Python eye contact script
3. Create unified evaluation endpoint
4. Update frontend components
5. Deploy and test
