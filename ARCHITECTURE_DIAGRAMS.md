# MP4 Processing Architecture Diagrams

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHARMACEUTICAL PITCH EVALUATION                       │
│                         MP4 Video Processing System                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MP4 Upload
                                    ▼
                    ┌───────────────────────────────┐
                    │      Video File (MP4)         │
                    │   Benchmark vs Trainee        │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │   AUDIO PIPELINE    │         │   VIDEO PIPELINE    │
        │   (Transcript)      │         │   (Eye Contact)     │
        └──────────┬──────────┘         └──────────┬──────────┘
                   │                               │
                   │ PARALLEL PROCESSING           │
                   │                               │
        ┌──────────▼──────────┐         ┌─────────▼──────────┐
        │  FFmpeg Extraction  │         │  MediaPipe Face    │
        │  Video → MP3        │         │  Mesh Analysis     │
        └──────────┬──────────┘         └─────────┬──────────┘
                   │                               │
        ┌──────────▼──────────┐         ┌─────────▼──────────┐
        │  AssemblyAI         │         │  Head Pose +       │
        │  Transcription      │         │  Gaze Estimation   │
        └──────────┬──────────┘         └─────────┬──────────┘
                   │                               │
        ┌──────────▼──────────┐         ┌─────────▼──────────┐
        │  Groq AI            │         │  Eye Contact       │
        │  5 Text Metrics     │         │  Score (0-100)     │
        └──────────┬──────────┘         └─────────┬──────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      AGGREGATION LAYER       │
                    │   Merge 6 Metrics + Insights │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      FRONTEND DISPLAY        │
                    │  Charts + Transcripts + AI   │
                    │  Insights + Suggestions      │
                    └──────────────────────────────┘
```

---

## 2. Audio Pipeline (Detailed)

```
┌────────────────────────────────────────────────────────────────┐
│                      AUDIO PIPELINE                             │
│              (Existing Transcript Evaluation)                   │
└────────────────────────────────────────────────────────────────┘

    MP4 Video File
         │
         │ Step 1: Audio Extraction (~300ms)
         ▼
    ┌─────────────────────┐
    │   FFmpeg Binary     │
    │   -vn -acodec mp3   │
    │   -ar 16000 -ac 1   │
    └──────────┬──────────┘
               │ MP3 Buffer (1-2MB)
               ▼
    ┌─────────────────────┐
    │   AssemblyAI API    │
    │   Speech-to-Text    │
    │   (10-15 seconds)   │
    └──────────┬──────────┘
               │ Transcript Text
               ▼
    ┌─────────────────────┐
    │   Groq AI (Llama)   │
    │   Text Analysis     │
    │   (2-3 seconds)     │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │         5 TEXT METRICS              │
    ├─────────────────────────────────────┤
    │ 1. Usage of Keywords      (0-100)   │
    │ 2. Pronunciation          (0-100)   │
    │ 3. Fluency                (0-100)   │
    │ 4. Objection Handling     (0-100)   │
    │ 5. Query Resolution       (0-100)   │
    └─────────────────────────────────────┘
```

---

## 3. Video Pipeline (Detailed)

```
┌────────────────────────────────────────────────────────────────┐
│                      VIDEO PIPELINE                             │
│              (NEW Eye Contact Analysis)                         │
└────────────────────────────────────────────────────────────────┘

    MP4 Video File
         │
         │ Step 1: Frame Sampling (8 FPS)
         ▼
    ┌─────────────────────┐
    │   OpenCV Reader     │
    │   Sample every Nth  │
    │   frame (skip 3-4)  │
    └──────────┬──────────┘
               │ Sampled Frames
               ▼
    ┌─────────────────────┐
    │   MediaPipe Face    │
    │   Mesh Detection    │
    │   468 landmarks     │
    └──────────┬──────────┘
               │ Facial Landmarks
               ▼
    ┌─────────────────────────────────────┐
    │   HEAD POSE ESTIMATION (solvePnP)   │
    ├─────────────────────────────────────┤
    │ • 6 key landmarks (nose, chin, etc) │
    │ • Camera matrix calculation         │
    │ • Rotation vector → Euler angles    │
    │ • Output: yaw, pitch, roll (°)      │
    └──────────┬──────────────────────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │   IRIS GAZE ESTIMATION              │
    ├─────────────────────────────────────┤
    │ • Left iris (landmark 468)          │
    │ • Right iris (landmark 473)         │
    │ • Eye corners for reference         │
    │ • Iris offset calculation           │
    │ • Output: gaze_h, gaze_v (°)        │
    └──────────┬──────────────────────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │   EYE CONTACT DETECTION             │
    ├─────────────────────────────────────┤
    │ Condition 1: Head Centered          │
    │   abs(yaw) < 20° AND                │
    │   abs(pitch) < 20°                  │
    │                                     │
    │ Condition 2: Gaze Centered          │
    │   abs(gaze_h) < 15° AND             │
    │   abs(gaze_v) < 15°                 │
    │                                     │
    │ Eye Contact = Cond1 AND Cond2       │
    └──────────┬──────────────────────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │   SCORE CALCULATION                 │
    ├─────────────────────────────────────┤
    │ score = (eye_contact_frames /       │
    │          total_frames) × 100        │
    │                                     │
    │ confidence = face_detection_rate    │
    └──────────┬──────────────────────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │         1 VIDEO METRIC              │
    ├─────────────────────────────────────┤
    │ 6. Eye Contact            (0-100)   │
    │    • Score                          │
    │    • Confidence                     │
    │    • Total frames                   │
    │    • Eye contact frames             │
    │    • Face detection rate            │
    └─────────────────────────────────────┘
