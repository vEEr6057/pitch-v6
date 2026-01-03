export const VIDEO_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ACCEPTED_FORMATS: ['video/mp4', 'video/webm', 'video/mov'],
  RECORDING_DURATION: 45000, // 45 seconds
  RECORDING_RESOLUTION: {
    width: 854,
    height: 480
  }
} as const
