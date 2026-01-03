# pitch-v6 Testing Guide

## ✅ Pre-Testing Checklist

Before testing the application, verify all prerequisites:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] FFmpeg installed (`ffmpeg -version`)
- [ ] Dependencies installed (`npm install` completed)
- [ ] Environment variables configured (`.env.local` file created)
- [ ] Development server started (`npm run dev`)

## 🧪 Test Scenarios

### Test 1: Basic Video Upload (VideoA)

**Steps:**
1. Open http://localhost:3000
2. Click "Click to upload reference video" in Video A section
3. Select a test video file (MP4/WebM/MOV, 30-45s, <50MB)
4. Wait for upload completion

**Expected Results:**
- ✅ File uploads successfully
- ✅ Status changes to "Ready" (green checkmark)
- ✅ Video preview displays correctly
- ✅ File name and size shown below video

**Common Issues:**
- ❌ "Please upload a valid video file" → Check file format
- ❌ "Video file is too large" → Reduce file size or use shorter clip
- ❌ Video doesn't play → Browser codec issue, try different format

### Test 2: Video Recording (VideoB)

**Steps:**
1. Click "Record Video (45s max)" in Video B section
2. Allow camera and microphone permissions
3. Observe recording guidelines overlay
4. Start speaking (pharmaceutical pitch)
5. Click "Stop Recording" (or wait 45 seconds)

**Expected Results:**
- ✅ Camera permission prompt appears
- ✅ Recording guidelines display
- ✅ Video preview shows mirrored camera feed
- ✅ Recording stops automatically at 45 seconds
- ✅ Recorded video displays in player
- ✅ Status changes to "Ready"

**Common Issues:**
- ❌ "Failed to access camera/microphone" → Check browser permissions
- ❌ Recording doesn't start → Try different browser (Chrome recommended)
- ❌ No audio in recording → Check microphone settings

### Test 3: Manual Video Upload (VideoB)

**Steps:**
1. Click "Upload Video" button in Video B section
2. Select test video file
3. Wait for upload completion

**Expected Results:**
- ✅ File uploads successfully
- ✅ Video preview displays
- ✅ Status shows "Ready"

### Test 4: Complete Evaluation

**Steps:**
1. Upload both Video A and Video B (or record Video B)
2. Wait for both videos to show "Ready" status
3. Click "Evaluate Videos" button
4. Wait 30-60 seconds for processing

**Expected Results:**
- ✅ Button shows "Evaluating... (30-60s)" with loading spinner
- ✅ Progress messages in console (optional: open DevTools)
- ✅ Evaluation completes successfully
- ✅ Results section displays with:
  - 6-metric bar chart (Keywords, Delivery, Fluency, Addressing, Solution, Eye Contact)
  - Individual metric breakdowns (score/100 + progress bar)
  - Eye Contact Analysis section
  - Strengths (green box) with 3 bullet points
  - Areas to Improve (amber box) with 3 bullet points
  - Video A transcript
  - Video B transcript

**Expected Score Ranges:**
- Keywords: 40-90 (depends on medical terminology usage)
- Delivery: 50-85 (pronunciation quality)
- Fluency: 50-90 (speech flow)
- Addressing: 40-80 (objection handling)
- Solution: 45-85 (query resolution)
- Eye Contact: 60-85 (simulated, random for now)

**Common Issues:**
- ❌ "Please upload both videos" → Ensure both videos are uploaded
- ❌ "Failed to evaluate videos" → Check API keys in `.env.local`
- ❌ Transcription failed → Check AssemblyAI API key, verify video has audio
- ❌ Scores all 0 → Check Groq API key
- ❌ Long processing time (>2 minutes) → Network issue or API rate limit

### Test 5: Clear and Re-test

**Steps:**
1. After viewing results, click "Clear" on Video A
2. Verify Video A is removed
3. Click "Clear" on Video B
4. Verify Video B is removed and results disappear
5. Upload new videos and re-evaluate

**Expected Results:**
- ✅ Clear button removes video
- ✅ File input resets
- ✅ Results section disappears
- ✅ Can upload new videos immediately

### Test 6: Error Handling

**Test 6a: Missing API Keys**
1. Remove API keys from `.env.local`
2. Restart server
3. Try evaluation

**Expected:** Error message about API configuration

**Test 6b: Invalid File Type**
1. Try uploading an image or audio file

**Expected:** "Please upload a valid video file" error

**Test 6c: File Too Large**
1. Try uploading video >50MB

**Expected:** "Video file is too large (max 50MB)" error

**Test 6d: No Audio Track**
1. Upload video without audio

**Expected:** Transcription fails gracefully with error message

## 🔍 API Endpoint Testing

### Test `/api/analyze-eye-contact`

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/analyze-eye-contact \
  -F "video=@test-video.mp4"
```

**Expected Response:**
```json
{
  "score": 75,
  "details": {
    "totalFrames": 1200,
    "eyeContactFrames": 900,
    "faceDetectionRate": 0.95
  }
}
```

### Test `/api/evaluate-videos`

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/evaluate-videos \
  -F "videoA=@benchmark.mp4" \
  -F "videoB=@user-pitch.mp4"
```

