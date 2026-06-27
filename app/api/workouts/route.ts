import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }
    
    const workouts = await prisma.workout.findMany({
      where: { userId },
      include: {
        exercises: {
          include: {
            sets: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    })
    
    return NextResponse.json(workouts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const workout = await prisma.workout.create({
      data: {
        userId: body.userId,
        name: body.name,
        description: body.description,
        duration: body.duration,
        calories: body.calories,
        volume: body.volume,
        completedAt: new Date(body.completedAt),
        hevyId: body.hevyId,
      },
    })
    
    return NextResponse.json(workout)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
  }
}