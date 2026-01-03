import { useState } from "react"
import { ComparisonResult } from "@/types"
import { API_ENDPOINTS } from "@/constants/api-endpoints"

export function useVideoEvaluation() {
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const evaluate = async (videoA: File, videoB: File) => {
    setIsEvaluating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('videoA', videoA)
      formData.append('videoB', videoB)

      const response = await fetch(API_ENDPOINTS.EVALUATE_VIDEOS, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to evaluate videos')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate videos')
    } finally {
      setIsEvaluating(false)
    }
  }

  return { isEvaluating, result, error, evaluate, setError }
}
