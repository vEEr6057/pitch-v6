# Production Deployment Guide
## pitch-v6: MP4 Video Processing System

**Last Updated:** January 13, 2026  
**Platform:** Vercel (Recommended)  
**Status:** Production Ready

---

## 🚀 Quick Deployment (5 minutes)

### Prerequisites Checklist

Before deploying, ensure you have:

- [x] Vercel account (free tier works)
- [x] GitHub repository with your code
- [x] AssemblyAI API key
- [x] Groq API key
- [x] All code committed and pushed

---

## Step 1: Prepare Your Repository

### 1.1 Verify Files Exist

Check that these files are in your `pitch-v6/` directory:

```bash
cd pitch-v6

# Check implementation files
ls lib/audio-extractor.ts
ls app/api/extract-audio/route.ts
ls app/api/analyze-eye-contact/route.ts
ls app/api/evaluate-videos/route.ts
ls scripts/enhanced_eye_contact.py

# Check configuration files
ls package.json
ls next.config.mjs
ls vercel.json
```

### 1.2 Update `vercel.json`

Create or update `vercel.json` in the `pitch-v6/` root:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install && pip install opencv-python-headless mediapipe numpy",
  "functions": {
    "app/api/evaluate-videos/route.ts": {
      "maxDuration": 300,
      "memory": 3008
    },
    "app/api/analyze-eye-contact/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "app/api/extract-audio/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "build": {
    "env": {
      "PYTHON_VERSION": "3.11"
    }
  }
}
```

**Important Notes:**
- Use `opencv-python-headless` (not `opencv-python`) for serverless
- Memory set to 3008MB for video processing
- Python 3.11 specified for compatibility

### 1.3 Update `package.json` Scripts

Ensure your `package.json` has these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "vercel-build": "npm run build"
  }
}
```

### 1.4 Create `requirements.txt`

Create `requirements.txt` in the `pitch-v6/` root:

```txt
opencv-python-headless==4.8.1.78
mediapipe==0.10.9
numpy==1.24.3
```

**Why headless?** Serverless environments don't have GUI support, so we use the headless version of OpenCV.

### 1.5 Commit and Push

```bash
git add .
git commit -m "Add MP4 processing with eye contact analysis"
git push origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository
4. Select the `pitch-v6` directory as the root

### 2.2 Configure Project

**Framework Preset:** Next.js  
**Root Directory:** `pitch-v6` (if in subdirectory)  
**Build Command:** `npm run build` (auto-detected)  
**Output Directory:** `.next` (auto-detected)

### 2.3 Add Environment Variables

Click "Environment Variables" and add:

```env
# Required
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
GROQ_API_KEY=your_groq_key_here

# Optional (for cloud library integration)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Optional (auto-detected if not set)
FFMPEG_PATH=/usr/bin/ffmpeg
PYTHON_PATH=/usr/bin/python3
```

**Get API Keys:**
- AssemblyAI: https://www.assemblyai.com/dashboard/signup
- Groq: https://console.groq.com/keys
- Vercel Blob: https://vercel.com/dashboard/stores

### 2.4 Deploy

Click **"Deploy"** and wait 2-3 minutes.

---

## Step 3: Install FFmpeg on Vercel

Vercel doesn't include FFmpeg by default. You need to add it using a buildpack.

### Option A: Using Vercel Build Output API (Recommended)

Create `vercel-build.sh` in `pitch-v6/`:

```bash
#!/bin/bash

# Install FFmpeg
echo "Installing FFmpeg..."
curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64 -o /tmp/ffmpeg
chmod +x /tmp/ffmpeg
export FFMPEG_PATH=/tmp/ffmpeg

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Build Next.js
echo "Building Next.js..."
npm run build
```

Update `package.json`:

```json
{
  "scripts": {
    "vercel-build": "bash vercel-build.sh"
  }
}
```

### Option B: Using FFmpeg Layer (Alternative)

Add to `vercel.json`:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "includeFiles": "ffmpeg-linux-x64"
    }
  }
}
```

Download FFmpeg binary:

```bash
# In pitch-v6/ directory
curl -L https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64 -o ffmpeg-linux-x64
chmod +x ffmpeg-linux-x64
```

Update `lib/audio-extractor.ts` to use local FFmpeg:

```typescript
const ffmpegPath = process.env.FFMPEG_PATH || './ffmpeg-linux-x64'
```

---

## Step 4: Verify Deployment

### 4.1 Check Build Logs

