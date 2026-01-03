import { VideoResult } from "./video-result"

export interface ComparisonResult {
  videoA: VideoResult
  videoB: VideoResult
  comparison: {
    overallDifference: number
    strengths: string[]
    improvements: string[]
  }
  eyeContactAnalysis: {
    videoA: { score: number; feedback: string }
    videoB: { score: number; feedback: string }
  }
}
