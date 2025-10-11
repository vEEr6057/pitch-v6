# Cloud Library Integration - Deployment Guide

## Overview
The voice-to-voice app now has a **Cloud Library** integration that allows selecting pre-generated audios from pitch-v3 as Voice A reference pitches.

## Architecture
- **pitch-v3**: Generates and stores audio files in Vercel Blob storage
- **voice-to-voice**: Reads the same Vercel Blob storage to list and load audios as Voice A

## Prerequisites
Both apps must use the **SAME** Vercel Blob storage token to share the audio library.

---

## Deployment Steps

### 1. Get your Vercel Blob Token
If you already deployed pitch-v3, you should have this token. If not:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Storage → Blob
3. Copy the `BLOB_READ_WRITE_TOKEN`

### 2. Deploy voice-to-voice to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)
```bash
cd voice-to-voice
npm install -g vercel
vercel
```

#### Option B: Deploy via GitHub
1. Push voice-to-voice to GitHub (separate repo or monorepo)
2. Import to Vercel Dashboard
3. Set build settings:
   - Framework Preset: Next.js
   - Root Directory: `voice-to-voice` (if in monorepo)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Add Environment Variables to voice-to-voice
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add the following variables:

#### Required for Cloud Library:
```
BLOB_READ_WRITE_TOKEN = <same token as pitch-v3>
```

#### Required for Speech Evaluation:
```
ASSEMBLYAI_API_KEY = <your AssemblyAI API key>
GROQ_API_KEY = <your Groq API key>
OPENAI_API_KEY = <your OpenAI API key>
```

**IMPORTANT**: After adding environment variables, you MUST **redeploy** the app for them to take effect!

### 4. Get API Keys

#### AssemblyAI (Speech-to-Text)
1. Go to https://www.assemblyai.com/
2. Sign up for free account
3. Copy API key from dashboard
4. Free tier: 5 hours of audio/month

#### Groq (AI Evaluation)
1. Go to https://groq.com/
2. Sign up and get API key
3. Copy key from console
4. Free tier with generous limits

#### OpenAI (Whisper Transcription)
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy key immediately (can't view again)
4. Add credits to account (pay-as-you-go)

### 5. Test the Integration

1. **Generate Audio in pitch-v3:**
   - Go to your pitch-v3 URL
   - Enter pitch text
   - Generate audio with Male or Female voice
   - Save to cloud library

2. **Select Cloud Audio in voice-to-voice:**
   - Go to your voice-to-voice URL
   - Box 1: Click "Cloud Library" tab
   - Select the audio you just generated
   - Wait for processing (transcription + evaluation)
   - Audio will load as Voice A

3. **Record Your Pitch:**
   - Box 2: Record your own pitch audio
   - Choose evaluation mode:
     - **T-T Mode**: Text-to-Text comparison (transcripts only)
     - **A-A Mode**: Audio-to-Audio comparison (prosody, pitch, tone)

4. **Compare:**
   - Click "Compare Pitches"
   - View detailed score breakdowns for both pitches
   - See radar chart visualization

---

## Features

### Voice A Selection Methods
1. **Upload from Device**: Upload audio files from your computer
2. **Cloud Library**: Select from pre-generated pitch-v3 audios

### Cloud Library UI
- Displays all saved audios from pitch-v3
- Shows metadata: filename, format, size, creation date
- Auto-refreshes on component mount
- Retry button if loading fails
- Error messages if cloud library is empty

### Evaluation Modes
- **T-T (Text-to-Text)**: Compare transcribed text content, keywords, structure
- **A-A (Audio-to-Audio)**: Compare audio characteristics, prosody, delivery

### Scoring Metrics
- Usage of Keywords
- Pronunciation
- Fluency
- Objection Handling
- Query Resolution

---

## Troubleshooting

### "No audios found in cloud library"
**Cause**: No audios have been generated in pitch-v3 yet, or BLOB_READ_WRITE_TOKEN is incorrect

**Solution**:
1. Go to pitch-v3 and generate at least one audio
2. Save it to cloud library
3. Verify both apps use the same BLOB_READ_WRITE_TOKEN
4. Refresh voice-to-voice

### "Failed to load cloud audios"
**Cause**: BLOB_READ_WRITE_TOKEN not set or incorrect

**Solution**:
1. Check Vercel environment variables
2. Verify token matches pitch-v3
3. Redeploy after adding variables
4. Check browser console for detailed errors

### Cloud audio loads but transcription fails
**Cause**: OPENAI_API_KEY not set or invalid

**Solution**:
1. Verify OPENAI_API_KEY is set in Vercel
2. Check API key has credits
3. Redeploy after adding key

### Evaluation scores not showing
**Cause**: GROQ_API_KEY not set

**Solution**:
1. Add GROQ_API_KEY to Vercel environment variables
2. Redeploy
3. Try evaluation again

---

## Environment Variables Summary

### pitch-v3 needs:
```
ELEVENLABS_API_KEY      = <from elevenlabs.io>
BLOB_READ_WRITE_TOKEN   = <from Vercel storage>
```

### voice-to-voice needs:
```
BLOB_READ_WRITE_TOKEN   = <SAME as pitch-v3>
ASSEMBLYAI_API_KEY      = <from assemblyai.com>
GROQ_API_KEY            = <from groq.com>
OPENAI_API_KEY          = <from openai.com>
```

---

## Architecture Diagram

```
┌─────────────────┐
│   pitch-v3      │
│  (Generator)    │
├─────────────────┤
│ • Text input    │
│ • ElevenLabs TTS│
│ • Save to Blob  │
└────────┬────────┘
         │
         │ BLOB_READ_WRITE_TOKEN
         │ (Shared Storage)
         ▼
┌─────────────────┐
│ Vercel Blob     │
│ Storage         │
│ pharma-pitches/ │
└────────┬────────┘
         │
         │ BLOB_READ_WRITE_TOKEN
         │ (Read Access)
         ▼
┌─────────────────┐
│ voice-to-voice  │
│  (Evaluator)    │
├─────────────────┤
│ • Cloud Library │
│ • Voice A load  │
│ • Voice B record│
│ • AI evaluation │
└─────────────────┘
```

---

## Next Steps
1. ✅ Install @vercel/blob in voice-to-voice
2. ✅ Create list-cloud-audios API endpoint
3. ✅ Add Tabs UI (Upload | Cloud Library)
4. ✅ Add cloud audio state management
5. ✅ Create cloud audio selection handler
6. ✅ Update UI with dropdown
7. 🔲 **Deploy voice-to-voice to Vercel**
8. 🔲 **Add BLOB_READ_WRITE_TOKEN environment variable**
9. 🔲 **Test end-to-end workflow**

---

## Support
If you encounter issues:
1. Check browser console for errors
2. Verify all environment variables are set
3. Ensure you redeployed after adding variables
4. Check Vercel function logs for API errors

Good luck! 🚀
