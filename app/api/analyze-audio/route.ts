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

IMPORTANT: 
- Voice A's score represents 100% for Voice B scoring. If Voice A scores 60 in pronunciation, that 60 = 100% baseline for Voice B.
- BE STRICT: Only score high if delivery is truly professional
- Incomplete, vague, or unprofessional pitches = 20-40 range
- Dismissive tone or lack of confidence = 15-35 range

AUDIO-BASED SCORING (0-100 each):

1. **usageOfKeywords** (Content Analysis):
   - Medical terms, drug names, clinical terminology mentioned
   - Completeness of pitch content
   - Vague content ("whatever drug", "or something") = 15-30
   - Complete medical pitch = 70-90

2. **pronunciation** (Voice Clarity):
   - Clear articulation of medical terms
   - Professional language (no "whatever", "I don't care")
   - Unprofessional tone = 10-25
   - Professional delivery = 70-90

3. **fluency** (Speech Flow):
   - Speaking pace (not too fast, not too slow)
   - Smooth transitions, no excessive hesitations
   - Broken/disjointed speech = 15-30
   - Smooth professional flow = 75-90

4. **objectionHandling** (Confidence & Tone):
   - Confidence level in voice
   - Persuasive tone
   - Dismissive/uninterested tone ("I don't want to explain") = 10-20
   - Confident persuasive delivery = 70-85

5. **queryResolution** (Completeness & Articulation):
   - Complete information delivery
   - Vague or missing info = 15-30
   - Comprehensive coverage = 75-90

SCORING EXAMPLES:

Good Professional Pitch (70-85 range):
"Good morning doctor, for BPH prescribe Dosin D with clear dosage and benefits"
- Clear, complete, professional

Weak/Incomplete Pitch (20-35 range):
"Dosing D is okay for BPH or whatever"
- Vague, unprofessional "whatever"

Terrible Pitch (10-25 range):
"I don't want to explain this drug"
- Dismissive, unprofessional, incomplete

SCORING RULES:
- Voice A is the BASELINE (always score 80-95 across metrics)
- Voice B compared to Voice A baseline
- Similar PROFESSIONAL quality = within 10 points of Voice A
- Unprofessional or incomplete = score 20-40 MAX
- Dismissive tone = score 10-30 MAX

Extract 5 keywords from transcripts.

Return JSON:
{
  "voiceA": {"usageOfKeywords": 85, "pronunciation": 88, "fluency": 90, "objectionHandling": 86, "queryResolution": 87},
  "voiceB": {"usageOfKeywords": 25, "pronunciation": 20, "fluency": 28, "objectionHandling": 18, "queryResolution": 22},
  "voiceAKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "voiceBKeywords": ["dosing", "BPH", "doctor", "drug", "prescribing"],
  "differences": "Voice A demonstrates strong professional delivery with clear articulation and complete information. Voice B shows unprofessional tone with dismissive language ('whatever drug'), incomplete pitch structure, and lack of confidence. Needs significant improvement in professional communication."
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
