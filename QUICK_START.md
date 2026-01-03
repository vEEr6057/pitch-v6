# pitch-v6 Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install FFmpeg
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

Verify: `ffmpeg -version`

### Step 2: Install Dependencies
```bash
cd pitch-v6
npm install
```

### Step 3: Setup API Keys
1. Get **AssemblyAI key**: https://www.assemblyai.com/ (free tier)
2. Get **Groq key**: https://console.groq.com/ (free tier)
3. Create `.env.local`:
   ```env
   ASSEMBLYAI_API_KEY=your_assemblyai_key
   GROQ_API_KEY=your_groq_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Step 4: Run
```bash
npm run dev
```

Open: http://localhost:3000

## 📹 How to Use

### 1. Upload Benchmark Video (Video A)
- Click "Click to upload reference video"
- Choose expert pitch video (MP4/WebM/MOV)
- Max 50MB, 30-45 seconds

### 2. Record Your Pitch (Video B)
- Click "Record Video (45s max)"
- Allow camera/mic permissions
- Follow on-screen guidelines:
  - Face close to camera (30-40% of frame)
  - Good lighting
  - Look at camera
  - Stable position

Or upload pre-recorded video instead.

### 3. Evaluate
- Click "Evaluate Videos" button
- Wait 30-60 seconds for analysis

### 4. View Results
- See 6 metric scores (0-100)
- Compare against benchmark
- Read AI-generated insights
- View transcripts

## 📊 Metrics Explained

1. **Keywords** - Medical terminology usage
2. **Delivery** - Pronunciation & clarity
3. **Fluency** - Speech flow & structure
4. **Addressing** - Objection handling
5. **Solution** - Query resolution
6. **Eye Contact** - Camera engagement (NEW!)

## 🔧 Troubleshooting

### "FFmpeg not found"
- Install FFmpeg (see Step 1)
- Restart terminal/IDE
- Verify: `ffmpeg -version`

### "Camera permission denied"
- Allow camera access in browser settings
- Or upload video instead

### "API key invalid"
- Check `.env.local` file exists
- Verify keys are correct (no quotes needed)
- Restart dev server: `npm run dev`

### "Transcription failed"
- Check AssemblyAI API key
- Verify video has audio track
- Check internet connection

### "Eye contact score is 0"
- Ensure face is visible in frame
- Check video quality (480p minimum)
- Verify good lighting

## 🎯 Recording Best Practices

### Lighting
- ✅ Face the light source
- ✅ Avoid backlighting (windows behind you)
- ✅ Use natural or soft artificial light

### Camera Position
- ✅ Camera at eye level
- ✅ Face occupies 30-40% of frame
- ✅ Centered in frame
- ✅ Stable (use tripod if available)

### Performance
- ✅ Look directly at camera lens
- ✅ Natural eye contact (blink normally)
- ✅ Speak clearly and confidently
- ✅ Use hand gestures naturally
- ✅ Smile appropriately

### Environment
- ✅ Clean, professional background
- ✅ Quiet space (minimal noise)
- ✅ Good internet connection (for upload)

## 📝 Tips for High Scores

### Keywords (Usage of Keywords)
- Use medical/pharmaceutical terms
- Mention product names correctly
- Reference clinical data when relevant

### Delivery (Pronunciation)
- Speak clearly and slowly
- Enunciate medical terms carefully
- Avoid filler words (um, uh, like)

### Fluency
- Smooth transitions between points
- Logical flow of ideas
- Natural pauses (not hesitation)

### Addressing (Objection Handling)
- Anticipate customer concerns
- Address common objections
- Provide evidence/data

### Solution (Query Resolution)
- Answer potential questions clearly
- Provide specific solutions
- Tie to customer needs

### Eye Contact (NEW!)
- Look at camera 70-85% of time
- Natural breaks every 3-5 seconds
- Don't stare continuously
- Blink normally

## 🔥 Quick Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check FFmpeg
ffmpeg -version

# Check Node version
node --version
```

## 📚 Need More Help?

See full documentation in [README.md](./README.md)

## ⚡ Known Limitations

- **File Size**: 50MB max per video
- **Duration**: 30-45 seconds optimal
- **Format**: MP4, WebM, MOV only
- **Eye Contact**: Simulation mode (MediaPipe integration pending)
- **Storage**: No cloud storage (download only)
- **Concurrent Users**: Single evaluation at a time

## 🎉 Success Checklist

- [ ] FFmpeg installed and verified
- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with API keys
- [ ] Dev server running (`npm run dev`)
- [ ] Browser open at http://localhost:3000
- [ ] Camera/mic permissions granted
- [ ] First video uploaded successfully
- [ ] First evaluation completed
- [ ] Results displayed correctly

**All checked? You're ready to start evaluating pitches! 🚀**
