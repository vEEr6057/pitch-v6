/**
 * Audio Extraction Utility
 * Extracts audio track from video files using FFmpeg
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createHash } from 'crypto'

const execPromise = promisify(exec)

export interface AudioExtractionResult {
  audioBuffer: Buffer
  format: 'mp3' | 'wav'
  duration: number
  sampleRate: number
  channels: number
}

export interface AudioExtractionOptions {
  format?: 'mp3' | 'wav'
  sampleRate?: number
  channels?: number
  bitrate?: string
}

/**
 * Extract audio from video buffer
 * @param videoBuffer - Video file as Buffer
 * @param options - Extraction options
 * @returns Audio buffer and metadata
 */
export async function extractAudioFromVideo(
  videoBuffer: Buffer,
  options: AudioExtractionOptions = {}
): Promise<AudioExtractionResult> {
  const {
    format = 'mp3',
    sampleRate = 16000,
    channels = 1,
    bitrate = '128k'
  } = options

  const timestamp = Date.now()
  const hash = createHash('md5').update(videoBuffer).digest('hex').substring(0, 8)
  const videoPath = join(tmpdir(), `video-${timestamp}-${hash}.mp4`)
  const audioPath = join(tmpdir(), `audio-${timestamp}-${hash}.${format}`)

  try {
    // Write video to temp file
    await writeFile(videoPath, videoBuffer)
    console.log(`[AudioExtractor] Video saved to: ${videoPath}`)

    // Build FFmpeg command
    const codec = format === 'mp3' ? 'libmp3lame' : 'pcm_s16le'
    const command = [
      'ffmpeg',
      '-i', `"${videoPath}"`,
      '-vn',                          // No video
      '-acodec', codec,               // Audio codec
      '-ar', sampleRate.toString(),   // Sample rate
      '-ac', channels.toString(),     // Audio channels
      format === 'mp3' ? `-b:a ${bitrate}` : '',  // Bitrate (MP3 only)
      `"${audioPath}"`,
      '-y'                            // Overwrite output
    ].filter(Boolean).join(' ')

    console.log(`[AudioExtractor] Running: ${command}`)

    // Execute FFmpeg
    const { stdout, stderr } = await execPromise(command)
    
    if (stderr && !stderr.includes('time=')) {
      console.warn('[AudioExtractor] FFmpeg stderr:', stderr)
    }

    // Read extracted audio
    const audioBuffer = await readFile(audioPath)
    console.log(`[AudioExtractor] Audio extracted: ${audioBuffer.length} bytes`)

    // Get audio duration using ffprobe
    const probeCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    const { stdout: durationOutput } = await execPromise(probeCommand)
    const duration = parseFloat(durationOutput.trim())

    console.log(`[AudioExtractor] Duration: ${duration}s`)

    return {
      audioBuffer,
      format,
      duration,
      sampleRate,
      channels
    }
  } catch (error) {
    console.error('[AudioExtractor] Error:', error)
    throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Cleanup temp files
    try {
      await unlink(videoPath)
      console.log(`[AudioExtractor] Cleaned up: ${videoPath}`)
    } catch (err) {
      console.warn('[AudioExtractor] Failed to delete video temp file:', err)
    }

    try {
      await unlink(audioPath)
      console.log(`[AudioExtractor] Cleaned up: ${audioPath}`)
    } catch (err) {
      console.warn('[AudioExtractor] Failed to delete audio temp file:', err)
    }
  }
}

/**
 * Extract audio from video file path
 * @param videoPath - Path to video file
 * @param options - Extraction options
 * @returns Audio buffer and metadata
 */
export async function extractAudioFromVideoFile(
  videoPath: string,
  options: AudioExtractionOptions = {}
): Promise<AudioExtractionResult> {
  const videoBuffer = await readFile(videoPath)
  return extractAudioFromVideo(videoBuffer, options)
}

/**
 * Check if FFmpeg is available
 * @returns true if FFmpeg is installed and accessible
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execPromise('ffmpeg -version')
    return true
  } catch (error) {
    console.error('[AudioExtractor] FFmpeg not found:', error)
    return false
  }
}

/**
 * Get FFmpeg version
 * @returns FFmpeg version string
 */
export async function getFFmpegVersion(): Promise<string> {
  try {
    const { stdout } = await execPromise('ffmpeg -version')
    const match = stdout.match(/ffmpeg version ([^\s]+)/)
    return match ? match[1] : 'unknown'
  } catch (error) {
    throw new Error('FFmpeg not found')
  }
}
