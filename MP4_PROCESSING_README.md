# MP4 Processing with Eye Contact Analysis
## Complete Implementation Guide

**Version:** 1.0  
**Last Updated:** January 13, 2026  
**Status:** Production Ready

---

## Overview

This implementation adds **MP4 video processing** with **parallel audio/video pipelines** to evaluate pharmaceutical sales pitches across **6 comprehensive metrics**:

### Text-Based Metrics (5) - From Transcript
1. **Usage of Keywords** - Pharmaceutical terminology
2. **Pronunciation** - Speech clarity
3. **Fluency** - Speech flow
4. **Objection Handling** - Addressing concerns
5. **Query Resolution** - Providing solutions

### Video-Based Metric (1) - From Visual Analysis
6. **Eye Contact** - Camera gaze tracking (NEW!)

---

## Architecture

### Parallel Processing Pipeline

```
MP4 Upload
 ├─▶ Audio Extraction (FFmpeg) ─▶ AssemblyAI ─▶ Transcript ─▶ Groq (5 metrics)
 │                                                                      │
 └─▶ Video Frames ─▶ MediaPipe Face Mesh ─▶ Eye Contact Analysis ──────┘
                                                                        │
                                                                        ▼
                                                              Aggregator (6 metrics)
                                                                        │
                                                                        ▼
                                                                    Frontend
```

### Key Features

✅ **No Refactoring** - Existing transcript pipeline unchanged  
✅ **Parallel Processing** - Audio and video analyzed simultaneously  
✅ **Deterministic** - Eye contact is quantitative, non-LLM-based  
✅ **Isolated** - Eye contact never goes to Groq (prevents hallucination)  
✅ **Aggregation** - Results merge only at final step

---

## Installation

### Prerequisites

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **FFmpeg** (Required for audio extraction)
   
   **Windows:**
   ```bash
   choco install ffmpeg
   ```
   
   **Mac:**
   ```bash
   brew install ffmpeg
   ```
   
   **Linux:**
   ```bash
   sudo apt-get install ffmpeg
   ```
   
   **Verify:**
   ```bash
   ffmpeg -version
   ```

3. **Python 3.11+** (Required for eye contact analysis)
   ```bash
   python3 --version
   ```

4. **Python Dependencies**
   ```bash
   pip install opencv-python mediapipe numpy
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

---

## File Structure

```
pitch-v6/
├── app/
│   └── api/
│       ├── extract-audio/          # NEW: Audio extraction endpoint
│       │   └── route.ts
│       ├── analyze-eye-contact/    # UPDATED: Enhanced eye contact
│       │   └── route.ts
│       └── evaluate-videos/        # UPDATED: 6-metric evaluation
│           └── route.ts
├── lib/
│   └── audio-extractor.ts          # NEW: FFmpeg audio extraction
├── scripts/
│   ├── analyze_eye_contact.py      # OLD: Basic eye contact
│   └── enhanced_eye_contact.py     # NEW: Advanced gaze + head pose
└── MP4_PROCESSING_IMPLEMENTATION_PLAN.md  # This guide
```

---

## API Endpoints

### 1. POST /api/extract-audio

Extract audio track from video file.

**Request:**
```typescript
const formData = new FormData()
formData.append('video', videoFile)

const response = await fetch('/api/extract-audio', {
  method: 'POST',
  body: formData
})

const audioBlob = await response.blob()
```

**Response Headers:**
```
Content-Type: audio/mpeg
X-Audio-Duration: 45.2
X-Audio-Sample-Rate: 16000
X-Audio-Channels: 1
X-Audio-Format: mp3
```

### 2. POST /api/analyze-eye-contact

Analyze eye contact from video using MediaPipe Face Mesh.

**Request:**
```typescript
const formData = new FormData()
formData.append('video', videoFile)

