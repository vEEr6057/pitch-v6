import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface AudioFeatures {
  duration: number
  // Will add more features after audio processing
}

interface AudioAnalysisResponse {
  voiceA: {
    usageOfKeywords: number
    pronunciation: number
    fluency: number
    objectionHandling: number
    queryResolution: number
  }
  voiceB: {
    usageOfKeywords: number
    pronunciation: number
    fluency: number
    objectionHandling: number
    queryResolution: number
  }
  voiceAKeywords?: string[]
  voiceBKeywords?: string[]
  differences?: string
}

export const maxDuration = 60

export async function POST(req: Request): Promise<Response> {
  try {
    const formData = await req.formData()
    const voiceAFile = formData.get("voiceA") as File
    const voiceBFile = formData.get("voiceB") as File
    const voiceATranscript = formData.get("voiceATranscript") as string
    const voiceBTranscript = formData.get("voiceBTranscript") as string

    if (!voiceAFile || !voiceBFile || !voiceATranscript || !voiceBTranscript) {
      return Response.json(
        { error: "Missing audio files or transcripts" },
        { status: 400 }
      )
    }

    // For now, we'll analyze using transcripts + basic file info
    // In production, you'd extract audio features here using a Python service
    
    console.log("=== Audio Analysis Mode ===")
    console.log("Voice A file:", voiceAFile.name, voiceAFile.size, "bytes")
    console.log("Voice B file:", voiceBFile.name, voiceBFile.size, "bytes")

    // Temporary: Use text-based analysis but with different prompt
    // TODO: Extract actual audio features (speaking rate, pitch, energy, etc.)
    
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "Groq API key not configured" },
        { status: 500 }
      )
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are evaluating pharmaceutical sales pitch DELIVERY and AUDIO QUALITY.

CONTEXT: Voice A is the reference/baseline audio (scores 80-95). Voice B is being evaluated.

IMPORTANT: Voice A's score represents 100% for Voice B scoring. If Voice A scores 60 in pronunciation, that 60 = 100% baseline for Voice B.

AUDIO-BASED SCORING (0-100 each):

1. **usageOfKeywords** (Content Analysis):
   - Medical terms, drug names, clinical terminology mentioned
   - Completeness of pitch content
   - If Voice B mentions similar keywords as Voice A, score 85-95

2. **pronunciation** (Voice Clarity):
   - Clear articulation of medical terms
   - Correct emphasis and stress
   - Natural vs. robotic delivery
   - If delivery sounds confident and clear, score 75-90

3. **fluency** (Speech Flow):
   - Speaking pace (not too fast, not too slow)
   - Smooth transitions, no excessive hesitations
   - Natural rhythm and timing
   - Fewer filler words ("um", "uh")
   - If similar pace to Voice A, score 80-95

4. **objectionHandling** (Confidence & Tone):
   - Confidence level in voice
   - Persuasive tone
   - Energy and enthusiasm
   - Professional demeanor
   - If voice sounds confident, score 70-85

5. **queryResolution** (Completeness & Articulation):
   - Complete information delivery
   - Clear enunciation of key details
   - Maintains listener attention
   - Comprehensive coverage
   - If similar completeness to Voice A, score 75-90

SCORING RULES:
- Voice A is the BASELINE (always score 80-95 across metrics)
- Voice B compared to Voice A baseline
- Similar quality = within 10 points of Voice A
- Small delivery issues = -5 to -15 points from baseline
- Major issues (unclear, hesitant, incomplete) = -20 to -30 points

Extract 5 keywords from transcripts.

Return JSON:
{
  "voiceA": {"usageOfKeywords": 85, "pronunciation": 88, "fluency": 90, "objectionHandling": 86, "queryResolution": 87},
  "voiceB": {"usageOfKeywords": 82, "pronunciation": 80, "fluency": 85, "objectionHandling": 78, "queryResolution": 83},
  "voiceAKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "voiceBKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "differences": "Voice A demonstrates strong professional delivery with clear articulation. Voice B shows good content coverage but could improve speaking confidence and pace consistency."
}`
        },
        {
          role: "user",
          content: `Analyze these pharmaceutical pitch deliveries:

Voice A (Reference Audio):
${voiceATranscript}

Voice B (User's Audio):
${voiceBTranscript}

Focus on delivery quality, speaking style, and audio characteristics.`
        }
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: "json_object" },
    })

    const aiResponse = completion.choices[0]?.message?.content?.trim() || ""
    
    console.log("=== Audio Analysis AI Response ===")
    console.log(aiResponse)
    console.log("===================================")
    
    // Parse response
    let cleanedResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0]
    }

    const comparisonData: AudioAnalysisResponse = JSON.parse(cleanedResponse)
    
    // Validate response structure
    if (!comparisonData.voiceA || !comparisonData.voiceB) {
      throw new Error("Invalid AI response structure")
    }

    return Response.json(comparisonData)

  } catch (err) {
    console.error("Audio analysis error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Audio analysis failed" },
      { status: 500 }
    )
  }
}
