# Quick Deployment Reference
## pitch-v6 - One-Page Cheat Sheet

---

## 🚀 Quick Deploy (3 Steps)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Set Environment Variables
Create `.env.local`:
```env
ASSEMBLYAI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

### 3. Deploy
```bash
# Windows
deploy.bat

# Mac/Linux
bash deploy.sh

# Or manually
vercel --prod
```

---

## 📋 Pre-Deployment Checklist

- [ ] `vercel.json` configured ✅ (already done)
- [ ] `requirements.txt` exists ✅ (already done)
- [ ] Environment variables set
- [ ] Code committed to Git
- [ ] Tested locally with `npm run dev`

---

## 🔑 Get API Keys

| Service | URL | Free Tier |
|---------|-----|-----------|
| AssemblyAI | https://www.assemblyai.com/dashboard/signup | 5 hrs/month |
| Groq | https://console.groq.com/keys | Unlimited |

---

## 🌐 Vercel Dashboard

1. Go to https://vercel.com/new
2. Import Git repository
3. Select `pitch-v6` directory
4. Add environment variables:
   - `ASSEMBLYAI_API_KEY`
   - `GROQ_API_KEY`
5. Click "Deploy"

---

## ✅ Test After Deployment

```bash
# Test FFmpeg
curl https://your-app.vercel.app/api/extract-audio

# Test eye contact
curl -X POST https://your-app.vercel.app/api/analyze-eye-contact \
  -F "video=@test.mp4"

# Test full pipeline (use web UI)
https://your-app.vercel.app
```

---

## 🐛 Common Issues

### Issue: FFmpeg not found
**Fix:** Already configured in `vercel.json` ✅

### Issue: Python dependencies missing
**Fix:** Already in `requirements.txt` ✅

### Issue: Function timeout
**Fix:** Already set to 300s in `vercel.json` ✅

### Issue: Memory limit
**Fix:** Already set to 3008MB in `vercel.json` ✅

---

## 📊 What's Deployed

### API Endpoints
- ✅ `/api/extract-audio` - Extract MP3 from MP4
- ✅ `/api/analyze-eye-contact` - Eye contact analysis
- ✅ `/api/evaluate-videos` - Full 6-metric evaluation

### Features
- ✅ Audio extraction (FFmpeg)
- ✅ Transcription (AssemblyAI)
- ✅ Text evaluation (Groq AI)
- ✅ Eye contact analysis (MediaPipe)
- ✅ 6 comprehensive metrics

---

## 💰 Cost Estimate

**1000 evaluations/month:**
- AssemblyAI: ~$12.50
- Groq: $0 (free)
- Vercel: $0 (free tier)
- **Total: ~$12.50/month**

---

## 📚 Full Documentation

- **Complete Guide:** `DEPLOYMENT_GUIDE.md`
- **Quick Start:** `QUICK_START_MP4.md`
- **All Docs:** `MP4_DOCUMENTATION_INDEX.md`

---

## 🆘 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` (troubleshooting section)
2. View Vercel logs in dashboard
3. Test locally first: `npm run dev`

---

**Ready to Deploy! 🚀**

Run `deploy.bat` (Windows) or `bash deploy.sh` (Mac/Linux)
