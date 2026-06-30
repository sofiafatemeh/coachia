import prisma from '@/lib/prisma'
import { getClaudeClient } from '@/lib/claude'

export interface JournalEntry {
  id: string
  timestamp: string
  content: string
  mood?: string
  energy?: number
  sleep?: number
  notes?: string
}

export class JournalSyncService {
  private claude = getClaudeClient()

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
        startedAt: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      },
      include: {
        exercises: {
          include: {
            sets: true
          }
        }
      }
    })

    const measurements = await prisma.measurement.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      }
    })

    const meals = await prisma.meal.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      }
    })

    // Generate summary with Claude Opus 4.8
    const prompt = `Generate a daily fitness summary for ${targetDate.toLocaleDateString()}.

DATA:
- Workouts: ${workouts.length} sessions
- Measurements: ${measurements ? JSON.stringify({ weight: measurements.weight, bodyFat: measurements.bodyFat, muscleMass: measurements.muscleMass }) : 'None'}
- Meals: ${meals.length} meals

WORKOUT DETAILS:
${workouts.map(w => `- ${w.name}: ${w.exercises.length} exercises`).join('\n')}

Generate a motivating summary with:
1. Performance highlights
2. Progress tracking
3. Recommendations for tomorrow`

    const summary = await this.claude.analyzeProgress([], {
      prompt,
      model: 'claude-opus-4-8' as any
    })

    return {
      date: targetDate.toLocaleDateString(),
      workouts: workouts.length,
      measurements: measurements ? {
        weight: measurements.weight,
        bodyFat: measurements.bodyFat,
        muscleMass: measurements.muscleMass
      } : null,
      meals: meals.length,
      summary: summary.recommendations?.[0] || 'Summary generated',
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