**Expected Response:**
```json
{
  "videoA": {
    "scores": { ... },
    "transcript": "...",
    "eyeContactDetails": { ... }
  },
  "videoB": {
    "scores": { ... },
    "transcript": "...",
    "eyeContactDetails": { ... }
  },
  "comparison": {
    "overallDifference": 5,
    "strengths": [...],
    "improvements": [...]
  },
  "eyeContactAnalysis": { ... }
}
```

## 📊 Manual Verification

### Verify Transcription Quality
1. After evaluation, read Video B transcript
2. Compare with what was actually said in video
3. Check accuracy (should be >95% for clear audio)

### Verify Metric Consistency
1. Evaluate same video twice
2. Scores should be similar (±5 points)
3. Eye contact score will vary (simulation mode)

### Verify Comparison Logic
1. Upload excellent benchmark video (Video A)
2. Upload poor quality video (Video B)
3. Video B scores should be lower
4. "Improvements" section should have actionable feedback

### Verify Chart Display
1. Check all 6 metrics display correctly
2. Verify both bars (Your Pitch + Benchmark) show
3. Check labels are readable
4. Hover tooltips work

## 🐛 Known Issues & Workarounds

### Issue: Eye Contact Score Always Similar
**Reason:** MediaPipe integration is simulated (placeholder)  
**Workaround:** Scores will be random 60-85 for testing  
**Status:** Real MediaPipe implementation pending

### Issue: FFmpeg Not Found
**Reason:** FFmpeg not in system PATH  
**Fix:** 
```bash
# Windows
choco install ffmpeg

# Mac
brew install ffmpeg

# Restart terminal/IDE after installation
```

### Issue: CORS Errors in Console
**Reason:** Internal API calls during development  
**Fix:** Ignore or set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`

### Issue: Slow Transcription
**Reason:** Video file size or AssemblyAI processing  
**Workaround:** Use shorter videos (30-45s) and compress to <10MB

### Issue: npm Vulnerabilities Warning
**Reason:** fluent-ffmpeg package deprecated  
**Status:** Warning only, functionality works  
**Action:** Can be ignored for development

## ✅ Success Criteria

For a complete successful test:

1. **Video Upload**
   - [ ] Video A uploads without errors
   - [ ] Video B uploads/records without errors
   - [ ] Both videos display in players

2. **Evaluation Process**
   - [ ] Evaluation button triggers processing
   - [ ] Processing completes in 30-90 seconds
   - [ ] No errors in browser console
   - [ ] No errors in terminal/server logs

3. **Results Display**
   - [ ] Chart renders with 6 metrics
   - [ ] All scores are 0-100 range
   - [ ] Eye Contact Analysis section shows
   - [ ] Strengths and Improvements populated
   - [ ] Both transcripts display correctly

4. **User Experience**
   - [ ] No page crashes or freezes
   - [ ] Clear button works correctly
   - [ ] Can re-evaluate with new videos
   - [ ] Error messages are user-friendly

5. **Performance**
   - [ ] Page loads in <3 seconds
   - [ ] Video upload is responsive
   - [ ] Evaluation completes in reasonable time
   - [ ] UI remains interactive during processing

## 📝 Testing Checklist

Print this and check off as you test:

- [ ] Fresh install test (delete node_modules, reinstall)
- [ ] Test with 3 different video formats (MP4, WebM, MOV)
- [ ] Test with short video (10s) and long video (45s)
- [ ] Test with high quality (1080p) and low quality (480p)
- [ ] Test recording feature
- [ ] Test upload feature
- [ ] Test evaluation with clear audio
- [ ] Test evaluation with background noise
- [ ] Test clear and re-evaluate workflow
- [ ] Test error handling (missing API keys)
- [ ] Test error handling (invalid files)
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Edge
- [ ] Test responsive layout (mobile view)
- [ ] Verify all metrics score correctly
- [ ] Verify transcripts are accurate
- [ ] Verify chart displays properly
- [ ] Verify eye contact analysis shows
- [ ] Review console for errors
- [ ] Review network tab for failed requests

## 🎯 Production Readiness Checklist

Before deploying to production:

- [ ] Replace `.env.local` with production API keys
- [ ] Implement real MediaPipe eye detection (replace simulation)
- [ ] Add rate limiting for API endpoints
- [ ] Add file upload validation on server side
- [ ] Add virus scanning for uploaded files (optional)
- [ ] Optimize video compression before processing
- [ ] Add progress indicators for long operations
- [ ] Add analytics/monitoring
- [ ] Setup error logging (Sentry, LogRocket, etc.)
- [ ] Test with concurrent users
- [ ] Load test API endpoints
- [ ] Setup CDN for static assets
- [ ] Add video caching if needed
- [ ] Document API endpoints for team
- [ ] Create user guide for end users
- [ ] Train support team on common issues

## 🚀 Next Steps

After successful testing:

1. **Implement Real MediaPipe Integration**
   - Replace simulated eye contact analysis
   - Test accuracy with different face angles
   - Optimize for performance

2. **Add More Metrics** (future enhancement)
   - Body language analysis
   - Emotion detection
   - Gesture tracking

3. **Deploy to Vercel**
   - Push code to GitHub
   - Connect to Vercel
   - Configure environment variables
   - Test production deployment

4. **User Acceptance Testing**
   - Have actual sales team test
   - Collect feedback
   - Iterate on improvements

**Happy Testing! 🎉**
