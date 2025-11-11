import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(request: NextRequest) {
  try {
    // List all blobs from Vercel Blob storage with the same prefix as pitch-v3
    const { blobs } = await list({
      prefix: 'pharma-pitches/',
    })

    // Transform blob data for our interface
    const audios = blobs.map(blob => {
      const pathname = blob.pathname
      const parts = pathname.replace('pharma-pitches/', '').split('.')
      const format = parts.pop() || 'mp3'
      const filename = parts.join('.')

      return {
        id: blob.url,
        filename: filename,
        url: blob.url,
        format: format,
        size: blob.size,
        createdAt: blob.uploadedAt
      }
    })

    // Sort by creation date (newest first)
    audios.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ audios })

  } catch (error) {
    console.error('Error listing cloud audios:', error)
    return NextResponse.json(
      { error: 'Failed to list cloud audios' },
      { status: 500 }
    )
  }
}
