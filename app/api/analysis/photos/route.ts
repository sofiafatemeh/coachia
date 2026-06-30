import { NextResponse } from 'next/server'
import { getClaudeClient } from '@/lib/claude'
import { getClaudeSyncService } from '@/lib/claude-sync'

export async function POST(request: Request) {
  try {
    console.log('[API] POST /api/analysis/photos - Starting...')

    const body = await request.json()
    console.log('[API] Request body:', JSON.stringify(body, null, 2))

    const { imageUrl, imageBase64, height, gender, age, model } = body

    if (!imageUrl && !imageBase64) {
      console.error('[API] imageUrl or imageBase64 is required')
      return NextResponse.json(
        { error: 'imageUrl or imageBase64 is required' },
        { status: 400 }
      )
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

    console.log('[API] Analysis successful:', JSON.stringify(result, null, 2))
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[API] Error analyzing photo:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
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