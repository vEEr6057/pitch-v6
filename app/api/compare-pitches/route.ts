import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface ComparisonScores {
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
  reasoning: string
}

export const maxDuration = 60

export async function POST(req: Request): Promise<Response> {
  // Store transcripts at the start
  let voiceATranscript = ""
  let voiceBTranscript = ""
  
  try {
    const body = await req.json()
    voiceATranscript = body.voiceATranscript || ""
    voiceBTranscript = body.voiceBTranscript || ""

    if (!voiceATranscript || !voiceBTranscript) {
      return Response.json({ error: "Both transcripts required" }, { status: 400 })
    }

    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY not set - using fallback scoring")
      return fallbackComparison(voiceATranscript, voiceBTranscript)
    }

    // Use AI to compare both pitches side-by-side
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert sales pitch evaluator. Compare TWO pitch transcripts and score them on these exact criteria:

1. usageOfKeywords (0-100): How well does the pitch use relevant product/service keywords and benefits?
2. pronunciation (0-100): Grammar quality, professional language, clear phrasing (based on text quality)
3. fluency (0-100): Flow, coherence, logical structure
4. objectionHandling (0-100): Does it anticipate concerns and address benefits proactively?
5. queryResolution (0-100): How complete and informative is the pitch?

CRITICAL RULES:
- Give DIFFERENT scores based on actual quality differences
- Detect grammar errors, awkward phrasing, unclear statements
- Score lower for poor grammar, score higher for clarity
- Don't give identical scores unless truly equal quality
- Respond ONLY with raw JSON, no markdown, no code blocks, no explanation outside the JSON

JSON format (EXACTLY this structure):
{
  "voiceA": {
    "usageOfKeywords": 75,
    "pronunciation": 85,
    "fluency": 90,
    "objectionHandling": 70,
    "queryResolution": 80
  },
  "voiceB": {
    "usageOfKeywords": 65,
    "pronunciation": 70,
    "fluency": 75,
    "objectionHandling": 65,
    "queryResolution": 70
  },
  "reasoning": "Voice A is clearer and more professional. Voice B has grammar issues like..."
}`
        },
        {
          role: "user",
          content: `Compare these two pitches:

**Voice A (Reference Pitch):**
"${voiceATranscript}"

**Voice B (User's Pitch):**
"${voiceBTranscript}"

Score them and explain the differences.`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const aiResponse = completion.choices[0]?.message?.content?.trim() || ""
    
    console.log("=== AI Response ===")
    console.log(aiResponse)
    console.log("===================")
    
    // Clean up AI response - remove markdown code blocks if present
    let cleanedResponse = aiResponse
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
    }
    
    console.log("=== Cleaned Response ===")
    console.log(cleanedResponse)
    console.log("========================")
    
    // Parse AI response
    const parsedResponse: ComparisonScores = JSON.parse(cleanedResponse)
    
    console.log("=== Parsed Successfully ===")
    console.log(JSON.stringify(parsedResponse, null, 2))
    console.log("===========================")

    // Clamp scores to 0-100
    const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)))

    return Response.json({
      voiceA: {
        usageOfKeywords: clamp(parsedResponse.voiceA.usageOfKeywords),
        pronunciation: clamp(parsedResponse.voiceA.pronunciation),
        fluency: clamp(parsedResponse.voiceA.fluency),
        objectionHandling: clamp(parsedResponse.voiceA.objectionHandling),
        queryResolution: clamp(parsedResponse.voiceA.queryResolution),
      },
      voiceB: {
        usageOfKeywords: clamp(parsedResponse.voiceB.usageOfKeywords),
        pronunciation: clamp(parsedResponse.voiceB.pronunciation),
        fluency: clamp(parsedResponse.voiceB.fluency),
        objectionHandling: clamp(parsedResponse.voiceB.objectionHandling),
        queryResolution: clamp(parsedResponse.voiceB.queryResolution),
      },
      reasoning: parsedResponse.reasoning,
    })

  } catch (error: any) {
    console.error("Comparison error:", error)
    console.error("Error details:", error.message)
    // Use stored transcripts for fallback
    if (voiceATranscript && voiceBTranscript) {
      return fallbackComparison(voiceATranscript, voiceBTranscript)
    }
    return Response.json(
      { error: `Comparison failed: ${error.message}` },
      { status: 500 }
    )
  }
}

// Fallback comparison using simple algorithm
function fallbackComparison(voiceATranscript: string, voiceBTranscript: string): Response {
  const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)))
  
  // Simple scoring based on word count, grammar indicators
  const scoreText = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean).length
    const sentences = text.split(/[.!?]+/).filter(Boolean).length
    const hasGrammarIssues = /\b(a\s+\w+\s+\w+\s+with|is\s+a\s+\w+\s+\w+\s+with)\b/i.test(text)
    
    return {
      usageOfKeywords: clamp(60 + words * 0.5),
      pronunciation: clamp(hasGrammarIssues ? 65 : 80),
      fluency: clamp(70 + sentences * 2),
      objectionHandling: clamp(65),
      queryResolution: clamp(70),
    }
  }
  
  const voiceA = scoreText(voiceATranscript)
  const voiceB = scoreText(voiceBTranscript)
  
  return Response.json({
    voiceA,
    voiceB,
    reasoning: "⚠️ AI comparison failed - using fallback scoring. The Groq API was called but the response couldn't be parsed. Scores are estimates based on text length and basic patterns. Check Vercel logs for details."
  })
}
