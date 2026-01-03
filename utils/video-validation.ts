import { VIDEO_CONFIG } from "@/constants/video-config"

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('video/')) {
    return { valid: false, error: "Please upload a valid video file" }
  }

  if (file.size > VIDEO_CONFIG.MAX_FILE_SIZE) {
    return { valid: false, error: "Video file is too large (max 50MB)" }
  }

  return { valid: true }
}
