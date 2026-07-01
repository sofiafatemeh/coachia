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

    // One read of existing journal-sourced rows instead of a query per item.
    const existing = await prisma.measurement.findMany({
      where: { userId, bodyScoreId: { not: null } },
      select: { id: true, bodyScoreId: true },
    })
    const idByJournalId = new Map(existing.map((e) => [e.bodyScoreId as string, e.id]))

    const creates: import('@prisma/client').Prisma.MeasurementCreateManyInput[] = []
    const updates: { id: string; weight: number | null; bodyScoreData: object; createdAt: Date }[] = []

    for (const m of list) {
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
      const createdAt = new Date(m.measuredAt)
      const existingId = idByJournalId.get(m.id)
      if (existingId) {
        updates.push({ id: existingId, weight: carried.weight, bodyScoreData, createdAt })
      } else {
        creates.push({ userId, weight: carried.weight, bodyScoreId: m.id, bodyScoreData, createdAt })
      }
    }

    if (creates.length) await prisma.measurement.createMany({ data: creates })
    for (const u of updates) {
      await prisma.measurement.update({
        where: { id: u.id },
        data: { weight: u.weight, bodyScoreData: u.bodyScoreData, createdAt: u.createdAt },
      })
    }

    return {
      total: list.length,
      synced: creates.length + updates.length,
      errors: 0,
      message: `Synced ${creates.length + updates.length}/${list.length} measurements from Journal Santé`,
    }
  }

  /** Import meals (nutrition) from Journal Santé. Idempotent by journal meal id. */
  async syncMeals(options?: { days?: number }) {
    const userId = await getOrCreateSystemUserId()

    const days = options?.days ?? 90
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

    // Only recent meals, and one read of existing ids instead of a query per meal.
    const list = (await this.journal.getMeals()).filter(
      (m) => new Date(m.eatenAt).getTime() >= cutoff
    )
    const existing = await prisma.meal.findMany({
      where: { userId, journalId: { not: null } },
      select: { journalId: true },
    })
    const seen = new Set(existing.map((e) => e.journalId))

    const creates = list
      .filter((m) => !seen.has(m.id))
      .map((m) => {
        const time = new Date(m.eatenAt)
        return {
          userId,
          journalId: m.id,
          name: m.label,
          type: mealType(time),
          time,
          calories: Math.round(m.calories),
          protein: m.protein,
          carbs: m.carbs,
          fats: m.fat,
          fiber: m.fiber ?? null,
        }
      })

    if (creates.length) await prisma.meal.createMany({ data: creates })

    return {
      total: list.length,
      synced: creates.length,
      errors: 0,
      message: `Synced ${creates.length}/${list.length} meals from Journal Santé`,
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
