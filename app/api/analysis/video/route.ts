import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getMediaPipeSyncService } from '@/lib/mediapipe-sync'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { videoUrl, exerciseId, workoutId, frames } = body

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      )
    }

    const syncService = getMediaPipeSyncService()
    
    let result
    if (frames && frames.length > 0) {
      // Full analysis with keyframes + Claude
      result = await syncService.analyzeVideoWithKeyframes(videoUrl, frames)
    } else {
      // Basic analysis only
      result = await syncService.analyzeVideo(videoUrl, {
        exerciseId,
        workoutId
      })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error analyzing video:', error)
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const exerciseId = searchParams.get('exerciseId')
    const workoutId = searchParams.get('workoutId')

    if (!videoId && !exerciseId && !workoutId) {
      return NextResponse.json(
        { error: 'videoId, exerciseId, or workoutId is required' },
        { status: 400 }
      )
    }

    // Query database for video analyses
    const videos = await prisma.video.findMany({
      where: {
        OR: [
          videoId ? { id: videoId } : {},
          exerciseId ? { exerciseId } : {},
          workoutId ? { workoutId } : {}
        ].filter(Boolean)
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return NextResponse.json({
      videos,
      total: videos.length,
      message: `Found ${videos.length} video analyses`
    })
  } catch (error) {
    console.error('Error fetching video analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video analyses' },
      { status: 500 }
    )
  }
}