import prisma from '@/lib/prisma'
import { getHevyClient, type HevyWorkout } from '@/lib/heavy'
import { getOrCreateSystemUserId } from '@/lib/system-user'

export class HevySyncService {
  private hevy = getHevyClient()

  async syncWorkouts(options?: { days?: number }) {
    const days = options?.days || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const userId = await getOrCreateSystemUserId()

    // Fetch workouts from Hevy
    const { workouts } = await this.hevy.getWorkouts({
      startDate: startDate.toISOString(),
      pageSize: 100
    })

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

    // Create workout (without exercises - too complex for current schema)
    await prisma.workout.create({
      data: {
        userId,
        name: hevyWorkout.title,
        description: hevyWorkout.description || '',
        hevyId: hevyWorkout.id,
        completedAt: new Date(hevyWorkout.end_time),
      }
    })

    // TODO: Sync exercises when schema is fixed
  }

  async syncBodyweight() {
    const userId = await getOrCreateSystemUserId()

    const { bodyweight } = await this.hevy.getBodyweight()

    let synced = 0
    let errors = 0

    for (const bw of bodyweight) {
      try {
        // Check if bodyweight already exists (by date)
        const existing = await prisma.measurement.findFirst({
          where: {
            userId,
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
            userId,
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