import prisma from '@/lib/prisma'

export class JournalSyncService {
  async syncMeals(options?: { days?: number }) {
    const days = options?.days || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get system user
    let user = await prisma.user.findUnique({
      where: { email: 'system@example.com' },
    })

    if (!user) {
      throw new Error('System user not found. Call /api/create-user first.')
    }

    // TODO: Fetch meals from journal (manual entry or API)
    // For now, return empty result
    return {
      total: 0,
      synced: 0,
      errors: 0,
      message: 'Meal sync not yet implemented - requires journal API integration'
    }
  }

  async dailySummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    // Get system user
    let user = await prisma.user.findUnique({
      where: { email: 'system@example.com' },
    })

    if (!user) {
      throw new Error('System user not found. Call /api/create-user first.')
    }

    // Get today's data
    const workouts = await prisma.workout.findMany({
      where: {
        userId: user.id,
        completedAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    })

    const measurements = await prisma.measurement.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    })

    const meals = await prisma.meal.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    })

    // Generate simple summary
    const summary = workouts.length > 0
      ? `Great day! You completed ${workouts.length} workout${workouts.length > 1 ? 's' : ''}.`
      : measurements
      ? `You tracked your measurements today.`
      : meals.length > 0
      ? `You logged ${meals.length} meal${meals.length > 1 ? 's' : ''} today.`
      : 'No data logged today.'

    return {
      date: targetDate.toLocaleDateString(),
      workouts: workouts.length,
      measurements: measurements ? {
        weight: measurements.weight,
        bodyFat: measurements.bodyFat,
        muscleMass: measurements.muscleMass
      } : null,
      meals: meals.length,
      summary,
      rawData: {
        workouts,
        measurements,
        meals
      }
    }
  }
}

// Singleton instance
let syncService: JournalSyncService

export const getJournalSyncService = () => {
  if (!syncService) {
    syncService = new JournalSyncService()
  }
  return syncService
}