```

---

## 4. Eye Contact Scoring Logic

```
┌────────────────────────────────────────────────────────────────┐
│              EYE CONTACT DECISION TREE                          │
└────────────────────────────────────────────────────────────────┘

                    Frame N
                       │
                       ▼
            ┌──────────────────────┐
            │  Face Detected?      │
            └──────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
        YES                 NO
         │                   │
         ▼                   ▼
    ┌─────────┐         ┌─────────┐
    │ Extract │         │  Skip   │
    │ Landmarks│         │  Frame  │
    └────┬────┘         └─────────┘
         │
         ▼
    ┌─────────────────────┐
    │ Estimate Head Pose  │
    │ (yaw, pitch, roll)  │
    └────┬────────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ abs(yaw) < 20° AND  │
    │ abs(pitch) < 20°?   │
    └────┬────────────────┘
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Gaze   │  │  No    │
│ Check  │  │ Eye    │
│        │  │ Contact│
└───┬────┘  └────────┘
    │
    ▼
┌─────────────────────┐
│ Estimate Gaze       │
│ (gaze_h, gaze_v)    │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ abs(gaze_h) < 15°   │
│ AND                 │
│ abs(gaze_v) < 15°?  │
└────┬────────────────┘
     │
┌────┴────┐
│         │
YES       NO
│         │
▼         ▼
┌────────┐  ┌────────┐
│  Eye   │  │  No    │
│ Contact│  │  Eye   │
│  ✓     │  │ Contact│
└────────┘  └────────┘

Final Score = (Eye Contact Frames / Total Frames) × 100
```

---

## 5. Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                            │
└────────────────────────────────────────────────────────────────┘

INPUT:
┌─────────────────────────────────────────────────────────────┐
│ FormData {                                                  │
│   videoAUrl: "https://blob.vercel-storage.com/bench.mp4"   │
│   videoBUrl: "https://blob.vercel-storage.com/train.mp4"   │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Fetch Videos from Blob Storage                             │
│ • Download videoA buffer                                   │
│ • Download videoB buffer                                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Process Video A (Parallel)                                 │
│ ┌─────────────────────┐  ┌─────────────────────┐          │
│ │ Audio Pipeline      │  │ Video Pipeline      │          │
│ │ • Extract MP3       │  │ • Analyze frames    │          │
│ │ • Transcribe        │  │ • Detect face       │          │
│ │ • Evaluate text     │  │ • Track gaze        │          │
│ │ → 5 metrics         │  │ → Eye contact       │          │
│ └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Process Video B (Parallel)                                 │
│ ┌─────────────────────┐  ┌─────────────────────┐          │
│ │ Audio Pipeline      │  │ Video Pipeline      │          │
│ │ • Extract MP3       │  │ • Analyze frames    │          │
│ │ • Transcribe        │  │ • Detect face       │          │
│ │ • Evaluate text     │  │ • Track gaze        │          │
│ │ → 5 metrics         │  │ → Eye contact       │          │
│ └─────────────────────┘  └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Compare Results                                            │
│ • Calculate overall difference                             │
│ • Generate strengths                                       │
│ • Generate improvements                                    │
│ • Create eye contact feedback                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
OUTPUT:
┌─────────────────────────────────────────────────────────────┐
│ {                                                           │
│   videoA: {                                                │
│     scores: { ...6 metrics... },                          │
│     transcript: "...",                                     │
│     eyeContactDetails: { ... }                            │
│   },                                                       │
│   videoB: { ...same structure... },                       │
│   comparison: {                                            │
│     overallDifference: -15,                               │
│     strengths: [...],                                      │
│     improvements: [...]                                    │
│   },                                                       │
│   eyeContactAnalysis: {                                    │
│     videoA: { score: 85, feedback: "..." },              │
│     videoB: { score: 62, feedback: "..." }               │
│   }                                                        │
│ }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Technology Stack

```
┌────────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                             │
└────────────────────────────────────────────────────────────────┘

