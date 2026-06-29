import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all workouts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const workouts = await prisma.workout.findMany({
      where: userId ? { userId } : undefined,
      include: {
        exercises: {
          include: {
            sets: true
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    })

    return NextResponse.json(workouts)
  } catch (error) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}

// POST create workout
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, name, description, duration, calories, volume, exercises } = body

    const workout = await prisma.workout.create({
      data: {
        userId,
        name,
        description: description || null,
        duration: duration || null,
        calories: calories || null,
        volume: volume || null,
        completedAt: new Date(),
        exercises: exercises ? {
          create: exercises.map((ex: any) => ({
            name: ex.name,
            sets: {
              create: ex.sets ? ex.sets.map((s: any) => ({
                reps: s.reps,
                weight: s.weight,
                rpe: s.rpe || null,
                duration: s.duration || null
              })) : []
            }
          }))
        } : undefined
      }
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    console.error('Error creating workout:', error)
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
  }
}