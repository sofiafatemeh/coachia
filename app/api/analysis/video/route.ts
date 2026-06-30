import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { videoUrl, exercise } = body

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      )
    }

    // MediaPipe runs in browser - server receives pre-analyzed data
    const userId = await getOrCreateSystemUserId()
    const video = await prisma.video.create({
      data: {
        userId,
        url: videoUrl,
        exercise: exercise || 'squat',
        duration: 0 // TODO: Calculate from video
      }
    })

    return NextResponse.json({
      video,
      message: 'Video data stored successfully. MediaPipe analysis should be done client-side.'
    }, { status: 201 })
  } catch (error) {
    console.error('Error storing video data:', error)
    return NextResponse.json(
      { error: 'Failed to store video data' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const exercise = searchParams.get('exercise')

    if (!videoId && !exercise) {
      return NextResponse.json(
        { error: 'videoId or exercise is required' },
        { status: 400 }
      )
    }

    const videos = await prisma.video.findMany({
      where: {
        OR: [
          videoId ? { id: videoId } : {},
          exercise ? { exercise } : {}
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