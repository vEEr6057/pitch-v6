# Quick Start: Testing MP4 Processing

This guide will help you quickly test the new MP4 processing pipeline with eye contact analysis.

---

## Prerequisites Check

Run these commands to verify your environment:

```bash
# 1. Check Node.js
node --version
# Expected: v18.0.0 or higher

# 2. Check FFmpeg
ffmpeg -version
# Expected: ffmpeg version 4.x or higher

# 3. Check Python
python3 --version
# Expected: Python 3.11.0 or higher

# 4. Check Python dependencies
python3 -c "import cv2, mediapipe, numpy; print('All dependencies installed!')"
# Expected: All dependencies installed!
```

If any checks fail, install the missing components:

```bash
# Install FFmpeg
# Windows: choco install ffmpeg
# Mac: brew install ffmpeg
# Linux: sudo apt-get install ffmpeg

# Install Python dependencies
pip install opencv-python mediapipe numpy
```

---

## Step 1: Install Dependencies

```bash
cd pitch-v6
npm install
```

---

## Step 2: Configure Environment

Create `.env.local` file:

```env
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
GROQ_API_KEY=your_groq_key_here
```

Get API keys:
- AssemblyAI: https://www.assemblyai.com/dashboard/signup
- Groq: https://console.groq.com/keys

---

## Step 3: Test Audio Extraction

```bash
# Start dev server
npm run dev
```

Open another terminal and test:

```bash
# Test if FFmpeg is available
curl http://localhost:3000/api/extract-audio
```

Expected response:
```json
{
  "available": true,
  "ffmpegVersion": "4.4.2",
  "supportedFormats": ["mp3", "wav"],
  "defaultSampleRate": 16000,
  "defaultChannels": 1
}
```

---

## Step 4: Test Eye Contact Analysis

Create a test script `test-eye-contact.py`:

```python
#!/usr/bin/env python3
import sys
sys.path.append('scripts')
from enhanced_eye_contact import EyeContactAnalyzer

# Test with a sample video
analyzer = EyeContactAnalyzer()
result = analyzer.analyze_video('path/to/test-video.mp4', sample_fps=8)
print(result)
```

Run:
```bash
python3 test-eye-contact.py
```

Expected output:
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

---

## Step 5: Test Full Pipeline

### Option A: Using curl

```bash
# Extract audio from video
curl -X POST http://localhost:3000/api/extract-audio \
  -F "video=@test-video.mp4" \
  -o extracted-audio.mp3

# Analyze eye contact
curl -X POST http://localhost:3000/api/analyze-eye-contact \
  -F "video=@test-video.mp4" \
  | jq
```

### Option B: Using the Web UI

1. Open http://localhost:3000
2. Upload benchmark video (Box 1)
3. Upload trainee video (Box 2)
4. Click "Evaluate Videos"
5. View results with all 6 metrics

---

## Step 6: Verify Results

Check that you see:

✅ **5 Text-Based Metrics:**
- Usage of Keywords
- Pronunciation
- Fluency
- Objection Handling
- Query Resolution

✅ **1 Video-Based Metric:**
- Eye Contact (NEW!)

✅ **Additional Data:**
- Transcript
- Eye contact details (frames, detection rate)
- Insights and suggestions

---

## Common Issues

### Issue: FFmpeg not found

**Solution:**
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

### Issue: Python script fails

**Solution:**
```bash
# Install dependencies
pip install opencv-python mediapipe numpy

# Test Python script directly
python3 scripts/enhanced_eye_contact.py test-video.mp4
```

### Issue: Eye contact score is 0

**Possible causes:**
- Face not visible in video
- Poor lighting
- Face too small in frame
- Video resolution too low

**Solution:**
- Ensure face occupies 30-40% of frame
- Use good lighting
- Record at 480p or higher

### Issue: Transcription fails

**Solution:**
- Check ASSEMBLYAI_API_KEY is set
- Verify video has clear audio
- Check API quota (5 hours/month free)

---

## Performance Benchmarks

Test with a 30-second video:

| Step | Expected Time |
|------|---------------|
| Audio extraction | < 1 second |
| Transcription | 10-15 seconds |
| Text evaluation | 2-3 seconds |
| Eye contact | 2-3 seconds |
| **Total** | **15-20 seconds** |

---

## Next Steps

Once testing is complete:

1. ✅ Verify all 6 metrics work
2. ✅ Test with different video qualities
3. ✅ Test with different lighting conditions
4. ✅ Deploy to Vercel
5. ✅ Monitor performance in production

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel
- [ ] FFmpeg available on deployment platform
- [ ] Python 3.11+ available
- [ ] Python dependencies installed
- [ ] API keys valid and have quota
- [ ] Function timeouts configured (300s for evaluate-videos)
- [ ] Test with production videos

---

## Support

If you encounter issues:

1. Check the logs: `npm run dev` (terminal output)
2. Review `MP4_PROCESSING_README.md`
3. Check `MP4_PROCESSING_IMPLEMENTATION_PLAN.md`
4. Verify environment variables
5. Test each component individually

---

**Happy Testing! 🚀**
