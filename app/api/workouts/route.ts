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

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    // ExerciseSet requires BOTH exerciseId AND workoutId (non-null). Creating sets
    // nested under an exercise only fills exerciseId, so the workout id has to be
    // supplied explicitly. We build the graph in a transaction to keep it consistent.
    const workout = await prisma.$transaction(async (tx) => {
      const created = await tx.workout.create({
        data: {
          userId,
          name,
          description: description || null,
          duration: duration || null,
          calories: calories || null,
          volume: volume || null,
          completedAt: new Date(),
        },
      })

      if (Array.isArray(exercises)) {
        for (const ex of exercises) {
          const exercise = await tx.exercise.create({
            data: { workoutId: created.id, name: ex.name },
          })

          if (Array.isArray(ex.sets) && ex.sets.length > 0) {
            await tx.exerciseSet.createMany({
              data: ex.sets.map((s: any, index: number) => ({
                workoutId: created.id,
                exerciseId: exercise.id,
                reps: s.reps,
                weight: s.weight,
                rpe: s.rpe ?? null,
                duration: s.duration ?? null,
                setIndex: index,
              })),
            })
          }
        }
      }

      return tx.workout.findUnique({
        where: { id: created.id },
        include: { exercises: { include: { sets: true } } },
      })
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    console.error('Error creating workout:', error)
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
  }
}