In Vercel dashboard:
1. Go to your project
2. Click "Deployments"
3. Click latest deployment
4. Check "Build Logs"

**Look for:**
- ✅ "Installing FFmpeg..."
- ✅ "Installing Python dependencies..."
- ✅ "opencv-python-headless installed"
- ✅ "mediapipe installed"
- ✅ "Build completed"

### 4.2 Test Endpoints

Once deployed, test each endpoint:

#### Test 1: Check FFmpeg Availability

```bash
curl https://your-app.vercel.app/api/extract-audio
```

**Expected response:**
```json
{
  "available": true,
  "ffmpegVersion": "6.0",
  "supportedFormats": ["mp3", "wav"]
}
```

#### Test 2: Check Environment Variables

```bash
curl https://your-app.vercel.app/api/check-env
```

**Expected response:**
```json
{
  "ASSEMBLYAI_API_KEY": true,
  "GROQ_API_KEY": true
}
```

#### Test 3: Upload Test Video

Use the web UI:
1. Go to https://your-app.vercel.app
2. Upload benchmark video
3. Upload trainee video
4. Click "Evaluate Videos"
5. Verify all 6 metrics appear

---

## Step 5: Troubleshooting Common Issues

### Issue 1: FFmpeg Not Found

**Error:** `FFmpeg not found` or `spawn ffmpeg ENOENT`

**Solution:**

1. Check if FFmpeg binary is included:
   ```bash
   ls -la ffmpeg-linux-x64
   ```

2. Update `lib/audio-extractor.ts`:
   ```typescript
   const ffmpegPath = process.env.FFMPEG_PATH || 
                      join(process.cwd(), 'ffmpeg-linux-x64')
   
   const command = `${ffmpegPath} -i "${videoPath}" ...`
   ```

3. Redeploy

### Issue 2: Python Dependencies Missing

**Error:** `ModuleNotFoundError: No module named 'cv2'`

**Solution:**

1. Verify `requirements.txt` exists
2. Use `opencv-python-headless` (not `opencv-python`)
3. Check build logs for installation errors
4. Add to `vercel.json`:
   ```json
   {
     "build": {
       "env": {
         "PYTHON_VERSION": "3.11"
       }
     }
   }
   ```

### Issue 3: Function Timeout

**Error:** `Function execution timed out`

**Solution:**

1. Increase timeout in `vercel.json`:
   ```json
   {
     "functions": {
       "app/api/evaluate-videos/route.ts": {
         "maxDuration": 300
       }
     }
   }
   ```

2. Upgrade to Vercel Pro if needed (free tier has 10s limit)

### Issue 4: Memory Limit Exceeded

**Error:** `Function invocation failed: memory limit exceeded`

**Solution:**

Increase memory in `vercel.json`:
```json
{
  "functions": {
    "app/api/evaluate-videos/route.ts": {
      "memory": 3008
    }
  }
}
```

### Issue 5: Eye Contact Score Always 0

**Possible Causes:**
- Python script not found
- MediaPipe not installed
- Video format not supported

**Solution:**

1. Check Python script exists:
   ```bash
   ls scripts/enhanced_eye_contact.py
   ```

2. Test locally first:
   ```bash
   python3 scripts/enhanced_eye_contact.py test-video.mp4
   ```

3. Check Vercel logs for Python errors

---

## Step 6: Production Optimization

### 6.1 Enable Caching

Add to `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },
  // Cache API responses
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400'
          }
        ]
      }
    ]
  }
}

export default nextConfig
```

### 6.2 Add Error Monitoring

Install Sentry (optional):

```bash
npm install @sentry/nextjs
```

Configure in `sentry.config.js`:

```javascript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development'
})
```

### 6.3 Set Up Analytics

Add Vercel Analytics:

```bash
npm install @vercel/analytics
```

