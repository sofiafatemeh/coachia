import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'
import { getJournalClient, type JournalMeasurement } from '@/lib/journal-sante'

function mealType(time: Date): string {
  const h = time.getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 18) return 'snack'
  return 'dinner'
}

export class JournalSyncService {
  private journal = getJournalClient()

  /**
   * Import measurements (weight + circumferences) from Journal Santé.
   * Per-field carry-forward: when an entry omits a value (e.g. weighed but didn't
   * measure the waist), the last known value is carried forward so stored
   * measurements never go blank. Idempotent by the Journal Santé record id.
   */
  async syncMeasurements() {
    const userId = await getOrCreateSystemUserId()

    const list = (await this.journal.getMeasurements())
      .slice()
      .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())

    const carried: Record<'weight' | 'waist' | 'thigh' | 'neck' | 'biceps', number | null> = {
      weight: null, waist: null, thigh: null, neck: null, biceps: null,
    }

    let synced = 0
    let errors = 0

    for (const m of list) {
      try {
        // Carry the last known value forward for any field the new entry omits.
        carried.weight = m.weightKg ?? carried.weight
        carried.waist = m.waistCm ?? carried.waist
        carried.thigh = m.thighCm ?? carried.thigh
        carried.neck = m.neckCm ?? carried.neck
        carried.biceps = m.bicepsCm ?? carried.biceps

        const bodyScoreData = {
          source: 'journal-sante',
          journalId: m.id,
          measuredAt: m.measuredAt,
          waistCm: carried.waist,
          thighCm: carried.thigh,
          neckCm: carried.neck,
          bicepsCm: carried.biceps,
          notes: m.notes ?? null,
        }

        const existing = await prisma.measurement.findFirst({ where: { userId, bodyScoreId: m.id } })
        if (existing) {
          await prisma.measurement.update({
            where: { id: existing.id },
            data: { weight: carried.weight, bodyScoreData, createdAt: new Date(m.measuredAt) },
          })
        } else {
          await prisma.measurement.create({
            data: {
              userId,
              weight: carried.weight,
              bodyScoreId: m.id, // stable dedup key = Journal Santé measurement id
              bodyScoreData,
              createdAt: new Date(m.measuredAt),
            },
          })
        }
        synced++
      } catch (error) {
        console.error(`Error syncing journal measurement ${m.id}:`, error)
        errors++
      }
    }

    return {
      total: list.length,
      synced,
      errors,
      message: `Synced ${synced}/${list.length} measurements from Journal Santé`,
    }
  }

  /** Import meals (nutrition) from Journal Santé. Idempotent by journal meal id. */
  async syncMeals(_options?: { days?: number }) {
    const userId = await getOrCreateSystemUserId()

    const list = await this.journal.getMeals()

    let synced = 0
    let errors = 0

    for (const meal of list) {
      try {
        const existing = await prisma.meal.findFirst({ where: { userId, journalId: meal.id } })
        if (existing) continue

        const time = new Date(meal.eatenAt)
        await prisma.meal.create({
          data: {
            userId,
            journalId: meal.id,
            name: meal.label,
            type: mealType(time),
            time,
            calories: Math.round(meal.calories),
            protein: meal.protein,
            carbs: meal.carbs,
            fats: meal.fat,
            fiber: meal.fiber ?? null,
          },
        })
        synced++
      } catch (error) {
        console.error(`Error syncing journal meal ${meal.id}:`, error)
        errors++
      }
    }

    return {
      total: list.length,
      synced,
      errors,
      message: `Synced ${synced}/${list.length} meals from Journal Santé`,
    }
  }

  /** Sync everything from Journal Santé (measurements + meals). */
  async syncAll() {
    const measurements = await this.syncMeasurements()
    const meals = await this.syncMeals()
    return {
      measurements,
      meals,
      message: `Journal Santé: ${measurements.synced} mesures, ${meals.synced} repas`,
    }
  }

  async dailySummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0))
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999))

    const userId = await getOrCreateSystemUserId()

    const workouts = await prisma.workout.findMany({
      where: { userId, completedAt: { gte: startOfDay, lt: endOfDay } },
    })

    const measurements = await prisma.measurement.findFirst({
      where: { userId, createdAt: { gte: startOfDay, lt: endOfDay } },
    })

    const meals = await prisma.meal.findMany({
      where: { userId, time: { gte: startOfDay, lt: endOfDay } },
    })

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
      measurements: measurements
        ? { weight: measurements.weight, bodyFat: measurements.bodyFat, muscleMass: measurements.muscleMass }
        : null,
      meals: meals.length,
      summary,
      rawData: { workouts, measurements, meals },
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

export type { JournalMeasurement }