const response = await fetch('/api/analyze-eye-contact', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

**Response:**
```json
{
  "score": 72,
  "confidence": 0.93,
  "details": {
    "totalFrames": 360,
    "eyeContactFrames": 259,
    "faceDetectionRate": 0.95
  }
}
```

### 3. POST /api/evaluate-videos

Complete 6-metric evaluation (benchmark vs trainee).

**Request:**
```typescript
const formData = new FormData()
formData.append('videoAUrl', benchmarkVideoUrl)
formData.append('videoBUrl', traineeVideoUrl)

const response = await fetch('/api/evaluate-videos', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

**Response:**
```json
{
  "videoA": {
    "scores": {
      "usageOfKeywords": 88,
      "pronunciation": 92,
      "fluency": 90,
      "objectionHandling": 87,
      "queryResolution": 89,
      "eyeContact": 85
    },
    "transcript": "...",
    "eyeContactDetails": {
      "totalFrames": 360,
      "eyeContactFrames": 306,
      "faceDetectionRate": 0.96
    }
  },
  "videoB": {
    "scores": {
      "usageOfKeywords": 72,
      "pronunciation": 68,
      "fluency": 75,
      "objectionHandling": 70,
      "queryResolution": 73,
      "eyeContact": 62
    },
    "transcript": "...",
    "eyeContactDetails": {
      "totalFrames": 360,
      "eyeContactFrames": 223,
      "faceDetectionRate": 0.91
    }
  },
  "voiceBKeywords": ["medication", "treatment", "efficacy"],
  "differences": "Original pitch demonstrates excellent clarity...",
  "detailedNotes": [...],
  "comparison": {
    "overallDifference": -15,
    "strengths": ["Good pharmaceutical terminology", "Clear speech"],
    "improvements": ["Maintain more eye contact", "Improve fluency"]
  },
  "eyeContactAnalysis": {
    "videoA": {
      "score": 85,
      "feedback": "Excellent eye contact maintained throughout."
    },
    "videoB": {
      "score": 62,
      "feedback": "Good eye contact. Try to maintain gaze for longer periods."
    }
  }
}
```

---

## Eye Contact Analysis

### How It Works

The enhanced eye contact analyzer combines:

1. **Head Pose Estimation** (solvePnP)
   - Calculates yaw, pitch, roll from facial landmarks
   - Determines if head is facing camera (±20°)

2. **Iris Gaze Tracking** (MediaPipe)
   - Tracks iris position within eye
   - Calculates horizontal/vertical gaze angles (±15°)

3. **Combined Detection**
   - Eye contact = head centered AND gaze centered
   - Relaxed thresholds when head is very centered

### Scoring

```python
eye_contact_score = (eye_contact_frames / total_frames) * 100
```

**Interpretation:**
- **90-100**: Excellent (>85% eye contact)
- **70-89**: Good (70-85% eye contact)
- **50-69**: Average (50-70% eye contact)
- **30-49**: Below Average (30-50% eye contact)
- **0-29**: Poor (<30% eye contact)

### Confidence

```python
confidence = face_detection_rate
```

High confidence (>0.8) means face was detected in most frames.

---

## Usage Example

### Frontend Integration

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function VideoEvaluator() {
  const [benchmarkVideo, setBenchmarkVideo] = useState<File | null>(null)
  const [traineeVideo, setTraineeVideo] = useState<File | null>(null)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleEvaluate = async () => {
    if (!benchmarkVideo || !traineeVideo) return

    setLoading(true)

    try {
      // Upload videos to blob storage first
      const [benchmarkUrl, traineeUrl] = await Promise.all([
        uploadToBlob(benchmarkVideo),
        uploadToBlob(traineeVideo)
      ])

      // Evaluate
      const formData = new FormData()
      formData.append('videoAUrl', benchmarkUrl)
      formData.append('videoBUrl', traineeUrl)

      const response = await fetch('/api/evaluate-videos', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Evaluation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Benchmark Video</label>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => setBenchmarkVideo(e.target.files?.[0] || null)}
          />
        </div>
        <div>
          <label>Your Video</label>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => setTraineeVideo(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <Button onClick={handleEvaluate} disabled={loading}>
        {loading ? 'Evaluating...' : 'Evaluate Videos'}
      </Button>

      {results && (
        <div className="space-y-4">
          <h3>Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4>Benchmark</h4>
              <ul>
                <li>Keywords: {results.videoA.scores.usageOfKeywords}/100</li>
                <li>Pronunciation: {results.videoA.scores.pronunciation}/100</li>
                <li>Fluency: {results.videoA.scores.fluency}/100</li>
                <li>Objection: {results.videoA.scores.objectionHandling}/100</li>
                <li>Resolution: {results.videoA.scores.queryResolution}/100</li>
                <li>Eye Contact: {results.videoA.scores.eyeContact}/100</li>
              </ul>
            </div>
            <div>
              <h4>Your Pitch</h4>
              <ul>
                <li>Keywords: {results.videoB.scores.usageOfKeywords}/100</li>
                <li>Pronunciation: {results.videoB.scores.pronunciation}/100</li>
                <li>Fluency: {results.videoB.scores.fluency}/100</li>
                <li>Objection: {results.videoB.scores.objectionHandling}/100</li>
                <li>Resolution: {results.videoB.scores.queryResolution}/100</li>
                <li>Eye Contact: {results.videoB.scores.eyeContact}/100</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Performance

### Expected Latency (30-second video)

| Step | Duration | Notes |
|------|----------|-------|
| Audio extraction | ~300ms | FFmpeg binary |
| Transcription | ~10-15s | AssemblyAI (parallel) |
| Text evaluation | ~2-3s | Groq (parallel) |
| Eye contact | ~2-3s | 8 FPS sampling |
| **Total** | **~15-20s** | Parallel processing |

### Memory Usage

- Video buffer: ~10-50MB
- Audio buffer: ~1-2MB
- Frame processing: ~50-100MB peak
- **Total peak**: ~100-150MB per request

---

## Troubleshooting

### FFmpeg Not Found

```bash
# Check if FFmpeg is in PATH
ffmpeg -version

# If not found, install
# Windows: choco install ffmpeg
# Mac: brew install ffmpeg
# Linux: sudo apt-get install ffmpeg
```

### Python Dependencies Missing

```bash
pip install opencv-python mediapipe numpy
```

### Eye Contact Score Always Low

**Checklist:**
- ✅ Face is visible and well-lit
- ✅ Face occupies 30-40% of frame
- ✅ Camera is stable (not shaking)
- ✅ Subject looks directly at camera
- ✅ Good lighting (avoid backlighting)

### Transcription Fails

**Checklist:**
- ✅ ASSEMBLYAI_API_KEY is set
- ✅ Audio is clear in video
- ✅ Video contains speech (not silent)

---

## Deployment

### Vercel Configuration

```json
{
  "functions": {
    "app/api/evaluate-videos/route.ts": {
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

### Cost Estimates (1000 evaluations/month)

| Service | Free Tier | Cost |
|---------|-----------|------|
| AssemblyAI | 5 hrs/month | ~$12.50 |
| Groq | Unlimited | $0 |
| Vercel | 100GB-hrs | ~$0-20 |
| **Total** | | **~$12-33/month** |

---

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

1. Upload benchmark video
2. Upload trainee video
3. Click "Evaluate Videos"
4. Verify all 6 metrics are displayed
5. Check eye contact score is reasonable

---

## Next Steps

### Phase 2 (Future Enhancements)

- [ ] Speech-only segments (VAD gating)
- [ ] Eye contact during speaking time only
- [ ] Confidence weighting
- [ ] Video caching

### Phase 3

- [ ] Emotion alignment
- [ ] Per-section eye contact timeline
- [ ] Advanced gaze calibration

### Phase 4

- [ ] Real-time webcam ingestion
- [ ] On-device inference
- [ ] Coach feedback overlays

---

## Support

For issues or questions:
1. Check this documentation
2. Review `COMPLETE_WORKFLOW_DOCUMENTATION.md`
3. Check API logs in Vercel dashboard

---

## License

Private - Pharmaceutical Sales Training System

---

**Implementation Complete! 🎉**

The system now supports:
✅ MP4 video processing  
✅ Parallel audio/video pipelines  
✅ Eye contact analysis (6th metric)  
✅ Deterministic, non-LLM-based scoring  
✅ Production-ready deployment
