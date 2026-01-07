# pitch-v6: Video Pitch Evaluator

Advanced pharmaceutical sales pitch evaluation system using video analysis with 6 comprehensive metrics including eye contact detection.

**Live Demo:** [https://pitch-v6.vercel.app](https://pitch-v6.vercel.app)

## Overview

pitch-v6 evaluates pharmaceutical sales pitch videos using a combination of:
- **5 Text-Based Metrics** (from audio transcription)
- **1 Video-Based Metric** (eye contact detection)

This provides a holistic evaluation of both verbal content and non-verbal presentation skills.

## Features

### 📊 6-Metric Evaluation System

**Text-Based Metrics (from transcript):**
1. **Usage of Keywords** - Medical/pharmaceutical terminology
2. **Pronunciation** - Speech clarity and articulation
3. **Fluency** - Speech flow and structure
4. **Objection Handling** - Addressing concerns effectively
5. **Query Resolution** - Providing clear solutions

**Video-Based Metric (NEW):**
6. **Eye Contact** - Gaze tracking and camera engagement (0-100%)

### 🎥 Video Processing

- **Resolution**: 480p (854×480) - Optimal for eye tracking
- **Duration**: 30-45 seconds
- **Formats**: MP4, WebM, MOV
- **Processing**: FFmpeg audio extraction + MediaPipe face detection

### 👀 Eye Contact Detection

Uses Google MediaPipe Face Mesh to:
- Track 468 facial landmarks in real-time
- Calculate gaze direction (looking at camera vs away)
- Measure eye contact percentage
- Detect natural breaks (avoiding staring)

**Scoring:**
- 90-100: Excellent (>85% eye contact)
- 70-89: Good (70-85% eye contact)
- 50-69: Average (50-70% eye contact)
- 30-49: Below Average (30-50% eye contact)
- 0-29: Poor (<30% eye contact)

### 📹 Recording Guidelines

Best practices for accurate evaluation:
- ✅ Position face close to camera (30-40% of frame)
- ✅ Ensure good lighting (avoid backlighting)
- ✅ Keep camera stable (use tripod if possible)
- ✅ Face camera directly (not at angle)
- ✅ Maintain natural eye contact (don't stare)
- ✅ Clean background (minimal distractions)
- ✅ Speak clearly into microphone

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **AssemblyAI** - Audio transcription
- **Groq AI** - Intelligent scoring
- **MediaPipe** - Face detection & eye tracking
- **FFmpeg** - Video processing
- **Recharts** - Data visualization

## Prerequisites

### 1. Node.js
```bash
node --version  # v18 or higher
```

### 2. FFmpeg (Required for video processing)

**Windows (via Chocolatey):**
```bash
choco install ffmpeg
```

**Mac (via Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

### 3. API Keys

- **AssemblyAI**: https://www.assemblyai.com/dashboard/signup (5 hours/month free)
- **Groq**: https://console.groq.com/keys (Free tier available)

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create environment variables**
   ```bash
   # Create .env.local file
   echo "ASSEMBLYAI_API_KEY=your_key_here" > .env.local
   echo "GROQ_API_KEY=your_key_here" >> .env.local
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   ```
   http://localhost:3000
   ```

## Usage

### Step 1: Upload Reference Video (VideoA)
- Click "Upload Video" in Box 1
- Select benchmark/expert pitch video
- Wait for processing (transcription + eye contact analysis)

### Step 2: Record/Upload Your Video (VideoB)
- Click "Record Video" or "Upload Video" in Box 2
- Record 30-45 second pitch (or upload pre-recorded)
- Follow on-screen recording guidelines
- Wait for processing

### Step 3: Evaluate
- Click "Evaluate Videos" button
- System compares both videos
- Results displayed in chart

### Step 4: Review Results
- See your scores (VideoB) across all 6 metrics
- Compare against benchmark (VideoA reference line)
- Read AI-generated insights and suggestions
- Download videos if needed (no cloud storage)

## API Endpoints

### POST /api/extract-audio
Extract audio track from video file

**Request:** FormData with `video` file  
**Response:** Audio buffer + metadata

### POST /api/transcribe-video
Convert video → audio → text

**Request:** FormData with `video` file  
**Response:** Transcript + duration + word count

### POST /api/analyze-eye-contact
Detect face and analyze eye gaze

**Request:** FormData with `video` file  
**Response:** Eye contact score + detailed metrics

### POST /api/evaluate-videos
Complete 6-metric evaluation

**Request:** FormData with `videoA` and `videoB` files  
**Response:** Scores, transcripts, comparison, insights

## Architecture

```
Video Upload/Recording
      ↓
FFmpeg Audio Extraction
      ↓
AssemblyAI Transcription
      ↓
Groq AI Scoring (5 metrics)
      ↓
MediaPipe Eye Analysis (1 metric)
      ↓
Combined 6-Metric Evaluation
      ↓
Results Display + Charts
```

## Environment Variables

```env
# Required
ASSEMBLYAI_API_KEY=xxxxx    # Speech-to-text transcription
GROQ_API_KEY=gsk_xxxxx      # AI-powered scoring

# Optional
NODE_ENV=production
FFMPEG_PATH=/usr/bin/ffmpeg  # Auto-detected if in PATH
MEDIAPIPE_MODEL_PATH=...     # CDN default used if not set
```

## File Size Limits

- **Max file size**: 50MB per video
- **Recommended**: 10-15MB (480p, 45 seconds)
- **Duration**: 30-45 seconds enforced
- **Resolution**: 480p recommended (360p minimum)

## Notes

- **No cloud storage**: Videos are processed and deleted after evaluation
- **Download only**: Users download videos locally
- **Single evaluation mode**: Always video-based (no T-T/A-A toggle)
- **480p optimal**: Best balance between file size and eye tracking accuracy
- **Server-side processing**: MediaPipe runs on server for consistent results

## Troubleshooting

### FFmpeg not found
```bash
# Check if FFmpeg is in PATH
ffmpeg -version

# If not found, install using package manager
# Windows: choco install ffmpeg
# Mac: brew install ffmpeg
# Linux: sudo apt-get install ffmpeg
```

### Video upload fails
- Check file size (<50MB)
- Verify format (.mp4, .webm, .mov)
- Ensure duration is 30-45 seconds

### Eye contact score seems wrong
- Verify face is visible and well-lit
- Check that face occupies 30-40% of frame
- Ensure camera is stable (not shaking)
- Face should be directly facing camera

### Transcription fails
- Check ASSEMBLYAI_API_KEY is set
- Verify audio is clear in video
- Ensure video contains speech (not silent)

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

Private - Pharmaceutical Sales Training System

## Support

For issues or questions, refer to the main project documentation: `COMPLETE_WORKFLOW_DOCUMENTATION.md`
