import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'
import { getJournalClient, type JournalMeasurement } from '@/lib/journal-sante'

export interface DailyEnergy {
  date: string // YYYY-MM-DD
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  activeCalories: number // estimated expenditure
}

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

    // Only write the last 30 days, but seed carry-forward from the full history
    // so values from before the window still propagate into it.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000

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
      if (createdAt.getTime() < cutoff) continue // older than 30 days: seeded carry-forward only
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

  /**
   * Sync from Journal Santé. Individual meals are intentionally NOT stored — what
   * matters is weight/mensurations plus daily calorie/macro totals and estimated
   * expenditure, which are aggregated on demand via dailyEnergySummary().
   */
  async syncAll() {
    const measurements = await this.syncMeasurements()
    return {
      measurements,
      message: `Journal Santé: ${measurements.synced} mesure(s) importée(s)`,
    }
  }

  /**
   * Daily energy balance from Journal Santé: calories + macros (from meals) and
   * estimated expenditure (active calories from activity). Computed on the fly,
   * not stored. Returned most-recent-day first.
   */
  async dailyEnergySummary(days = 14): Promise<DailyEnergy[]> {
    const [meals, activities] = await Promise.all([
      this.journal.getMeals(),
      this.journal.getActivities().catch(() => []),
    ])

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const byDay = new Map<string, DailyEnergy>()
    const bucket = (iso: string): DailyEnergy => {
      const date = new Date(iso).toISOString().slice(0, 10)
      let b = byDay.get(date)
      if (!b) {
        b = { date, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, activeCalories: 0 }
        byDay.set(date, b)
      }
      return b
    }

    for (const m of meals) {
      if (new Date(m.eatenAt).getTime() < cutoff) continue
      const b = bucket(m.eatenAt)
      b.calories += m.calories
      b.protein += m.protein
      b.carbs += m.carbs
      b.fat += m.fat
      b.fiber += m.fiber ?? 0
    }
    for (const a of activities) {
      if (new Date(a.loggedAt).getTime() < cutoff) continue
      bucket(a.loggedAt).activeCalories += a.activeCalories
    }

    return [...byDay.values()]
      .map((d) => ({
        date: d.date,
        calories: Math.round(d.calories),
        protein: Math.round(d.protein),
        carbs: Math.round(d.carbs),
        fat: Math.round(d.fat),
        fiber: Math.round(d.fiber),
        activeCalories: Math.round(d.activeCalories),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
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
