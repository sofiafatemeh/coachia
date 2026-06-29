import { NextResponse } from 'next/server'
import { getClaudeClient } from '@/lib/claude'
import { getClaudeSyncService } from '@/lib/claude-sync'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { imageUrl, height, gender, age, model } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    const syncService = getClaudeSyncService()
    const result = await syncService.analyzePhoto(imageUrl, {
      height,
      gender,
      age,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error analyzing photo:', error)
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
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