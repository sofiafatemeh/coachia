import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getHevyClient, type HevyWorkout } from '@/lib/heavy'
import { getOrCreateSystemUserId } from '@/lib/system-user'

const DAY_MS = 24 * 60 * 60 * 1000

export class HevySyncService {
  private hevy = getHevyClient()

  async syncWorkouts(options?: { days?: number }) {
    const days = options?.days ?? 30
    const cutoff = Date.now() - days * DAY_MS

    const userId = await getOrCreateSystemUserId()

    // Hevy's /workouts has no date filter — fetch all pages, then keep the ones
    // that ended within the requested window.
    const all = await this.hevy.getAllWorkouts()
    const workouts = all.filter((w) => new Date(w.end_time).getTime() >= cutoff)

    let synced = 0
    let errors = 0

    for (const workout of workouts) {
      try {
        await this.syncWorkout(workout, userId)
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
      message: `Synced ${synced}/${workouts.length} workouts from Hevy (last ${days} days)`,
    }
  }

  private async syncWorkout(hevyWorkout: HevyWorkout, userId: string) {
    const start = new Date(hevyWorkout.start_time)
    const end = new Date(hevyWorkout.end_time)
    const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))

    // Total volume = Σ weight × reps across all working sets.
    let volume = 0
    for (const ex of hevyWorkout.exercises) {
      for (const s of ex.sets) {
        volume += (s.weight_kg ?? 0) * (s.reps ?? 0)
      }
    }

    // Re-sync is idempotent AND self-healing: replace any prior (possibly wrong)
    // copy so exercises/sets/volume are refreshed. Cascade clears old children.
    await prisma.$transaction(async (tx) => {
      await tx.workout.deleteMany({ where: { hevyId: hevyWorkout.id } })

      const workout = await tx.workout.create({
        data: {
          userId,
          hevyId: hevyWorkout.id,
          name: hevyWorkout.title,
          description: hevyWorkout.description || '',
          completedAt: end,
          duration: durationMin,
          volume,
        },
      })

      for (const ex of hevyWorkout.exercises) {
        const exercise = await tx.exercise.create({
          data: { workoutId: workout.id, name: ex.title },
        })

        if (ex.sets.length > 0) {
          await tx.exerciseSet.createMany({
            data: ex.sets.map((s) => ({
              workoutId: workout.id,
              exerciseId: exercise.id,
              reps: Math.round(s.reps ?? 0),
              weight: s.weight_kg ?? 0,
              rpe: s.rpe ?? null,
              duration: s.duration_seconds ?? null,
              setType: s.type || 'normal',
              isWarmup: s.type === 'warmup',
              isDropSet: s.type === 'dropset' || s.type === 'drop',
              isToFailure: s.type === 'failure',
              setIndex: s.index ?? 0,
              supersetIds: ex.supersets_id != null ? [ex.supersets_id] : [],
            })),
          })
        }
      }
    })
  }

  /**
   * Import body measurements logged in Hevy (weight + circumferences).
   * These are REAL weigh-ins, so they are stored as measurements (claudeData
   * stays null) and the full circumference set is kept in bodyScoreData for the
   * morpho-anatomical analysis.
   */
  async syncBodyMeasurements() {
    const userId = await getOrCreateSystemUserId()

    const measurements = await this.hevy.getAllBodyMeasurements()

    let synced = 0
    let errors = 0

    for (const bm of measurements) {
      try {
        const date = new Date(bm.date)

        // Dedupe on the same day (real weigh-ins only — ignore AI photo rows).
        const existing = await prisma.measurement.findFirst({
          where: {
            userId,
            claudeData: { equals: Prisma.DbNull },
            createdAt: { gte: date, lt: new Date(date.getTime() + DAY_MS) },
          },
        })
        if (existing) {
          continue
        }

        await prisma.measurement.create({
          data: {
            userId,
            weight: bm.weight_kg ?? null,
            bodyFat: bm.fat_percent ?? null,
            muscleMass: bm.lean_mass_kg ?? null,
            bodyScoreData: bm as object, // full circumference set for morpho analysis
            createdAt: date,
          },
        })

        synced++
      } catch (error) {
        console.error(`Error syncing body measurement ${bm.date}:`, error)
        errors++
      }
    }

    return {
      total: measurements.length,
      synced,
      errors,
      message: `Synced ${synced}/${measurements.length} body measurements from Hevy`,
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
