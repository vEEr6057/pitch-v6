// Compress video file to meet Vercel's 4.5MB limit
export async function compressVideo(file: File, targetSizeMB: number = 4): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)
    
    video.onloadedmetadata = () => {
      // Calculate compression ratio based on file size
      const fileSizeMB = file.size / (1024 * 1024)
      const compressionRatio = Math.min(targetSizeMB / fileSizeMB, 1)
      
      // Reduce resolution based on compression needed
      const targetWidth = Math.floor(video.videoWidth * Math.sqrt(compressionRatio))
      const targetHeight = Math.floor(video.videoHeight * Math.sqrt(compressionRatio))
      
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      // Use MediaRecorder to re-encode the video
      const stream = canvas.captureStream(30)
      
      // Add audio from original video
      const audioContext = new AudioContext()
      const source = audioContext.createMediaElementSource(video)
      const dest = audioContext.createMediaStreamDestination()
      source.connect(dest)
      
      const audioTracks = dest.stream.getAudioTracks()
      audioTracks.forEach(track => stream.addTrack(track))
      
      const chunks: Blob[] = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 500000 // 500 kbps - lower for more compression
      })
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
          type: 'video/webm'
        })
        
        URL.revokeObjectURL(video.src)
        audioContext.close()
        resolve(compressedFile)
      }
      
      // Draw frames to canvas
      video.play()
      
      const drawFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop()
          return
        }
        
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
        requestAnimationFrame(drawFrame)
      }
      
      mediaRecorder.start()
      drawFrame()
    }
    
    video.onerror = () => {
      reject(new Error('Failed to load video'))
    }
  })
}
