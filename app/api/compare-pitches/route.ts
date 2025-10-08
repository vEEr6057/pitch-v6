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
  try {
    const body = await req.json()
    const voiceATranscript = body.voiceATranscript || ""
    const voiceBTranscript = body.voiceBTranscript || ""

    if (!voiceATranscript || !voiceBTranscript) {
      return Response.json({ error: "Both transcripts required" }, { status: 400 })
    }

    // Use AI to compare both pitches side-by-side
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert sales pitch evaluator. Compare TWO pitch transcripts and score them based on:

1. **Usage of Keywords**: Relevant product/service keywords and benefits
2. **Pronunciation/Clarity**: Grammar, professional language, clear phrasing
3. **Fluency**: Flow, coherence, structure
4. **Objection Handling**: Anticipating concerns, addressing benefits
5. **Query Resolution**: Completeness, answering potential questions

IMPORTANT: 
- Give DIFFERENT scores based on actual quality differences
- If one pitch has grammar errors, score it lower
- If one pitch is clearer, score it higher
- If one pitch is more complete, score it higher
- Don't give identical scores unless they're truly equal quality

Respond with valid JSON (no markdown):
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
    
    // Parse AI response
    const parsedResponse: ComparisonScores = JSON.parse(aiResponse)

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
    return Response.json(
      { error: error.message || "Comparison failed" },
      { status: 500 }
    )
  }
}
