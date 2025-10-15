import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(request: NextRequest) {
  try {
    console.log('=== Fetching cloud audios ===')
    console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN)
    console.log('Token preview:', process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + '...')
    
    // List all blobs from Vercel Blob storage with the same prefix as pitch-v3
    const { blobs } = await list({
      prefix: 'pharma-pitches/',
    })

    console.log('Total blobs found:', blobs.length)
    console.log('Blob details:', blobs.map(b => ({
      pathname: b.pathname,
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt
    })))

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

    console.log('Returning audios:', audios.length)
    return NextResponse.json({ audios })

  } catch (error) {
    console.error('Error listing cloud audios:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to list cloud audios', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
