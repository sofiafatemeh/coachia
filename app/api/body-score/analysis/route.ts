import { NextResponse } from 'next/server'
import { getBodyScoreClient } from '@/lib/bodyscore'
import { getBodyScoreSyncService } from '@/lib/bodyscore-sync'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { imageUrl, height, gender, age } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    const syncService = getBodyScoreSyncService()
    const result = await syncService.syncAnalysis(imageUrl, {
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

    const syncService = getBodyScoreSyncService()

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

    // Default: get latest analysis
    const result = await syncService.getLatestAnalysis()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching BodyScore data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BodyScore data' },
      { status: 500 }
    )
  }
}