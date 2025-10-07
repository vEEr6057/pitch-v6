# Voice to Voice

*A complete project copy for voice-to-voice functionality development*

## Overview

This is a complete copy of the original voice-to-text-ranking project, created for developing voice-to-voice capabilities. The project includes:

- Speech recognition using browser Web Speech API
- Dual evaluation system (speech-based vs text-based scoring)
- IntelliMedia branding and styling
- Real-time transcription and analysis

## Features

- **Browser-based Speech Recognition**: Uses Web Speech API for real-time transcription
- **Dual Evaluation System**: Different scoring algorithms for speech vs text input
- **Interactive UI**: IntelliMedia branded interface with responsive design
- **Real-time Processing**: Continuous speech recognition with automatic restart
- **Smart Scoring**: Advanced algorithms for keyword usage, fluency, and objection handling

## Project Structure

```
voice-to-voice/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── api/
│       ├── refine-score/     # Scoring and refinement API
│       └── transcribe/       # Transcription API
├── components/
│   ├── speech-recognition.tsx # Speech recognition component
│   ├── score-chart.tsx       # Chart visualization
│   └── ui/                   # UI components
├── lib/
│   ├── utils.ts              # Utility functions
│   └── ai.ts                 # AI configuration
└── public/                   # Static assets
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Key Components

- **SpeechRecognition**: Handles browser-based speech recognition
- **ScoreChart**: Visualizes evaluation scores with custom labels
- **API Routes**: Handle text refinement and dual scoring systems

## Development Notes

This project is specifically configured for voice-to-voice development with enhanced speech recognition capabilities and intelligent evaluation systems.