FRONTEND
┌─────────────────────────────────────────────────────────────┐
│ • Next.js 14 (React Framework)                             │
│ • TypeScript (Type Safety)                                 │
│ • Tailwind CSS (Styling)                                   │
│ • Recharts (Data Visualization)                            │
│ • Shadcn/ui (UI Components)                                │
└─────────────────────────────────────────────────────────────┘

BACKEND (Node.js)
┌─────────────────────────────────────────────────────────────┐
│ • Next.js API Routes (Serverless Functions)                │
│ • FFmpeg (Audio Extraction)                                │
│ • AssemblyAI SDK (Speech-to-Text)                          │
│ • Groq SDK (AI Text Analysis)                              │
│ • Vercel Blob (Video Storage)                              │
└─────────────────────────────────────────────────────────────┘

BACKEND (Python)
┌─────────────────────────────────────────────────────────────┐
│ • Python 3.11+ (Runtime)                                   │
│ • OpenCV (Video Processing)                                │
│ • MediaPipe (Face Mesh Detection)                          │
│ • NumPy (Numerical Computing)                              │
└─────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES
┌─────────────────────────────────────────────────────────────┐
│ • AssemblyAI (Transcription)                               │
│ • Groq (AI Inference)                                      │
│ • Vercel (Hosting + Blob Storage)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  DEPLOYMENT ARCHITECTURE                        │
└────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   USER BROWSER  │
                    └────────┬────────┘
                             │ HTTPS
                             ▼
                    ┌─────────────────┐
                    │  VERCEL EDGE    │
                    │  CDN + Routing  │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  STATIC PAGES    │      │  API FUNCTIONS   │
    │  (Next.js SSG)   │      │  (Serverless)    │
    └──────────────────┘      └────────┬─────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                        ▼              ▼              ▼
            ┌────────────────┐ ┌────────────┐ ┌────────────┐
            │  extract-audio │ │  analyze-  │ │  evaluate- │
            │  (60s timeout) │ │  eye-      │ │  videos    │
            │                │ │  contact   │ │  (300s)    │
            │  • FFmpeg      │ │  (60s)     │ │            │
            │  • Audio       │ │            │ │  • Audio   │
            │    extraction  │ │  • Python  │ │  • Video   │
            └────────────────┘ │  • MediaPipe│ │  • Groq    │
                               │  • OpenCV  │ │  • Assembly│
                               └────────────┘ └────────────┘
                                       │
                                       ▼
                            ┌──────────────────┐
                            │  VERCEL BLOB     │
                            │  Video Storage   │
                            └──────────────────┘
                                       │
                        ┌──────────────┼──────────────┐
                        │              │              │
                        ▼              ▼              ▼
            ┌────────────────┐ ┌────────────┐ ┌────────────┐
            │  AssemblyAI    │ │  Groq API  │ │  MediaPipe │
            │  (External)    │ │  (External)│ │  (Local)   │
            └────────────────┘ └────────────┘ └────────────┘
```

---

## 8. Performance Timeline

```
┌────────────────────────────────────────────────────────────────┐
│            PERFORMANCE TIMELINE (30s video)                     │
└────────────────────────────────────────────────────────────────┘

Time (seconds)
0s ────────────────────────────────────────────────────────────▶ 20s

│
│ ┌─────────────────────────────────────────────────────────────┐
│ │ VIDEO UPLOAD TO BLOB STORAGE                                │
│ └─────────────────────────────────────────────────────────────┘
0s                                                              2s

    │
    │ ┌───────────────────────────────────────────────────────┐
    │ │ PARALLEL PROCESSING STARTS                            │
    │ └───────────────────────────────────────────────────────┘
    2s
    │
    ├─▶ AUDIO PIPELINE
    │   ├─ Extract Audio (FFmpeg)          [2s → 2.3s]
    │   ├─ Upload to AssemblyAI            [2.3s → 2.5s]
    │   ├─ Transcription                   [2.5s → 15s]
    │   └─ Groq Evaluation                 [15s → 18s]
    │
    └─▶ VIDEO PIPELINE
        ├─ Save to temp file               [2s → 2.1s]
        ├─ Python script execution         [2.1s → 2.2s]
        ├─ Frame sampling + analysis       [2.2s → 5s]
        └─ Score calculation               [5s → 5.1s]

                                            ┌──────────────────┐
                                            │ AGGREGATION      │
                                            │ Merge results    │
                                            └──────────────────┘
                                           18s              18.5s

                                                    ┌──────────┐
                                                    │ RESPONSE │
                                                    │ to client│
                                                    └──────────┘
                                                   18.5s     20s

TOTAL: ~18-20 seconds (parallel processing)
vs ~30-35 seconds (if sequential)
```

---

These diagrams provide a visual understanding of the MP4 processing system architecture, data flow, and performance characteristics.
