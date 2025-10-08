import { z } from "zod"

// Define interfaces for API types
interface Scores {
  usageOfKeywords: number;
  pronunciation: number;
  fluency: number;
  objectionHandling: number;
  queryResolution: number;
}

interface ScoreResponse {
  refinedText: string;
  scores: Scores;
  extractedKeywords: string[];
  notes?: string;
  usedFallback?: boolean;
}

interface RequestBody {
  transcript: string;
  keywords: string[];
  isSpeechInput?: boolean; // Flag to indicate if input came from speech recognition
}

// Zod schema for validation
const scoreSchema = z.object({
  refinedText: z.string().describe("Improved, concise version of the original transcript."),
  scores: z.object({
    usageOfKeywords: z.coerce.number().min(0).max(100),
    pronunciation: z.coerce.number().min(0).max(100),
    fluency: z.coerce.number().min(0).max(100),
    objectionHandling: z.coerce.number().min(0).max(100),
    queryResolution: z.coerce.number().min(0).max(100),
  }),
  extractedKeywords: z.array(z.string()).default([]).describe("Keywords identified by the AI when none were provided."),
  notes: z.string().optional().describe("Short notes about what influenced the scoring (1-2 sentences)."),
  usedFallback: z.boolean().optional().describe("Flag indicating if fallback scoring was used."),
})

function clampRound(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)))
}

function heuristicKeywords(text: string, max: number = 8): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "you",
    "your",
    "with",
    "that",
    "this",
    "from",
    "when",
    "time",
    "keep",
    "keeps",
    "kept",
    "are",
    "was",
    "were",
    "will",
    "shall",
    "into",
    "onto",
    "have",
    "has",
    "had",
    "it",
    "its",
    "is",
    "of",
    "to",
    "in",
    "on",
    "at",
    "as",
    "a",
    "an",
    "by",
    "or",
    "be",
    "we",
    "our",
    "us",
    "they",
    "them",
    "their",
    "i",
    "me",
    "my",
    "he",
    "she",
    "him",
    "her",
    "his",
    "hers",
    "but",
    "if",
    "so",
    "than",
    "then",
    "also",
    "even",
    "just",
    "more",
  ])
  const words = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w))

  const freq = new Map<string, number>()
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1)
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w)
}

