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
      model: "llama-3.1-8b-instant", // Faster, more reliable model
      messages: [
        {
          role: "system",
          content: `You are a sales pitch scorer. Return ONLY valid JSON, no other text.

Score both pitches (0-100) on:
- usageOfKeywords: product keywords and benefits
- pronunciation: grammar and clarity
- fluency: flow and structure
- objectionHandling: addresses concerns
- queryResolution: completeness

JSON format:
{
  "voiceA": {"usageOfKeywords": 75, "pronunciation": 85, "fluency": 90, "objectionHandling": 70, "queryResolution": 80},
  "voiceB": {"usageOfKeywords": 65, "pronunciation": 70, "fluency": 75, "objectionHandling": 65, "queryResolution": 70},
  "reasoning": "explanation here"
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
      reasoning: parsedResponse.reasoning || "AI analysis completed",
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
