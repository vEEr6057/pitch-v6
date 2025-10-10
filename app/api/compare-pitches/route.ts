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
          content: `You are an expert pharmaceutical and medical sales pitch evaluator with deep understanding of healthcare marketing.

IMPORTANT CONTEXT:
- Voice A is the ORIGINAL/GOLD STANDARD pitch (always score 80-95, highlight positives only)
- Voice B is the USER'S pitch that needs detailed evaluation and scoring (score 0-100 based on actual quality)
- These are PHARMACEUTICAL/MEDICAL sales pitches - expect medical terminology, drug names, dosages, clinical terms
- Medical jargon and technical language are NORMAL and EXPECTED - do NOT penalize for using proper medical terms

SCORING CRITERIA FOR VOICE B (0-100 each):

1. **usageOfKeywords** (0-100):
   - Medical/pharmaceutical terms: drug names, generic names, brand names
   - Clinical indications: diseases, conditions, symptoms (e.g., "BPH", "prostate size", "hypertension")
   - Dosage information: milligrams, timing, frequency
   - Mechanism of action or drug class mentions
   - Therapeutic benefits and outcomes
   Score HIGH (70-90) if pitch includes 4+ relevant medical terms/drug info

2. **pronunciation** (0-100):
   - Medical terminology used correctly in context
   - Clear communication of dosages and technical details
   - Grammar appropriate for professional medical setting
   - NOT about accent - about clarity and correctness
   Note: Technical terms like "Silodin", "BPH", "milligrams" are CORRECT usage, not errors

3. **fluency** (0-100):
   - Logical flow: Indication → Product → Benefits → Dosage → Call to action
   - Smooth transitions between clinical concepts
   - Coherent structure even if technical/dense
   - Natural pacing for medical content
   Score 60+ if pitch follows medical pitch structure, even if technical

4. **objectionHandling** (Addressing Concerns, 0-100):
   - Mentions clinical benefits, efficacy, or advantages
   - Addresses safety, tolerability, or patient outcomes
   - Compares to alternatives or highlights differentiation
   - Mentions manufacturing quality, certifications (e.g., "GMP plant")
   - Provides evidence or credibility markers
   CRITICAL: If pitch mentions ANY benefits, efficacy, or product advantages, score MINIMUM 35-50

5. **queryResolution** (Solution Providing, 0-100):
   - Provides dosage and administration details
   - Explains patient selection or indication
   - Mentions when/how to prescribe
   - Includes call to action for doctors
   - Answers "what, when, how, who" questions
   CRITICAL: If pitch provides dosage, indication, or prescribing info, score MINIMUM 35-50

PHARMACEUTICAL PITCH SCORING EXAMPLES:

Example 1 - Good Medical Pitch (Voice B should score 65-80):
"Good morning doctor, for BPH with prostate size >30cc, prescribe Dosin D. It contains Silodin 4.8mg + Dutasteride 0.5mg, manufactured in GMP plant with 24-hour efficacy for BPH symptoms."
- usageOfKeywords: 75 (has drug name, indication, dosage, benefit)
- pronunciation: 70 (clear medical communication)
- fluency: 72 (follows indication→product→benefit flow)
- objectionHandling: 68 (mentions 24-hour efficacy, GMP quality)
- queryResolution: 70 (provides dosage, indication, when to prescribe)

Example 2 - Weak Medical Pitch (Voice B should score 30-45):
"Doctor, please prescribe our medicine for prostate. It is good quality. Thank you."
- usageOfKeywords: 35 (mentions condition but lacks specifics)
- pronunciation: 40 (very basic, no medical detail)
- fluency: 38 (too brief, no structure)
- objectionHandling: 32 (says "good quality" but no real benefits)
- queryResolution: 30 (no dosage, no details)

CRITICAL SCORING RULES:
- This is a PHARMACEUTICAL sales pitch - professional and informative
- Professional pitches with medical content = 55-85 range
- Incomplete but has key info (drug name, indication) = 40-60 range
- Very vague or unprofessional ("whatever", dismissive) = 20-40 range

BALANCED EVALUATION:
- If pitch mentions drug name + indication + any benefit = 50-70
- If pitch has dosage + professional language = 60-80
- If pitch is complete with call-to-action = 70-90
- Only score VERY LOW (20-35) if truly terrible (dismissive, no info)

PHARMACEUTICAL PITCH SCORING EXAMPLES:

Example 1 - Excellent Pitch (Voice B should score 70-85):
"Good morning doctor, for BPH with prostate size >30cc, prescribe Dosin D. It contains Silodin 4.8mg + Dutasteride 0.5mg, manufactured in GMP plant with 24-hour efficacy for BPH symptoms. Please consider prescribing. Thank you."
- usageOfKeywords: 78 (drug name, indication, dosage, benefit)
- pronunciation: 75 (professional medical communication)
- fluency: 76 (clear indication→product→benefit flow)
- objectionHandling: 72 (mentions efficacy, GMP quality)
- queryResolution: 74 (provides dosage, indication, prescribing info)

Example 2 - Good Pitch with Minor Issues (Voice B should score 55-70):
"Good morning doctor. For BPH recommend losing B with Psylodine 4.8mg plus Duastride, GMP certified with 24 hour efficiency. Please consider prescribing. Thank you."
- usageOfKeywords: 65 (has drug name, indication, dosage - some unclear words)
- pronunciation: 58 (some pronunciation issues but professional tone)
- fluency: 62 (decent structure, minor clarity issues)
- objectionHandling: 60 (mentions benefits, professional approach)
- queryResolution: 63 (provides key info despite minor errors)

Example 3 - Incomplete but Acceptable (Voice B should score 40-55):
"For BPH prescribe Dosing D with good benefits for symptoms."
- usageOfKeywords: 45 (mentions drug and indication but vague)
- pronunciation: 42 (basic communication, lacks detail)
- fluency: 48 (simple structure, no complexity)
- objectionHandling: 40 (mentions benefits vaguely)
- queryResolution: 43 (missing dosage and specifics)

Example 4 - Poor/Dismissive (Voice B should score 15-35):
"Dosing D is okay. Whatever drug we're prescribing for BPH or something. I don't want to explain."
- usageOfKeywords: 28 (mentions terms but dismissive)
- pronunciation: 22 (unprofessional "whatever", "or something")
- fluency: 25 (disjointed, unprofessional tone)
- objectionHandling: 18 ("I don't want" = very unprofessional)
- queryResolution: 20 (refuses to provide information)

SCORING RULES:
- Voice A: Always score 80-95 (it's the gold standard)
- Voice B: Score 0-100 based on actual pharmaceutical pitch quality
- NEVER score 0 unless pitch is completely empty or totally off-topic
- If Voice B mentions drug name + indication + any clinical detail = MINIMUM 40-50 overall
- Technical medical language = POSITIVE, not negative
- Dosage information = HIGH value for queryResolution
- Clinical benefits mentioned = HIGH value for objectionHandling

Extract 5 main keywords from each pitch (prioritize medical terms, drug names, indications).

For "differences": Describe Voice A positively, give constructive feedback for Voice B.

Return JSON only (no markdown):
{
  "voiceA": {"usageOfKeywords": 85, "pronunciation": 88, "fluency": 90, "objectionHandling": 86, "queryResolution": 87},
  "voiceB": {"usageOfKeywords": 68, "pronunciation": 65, "fluency": 70, "objectionHandling": 62, "queryResolution": 67},
  "voiceAKeywords": ["BPH", "prostate", "Dosin D", "prescription", "efficacy"],
  "voiceBKeywords": ["BPH", "prostate", "Silodin", "comrades", "doctor"],
  "differences": "Original pitch demonstrates excellent clarity with strong clinical structure and comprehensive product information. Your pitch covers key medical points and includes important dosage details, though could improve grammar flow and strengthen the closing call to action for better impact."
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
