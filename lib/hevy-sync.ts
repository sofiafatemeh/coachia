import prisma from '@/lib/prisma'
import { getHevyClient, type HevyWorkout, type HevyExercise, type HevySet } from '@/lib/heavy'

export class HevySyncService {
  private hevy = getHevyClient()

  async syncWorkouts(options?: { days?: number }) {
    const days = options?.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get system user
    let user = await prisma.user.findUnique({
      where: { email: 'system@example.com' },
    })

    if (!user) {
      throw new Error('System user not found. Call /api/create-user first.')
    }

    // Fetch workouts from Hevy
    const { workouts } = await this.hevy.getWorkouts({
      startDate: startDate.toISOString(),
      pageSize: 100
    })

    let synced = 0
    let errors = 0

    for (const workout of workouts) {
      try {
        await this.syncWorkout(workout, user.id)
        synced++
      } catch (error) {
        console.error(`Error syncing workout ${workout.id}:`, error)
        errors++
      }
    }

    return {
      total: workouts.length,
      synced,
      errors,
      message: `Synced ${synced}/${workouts.length} workouts from Hevy`
    }
  }

  private async syncWorkout(hevyWorkout: HevyWorkout, userId: string) {
    // Check if workout already exists by hevyId
    const existing = await prisma.workout.findFirst({
      where: { hevyId: hevyWorkout.id }
    })

    if (existing) {
      return // Skip if already synced
    }

    // Create workout
    const workout = await prisma.workout.create({
      data: {
        userId,
        name: hevyWorkout.title,
        description: hevyWorkout.description || '',
        hevyId: hevyWorkout.id,
        startedAt: new Date(hevyWorkout.start_time),
        completedAt: new Date(hevyWorkout.end_time),
      }
    })

    // Sync exercises
    for (const hevyExercise of hevyWorkout.exercises) {
      await this.syncExercise(workout.id, hevyExercise)
    }
  }

  private async syncExercise(workoutId: string, hevyExercise: HevyExercise) {
    // Check if exercise template exists
    let exercise = await prisma.exercise.findFirst({
      where: {
        source: 'HEVY',
        sourceId: hevyExercise.exercise_template.id
      }
    })

    // Create exercise template if not exists
    if (!exercise) {
      exercise = await prisma.exercise.create({
        data: {
          name: hevyExercise.exercise_template.name,
          source: 'HEVY',
          sourceId: hevyExercise.exercise_template.id,
          workoutId,
        }
      })
    }

    // Sync sets
    for (const hevySet of hevyExercise.sets) {
      await this.syncSet(exercise.id, hevySet)
    }
  }

  private async syncSet(exerciseId: string, hevySet: HevySet) {
    await prisma.exerciseSet.create({
      data: {
        exerciseId,
        reps: hevySet.reps,
        weight: hevySet.weight_kg,
        rpe: hevySet.rpe,
        duration: hevySet.duration_seconds,
        setType: hevySet.set_type || 'normal',
        oneRm: hevySet.one_rm,
        isToFailure: hevySet.is_to_failure || false,
        isWarmup: hevySet.is_warmup || false,
        isDropSet: hevySet.is_drop_set || false,
        setIndex: 0, // TODO: Calculate from exercise order
        supersetIds: hevySet.supersets || [],
        createdAt: new Date(hevySet.created_at)
      }
    })
  }

  async syncBodyweight() {
    // Get system user
    let user = await prisma.user.findUnique({
      where: { email: 'system@example.com' },
    })

    if (!user) {
      throw new Error('System user not found. Call /api/create-user first.')
    }

    const { bodyweight } = await this.hevy.getBodyweight()

    let synced = 0
    let errors = 0

    for (const bw of bodyweight) {
      try {
        // Check if bodyweight already exists (by date)
        const existing = await prisma.measurement.findFirst({
          where: {
            userId: user.id,
            createdAt: {
              gte: new Date(bw.date),
              lt: new Date(new Date(bw.date).getTime() + 24 * 60 * 60 * 1000)
            }
          }
        })

        if (existing) {
          continue
        }

        // Create measurement
        await prisma.measurement.create({
          data: {
            userId: user.id,
            weight: bw.weight_kg,
            createdAt: new Date(bw.date)
          }
        })

        synced++
      } catch (error) {
        console.error(`Error syncing bodyweight ${bw.id}:`, error)
        errors++
      }
    }

    return {
      total: bodyweight.length,
      synced,
      errors,
      message: `Synced ${synced}/${bodyweight.length} bodyweight records from Hevy`
    }
  }
}

// Singleton instance
let syncService: HevySyncService

export const getHevySyncService = () => {
  if (!syncService) {
    syncService = new HevySyncService()
  }
  return syncService
}