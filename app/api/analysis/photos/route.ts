import { NextResponse } from 'next/server'
import { getClaudeClient } from '@/lib/claude'
import { getClaudeSyncService } from '@/lib/claude-sync'
import sharp from 'sharp'

async function compressImage(base64: string, maxWidth: number = 800): Promise<string> {
  try {
    // Decode base64
    const buffer = Buffer.from(base64, 'base64')

    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    console.log('[API] Original image:', metadata.width, 'x', metadata.height, 'Size:', buffer.length, 'bytes')

    // Resize and compress
    const compressed = await sharp(buffer)
      .resize(maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 70 })
      .toBuffer()

    const compressedBase64 = compressed.toString('base64')
    console.log('[API] Compressed image: Size:', compressed.length, 'bytes', 'Reduction:', ((1 - compressed.length / buffer.length) * 100).toFixed(1) + '%')

    return compressedBase64
  } catch (error) {
    console.error('[API] Error compressing image:', error)
    return base64 // Return original if compression fails
  }
}

export async function POST(request: Request) {
  try {
    console.log('[API] POST /api/analysis/photos - Starting...')

    const body = await request.json()
    console.log('[API] Request body type:', body.imageUrl ? 'URL' : body.imageBase64 ? 'Base64' : 'None')

    let { imageUrl, imageBase64, height, gender, age, model } = body

    if (!imageUrl && !imageBase64) {
      console.error('[API] imageUrl or imageBase64 is required')
      return NextResponse.json(
        { error: 'imageUrl or imageBase64 is required' },
        { status: 400 }
      )
    }

    // If base64, compress it
    if (imageBase64) {
      console.log('[API] Compressing base64 image...')
      imageBase64 = await compressImage(imageBase64, 800)
    }

    // Convert base64 to data URL if needed
    const finalImageUrl = imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl

    console.log('[API] Calling syncService.analyzePhoto...')
    const syncService = getClaudeSyncService()
    const result = await syncService.analyzePhoto(finalImageUrl, {
      height,
      gender,
      age,
    })

    console.log('[API] Analysis successful')
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[API] Error analyzing photo:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
    }
    return NextResponse.json(
      { error: 'Failed to analyze photo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const syncService = getClaudeSyncService()

    if (action === 'history') {
      // Get analyses history
      const days = parseInt(searchParams.get('days') || '30')
      const result = await syncService.getAnalysesHistory(undefined, days)
      return NextResponse.json(result)
    }

    if (action === 'progress') {
      // Calculate progress
      const days = parseInt(searchParams.get('days') || '30')
      const result = await syncService.calculateProgress(undefined, days)
      return NextResponse.json(result)
    }

    if (action === 'compare') {
      // Compare specific photos
      const photos = searchParams.get('photos')?.split(',')
      if (!photos || photos.length < 2) {
        return NextResponse.json(
          { error: 'Need at least 2 photos to compare' },
          { status: 400 }
        )
      }

      const claude = getClaudeClient()
      const result = await claude.analyzeProgress(photos, {
        days: parseInt(searchParams.get('days') || '30'),
      })
      return NextResponse.json(result)
    }

    // Default: get latest analysis
    const result = await syncService.getLatestAnalysis()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching Claude data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Claude data' },
      { status: 500 }
    )
  }
}