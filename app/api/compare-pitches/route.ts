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
  voiceAKeywords?: string[]
  voiceBKeywords?: string[]
  differences?: string
  reasoning?: string
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
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a professional sales pitch scorer. Score objectively and fairly based on content quality.

SCORING CRITERIA (0-100 each):
- usageOfKeywords: Product features, benefits, and relevant keywords mentioned
- pronunciation: Grammar quality, clarity, word choice
- fluency: Natural flow, smooth transitions, coherent structure  
- objectionHandling: Addresses concerns, builds confidence
- queryResolution: Complete information, answers implicit questions

CRITICAL SCORING RULES:
1. PROPORTIONAL SCORING: Similar pitch quality = similar scores (within 5-15 points)
2. FAIR DEDUCTIONS:
   - Minor grammar error: -3 to -5 points
   - Awkward phrasing: -5 to -10 points
   - Missing key element: -10 to -15 points
   - Major structural issue: -15 to -25 points
3. CONTEXT MATTERS: Both pitches are about the same product (Hydratrack water bottle)
4. FOCUS: Judge the message effectiveness, not perfection

EXAMPLE OF FAIR SCORING:
If Voice A says "Stay hydrated smarter with Hydratrack" (clear, good grammar)
And Voice B says "Stay Hydrated Smart with the Hydra tech" (minor grammar, similar message)
→ Voice A might score 85-90, Voice B should score 75-85 (NOT 30-40!)

Extract 5 main keywords from each pitch.

Return JSON only (no markdown):
{
  "voiceA": {"usageOfKeywords": 85, "pronunciation": 88, "fluency": 90, "objectionHandling": 78, "queryResolution": 82},
  "voiceB": {"usageOfKeywords": 82, "pronunciation": 80, "fluency": 85, "objectionHandling": 75, "queryResolution": 78},
  "voiceAKeywords": ["hydrated", "reusable", "bottle", "reminds", "drink"],
  "voiceBKeywords": ["hydrated", "reusable", "bottle", "gives", "drink"],
  "differences": "Both pitches convey similar message about Hydratrack. Voice B has minor grammar variations but maintains core value proposition."
}`
        },
        {
          role: "user",
          content: `Score these pitches:

Voice A: ${voiceATranscript}

Voice B: ${voiceBTranscript}`
        }
      ],
      temperature: 0.1,
      max_tokens: 800,
      response_format: { type: "json_object" },
    })

    const aiResponse = completion.choices[0]?.message?.content?.trim() || ""
    
    console.log("=== AI Response ===")
    console.log(aiResponse)
    console.log("===================")
    
    // Clean up AI response - handle multiple formats
    let cleanedResponse = aiResponse
    
    // Remove markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    
    // Try to extract JSON if there's text before/after
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0]
    }
    
    console.log("=== Cleaned Response ===")
    console.log(cleanedResponse)
    console.log("========================")
    
    // Parse AI response
    let parsedResponse: ComparisonScores
    try {
      parsedResponse = JSON.parse(cleanedResponse)
    } catch (parseError: any) {
      console.error("=== JSON Parse Error ===")
      console.error(parseError.message)
      console.error("Failed to parse:", cleanedResponse.substring(0, 500))
      console.error("========================")
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }
    
    console.log("=== Parsed Successfully ===")
    console.log(JSON.stringify(parsedResponse, null, 2))
    console.log("===========================")
    
    // Validate the response structure
    if (!parsedResponse.voiceA || !parsedResponse.voiceB) {
      throw new Error("Missing voiceA or voiceB in response")
    }
    
    // Validate required fields
    const requiredFields = ['usageOfKeywords', 'pronunciation', 'fluency', 'objectionHandling', 'queryResolution']
    for (const field of requiredFields) {
      if (typeof parsedResponse.voiceA[field as keyof typeof parsedResponse.voiceA] !== 'number') {
        throw new Error(`Missing or invalid ${field} in voiceA`)
      }
      if (typeof parsedResponse.voiceB[field as keyof typeof parsedResponse.voiceB] !== 'number') {
        throw new Error(`Missing or invalid ${field} in voiceB`)
      }
    }

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
      voiceAKeywords: parsedResponse.voiceAKeywords || [],
      voiceBKeywords: parsedResponse.voiceBKeywords || [],
      differences: parsedResponse.differences || parsedResponse.reasoning || "",
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
