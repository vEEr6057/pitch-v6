import { Scores } from "./scores"

export interface VideoResult {
  scores: Scores
  transcript: string
  eyeContactDetails?: {
    totalFrames: number
    eyeContactFrames: number
    faceDetectionRate: number
  }
}