Update `app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

---

## Step 7: Monitor Performance

### 7.1 Check Function Logs

In Vercel dashboard:
1. Go to "Functions"
2. Click on a function
3. View real-time logs

### 7.2 Monitor Metrics

Track:
- **Invocations** - How many requests
- **Duration** - Average response time
- **Errors** - Error rate
- **Memory** - Peak memory usage

### 7.3 Set Up Alerts

In Vercel dashboard:
1. Go to "Settings" → "Notifications"
2. Enable "Deployment Failed"
3. Enable "Function Error Rate"

---

## Step 8: Cost Management

### Free Tier Limits (Vercel Hobby)

- ✅ 100GB bandwidth/month
- ✅ 100GB-hours compute/month
- ⚠️ 10s function timeout (upgrade to Pro for 300s)
- ✅ Unlimited deployments

### Estimated Costs

**Scenario:** 1000 video evaluations/month (30s videos)

| Service | Free Tier | Paid Usage | Cost |
|---------|-----------|------------|------|
| AssemblyAI | 5 hrs/month | 45 hrs | ~$12.50 |
| Groq | Unlimited | Free | $0 |
| Vercel Hobby | 100GB-hrs | Sufficient | $0 |
| **Total** | | | **~$12.50/month** |

**If exceeding free tier:**
- Vercel Pro: $20/month (300s timeout, 1000GB bandwidth)
- Total: ~$32.50/month

### Cost Optimization Tips

1. **Cache transcriptions** - Don't re-transcribe same videos
2. **Compress videos** - Smaller files = faster processing
3. **Batch processing** - Process multiple videos together
4. **Use AssemblyAI efficiently** - Monitor usage

---

## Step 9: Security Best Practices

### 9.1 Secure Environment Variables

- ✅ Never commit API keys to Git
- ✅ Use Vercel environment variables
- ✅ Rotate keys regularly
- ✅ Use different keys for staging/production

### 9.2 Add Rate Limiting

Install rate limiter:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Add to API routes:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h')
})

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  // Continue with normal processing...
}
```

### 9.3 Validate File Uploads

Add file validation:

```typescript
// Check file size
if (videoFile.size > 50 * 1024 * 1024) { // 50MB
  return NextResponse.json(
    { error: 'File too large (max 50MB)' },
    { status: 400 }
  )
}

// Check file type
const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
if (!allowedTypes.includes(videoFile.type)) {
  return NextResponse.json(
    { error: 'Invalid file type' },
    { status: 400 }
  )
}
```

---

## Step 10: Continuous Deployment

### 10.1 Set Up Automatic Deployments

Vercel automatically deploys on:
- ✅ Push to `main` branch → Production
- ✅ Push to other branches → Preview
- ✅ Pull requests → Preview

### 10.2 Add Deployment Protection

In Vercel dashboard:
1. Go to "Settings" → "Deployment Protection"
2. Enable "Vercel Authentication"
3. Add allowed email domains

### 10.3 Set Up Staging Environment

Create staging branch:

```bash
git checkout -b staging
git push origin staging
```

In Vercel:
1. Go to "Settings" → "Domains"
2. Add staging domain: `staging-your-app.vercel.app`
3. Link to `staging` branch

---

## ✅ Deployment Checklist

Use this checklist before deploying:

### Pre-Deployment
- [ ] All code committed and pushed
- [ ] `vercel.json` configured
- [ ] `requirements.txt` created
- [ ] Environment variables ready
- [ ] FFmpeg binary included (if using local)
- [ ] Tested locally with `npm run dev`

### Deployment
- [ ] Repository connected to Vercel
- [ ] Environment variables set
- [ ] Build completed successfully
- [ ] No build errors in logs

### Post-Deployment
- [ ] Test `/api/extract-audio` endpoint
- [ ] Test `/api/analyze-eye-contact` endpoint
- [ ] Test `/api/evaluate-videos` endpoint
- [ ] Upload test videos via UI
- [ ] Verify all 6 metrics appear
- [ ] Check function logs for errors
- [ ] Monitor performance metrics

### Production
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error monitoring set up
- [ ] Rate limiting enabled
- [ ] Alerts configured
- [ ] Documentation updated

---

## 🚨 Emergency Rollback

If deployment fails:

1. **Instant Rollback:**
   - Go to Vercel dashboard
   - Click "Deployments"
   - Find previous working deployment
   - Click "..." → "Promote to Production"

2. **Fix and Redeploy:**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📊 Success Metrics

After deployment, monitor:

- ✅ **Uptime:** >99.9%
- ✅ **Response Time:** <20s for 30s videos
- ✅ **Error Rate:** <1%
- ✅ **User Satisfaction:** All 6 metrics working

---

## 🎯 Next Steps After Deployment

1. **Test thoroughly** with real videos
2. **Monitor costs** in first week
3. **Gather user feedback**
4. **Optimize performance** based on metrics
5. **Plan Phase 2** enhancements

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **AssemblyAI Docs:** https://www.assemblyai.com/docs
- **Groq Docs:** https://console.groq.com/docs

---

**Deployment Status: Ready to Deploy! 🚀**

Follow this guide step-by-step, and your MP4 processing system will be live in production within 10-15 minutes!