export const maxDuration = 60

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>)
  const transcript = ((body?.transcript as string) || "").toString()
  const providedKeywords: string[] = Array.isArray(body?.keywords) ? (body.keywords as string[]) : []
  const isSpeechInput = Boolean(body?.isSpeechInput) // Flag for speech vs text input

  if (!transcript) {
    return new Response("Missing transcript", { status: 400 })
  }

  const words = transcript.trim().split(/\s+/).filter(Boolean)

  // NO REFINEMENT - Use raw transcript only
  const rawTranscript = transcript.trim()

  // Keywords: prefer provided; otherwise infer locally
  const baseKeywords = providedKeywords.length > 0 ? providedKeywords : heuristicKeywords(rawTranscript, 10)

  // Ensure important domain terms are present if mentioned
  const lower = rawTranscript.toLowerCase()
  const domainTerms = ["price", "cost", "reimbursement", "coverage", "insurance"]
  const withDomain = new Set(baseKeywords.map((k) => k.toLowerCase()))
  for (const term of domainTerms) {
    if (lower.includes(term)) withDomain.add(term)
  }
  const extractedKeywords = Array.from(withDomain).slice(0, 12)

  // Calculate word count, sentence count, and avg word length for better metrics
  const wordCount = rawTranscript.split(/\s+/).filter(Boolean).length;
  const sentences = rawTranscript.split(/[.!?]+/).filter(Boolean).length;
  const avgWordLength = words.join('').length / Math.max(1, words.length);
  
  // Usage of keywords score - advanced algorithm
  let usage = 0;
  if (extractedKeywords.length > 0) {
    // Weight by keyword frequency and position
    let weightedScore = 0;
    let totalPossibleScore = 0;
    
    extractedKeywords.forEach((keyword, index) => {
      const weight = 1 - (index * 0.5 / extractedKeywords.length); // Earlier keywords worth more
      totalPossibleScore += weight * 10;
      
      // Count occurrences
      const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
      const matches = rawTranscript.match(regex) || [];
      const occurrences = matches.length;
      
      // Check if keyword appears in first or last sentence (important positions)
      const sentences = rawTranscript.split(/[.!?]+/).filter(Boolean);
      const inFirstSentence = sentences[0]?.toLowerCase().includes(keyword.toLowerCase());
      const inLastSentence = sentences[sentences.length-1]?.toLowerCase().includes(keyword.toLowerCase());
      
      // Score this keyword (occurrences + position bonus)
      const keywordScore = Math.min(10, occurrences * 2 + (inFirstSentence ? 2 : 0) + (inLastSentence ? 2 : 0));
      weightedScore += weight * keywordScore;
    });
    
    usage = clampRound(50 + (weightedScore / totalPossibleScore) * 40); // 50-90 range
  }
  
  // Text quality metrics
  const readabilityScore = clampRound(Math.min(100, Math.max(0, 
    // Formula based on simplified Flesch-Kincaid readability
    85 - (avgWordLength * 10) + (sentences * 2)
  )));
  
  // Content structure assessment
  const hasIntroduction = /^(greetings|hello|hi|good|dear|welcome)/i.test(rawTranscript);
  const hasConclusion = /(thank|appreciate|consider|conclusion|in summary|sincerely|regards)/i.test(rawTranscript);
  
  // Engagement assessment
  const questionCount = rawTranscript.split('?').length - 1;
  const engagementPatterns = [/\bwould you\b/gi, /\bconsider\b/gi, /\bplease\b/gi, /\bmay\b/gi].map(
    pattern => (rawTranscript.match(pattern) || []).length
  ).reduce((sum, count) => sum + count, 0);
  
  // Detect persuasive language
  const persuasiveWords = ['advantage', 'benefit', 'value', 'improve', 'better', 'best', 'solution', 'opportunity', 
                           'effective', 'efficient', 'quality', 'save', 'proven', 'guarantee', 'recommend']
    .filter(word => new RegExp('\\b' + word + '\\b', 'i').test(rawTranscript))
    .length;
    
  // ALWAYS USE SPEECH-BASED SCORING (as per requirements)
  let pronunciation, fluency, objectionHandling, queryResolution;
  
  // Pronunciation/Delivery - For speech, evaluate based on natural flow and speech patterns
  const naturalSpeechPatterns = [
    /\b(um|uh|you know|like|well|so)\b/gi, // Filler words (some are natural)
    /\b(let me|I mean|basically|actually)\b/gi, // Natural speech connectors
  ];
  const fillerCount = naturalSpeechPatterns.reduce((count, pattern) => 
    count + (rawTranscript.match(pattern) || []).length, 0
  );
  
  // Moderate filler words are natural in speech, too many or too few might indicate issues
  const fillerScore = fillerCount > 0 && fillerCount <= 3 ? 20 : (fillerCount > 6 ? -15 : 5);
  
  // Speech tends to have longer sentences and more natural pauses
  pronunciation = clampRound(Math.min(100, Math.max(50, 
    70 + // base score for speech
    fillerScore + // natural speech patterns
    (avgWordLength < 5 ? 10 : 0) + // shorter words are clearer in speech
    (sentences > 2 ? 10 : 0) // multiple sentences show good pacing
  )));
  
  // Fluency - For speech, focus on conversational flow and coherence
  const conversationalMarkers = [
    /\b(and then|after that|next|finally|first|second)\b/gi, // Sequence markers
    /\b(because|since|however|although|but)\b/gi, // Logical connectors
  ];
  const flowMarkers = conversationalMarkers.reduce((count, pattern) => 
    count + (rawTranscript.match(pattern) || []).length, 0
  );
  
  fluency = clampRound(Math.min(100, Math.max(60, 
    75 + // higher base for speech
    (flowMarkers * 3) + // conversational flow bonus
    (wordCount > 30 ? 15 : Math.floor(wordCount / 2)) + // length appropriate for speech
    (sentences > 1 && sentences < 8 ? 10 : 0) // good sentence variety
  )));
  
  // Objection Handling - For speech, look for interactive and responsive language
  const interactiveLanguage = [
    /\b(I understand|I see|that's a good point|you might be thinking)\b/gi,
    /\b(let me address|what if|suppose|imagine)\b/gi,
    /\b(many people ask|common concern|often hear)\b/gi
  ];
  const interactionCount = interactiveLanguage.reduce((count, pattern) => 
    count + (rawTranscript.match(pattern) || []).length, 0
  );
  
  objectionHandling = clampRound(Math.min(100, Math.max(50,
    65 + // higher base for speech
    (interactionCount * 8) + // interactive language bonus
    (persuasiveWords * 3) + // persuasive language
    (questionCount > 0 ? 15 : 0) // questions show engagement
  )));
  
  // Query Resolution - Speech-based scoring
  const baseQueryScore = 65; // Speech gets higher base
  queryResolution = clampRound(Math.min(100, Math.max(40, 
    baseQueryScore + // base score
    Math.min(20, questionCount * 5) + // question bonus
    Math.min(25, engagementPatterns * 5) // engagement bonus
  )));

  const response: ScoreResponse = {
    refinedText: rawTranscript, // Return raw transcript, no refinement
    scores: {
      usageOfKeywords: usage,
      pronunciation,
      fluency,
      objectionHandling,
      queryResolution,
    },
    extractedKeywords,
    usedFallback: true,
    notes: "Evaluated using speech-based criteria focusing on natural delivery and conversational flow.",
  }
  
  return Response.json(response)
}