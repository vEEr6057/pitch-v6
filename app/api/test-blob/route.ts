import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET() {
  try {
    // Check if BLOB token exists
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    
    if (!hasBlobToken) {
      return NextResponse.json({
        success: false,
        error: 'BLOB_READ_WRITE_TOKEN not found',
        message: 'Vercel Blob storage is not configured. Please connect a Blob store in Vercel dashboard.'
      })
    }

    // Try to list all blobs
    const { blobs } = await list({
      prefix: 'pharma-pitches/',
    })

    // Try to list ALL blobs (no prefix)
    const { blobs: allBlobs } = await list()

    return NextResponse.json({
      success: true,
      message: 'Blob storage is configured correctly',
      hasBlobToken: true,
      tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 15) + '...',
      pharmaAudios: {
        count: blobs.length,
        files: blobs.map(b => ({
          pathname: b.pathname,
          url: b.url,
          size: b.size,
          uploadedAt: b.uploadedAt
        }))
      },
      allBlobs: {
        count: allBlobs.length,
        files: allBlobs.map(b => ({
          pathname: b.pathname,
          size: b.size
        }))
      }
    })

  } catch (error: any) {
    console.error('Blob test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.toString()
    }, { status: 500 })
  }
}
