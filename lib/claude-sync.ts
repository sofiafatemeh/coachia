import prisma from '@/lib/prisma'
import { getClaudeClient } from '@/lib/claude'
import { getOrCreateSystemUserId } from '@/lib/system-user'

// Flat shape consumed by the Photos page (result panel + history list).
function toAnalysisResult(measurement: {
  id: string
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
  bmi: number | null
  claudeData: unknown
  createdAt: Date
}) {
  const data = (measurement.claudeData ?? {}) as any
  // AI estimates live inside claudeData (photo analysis is a visual guess, not a
  // real weigh-in). Fall back to the columns for legacy rows created before that split.
  return {
    id: measurement.id,
    score: data.overallScore ?? null,
    confidence: data.confidence ?? null,
    weight: data.weight ?? measurement.weight,
    bodyFat: data.bodyFat ?? measurement.bodyFat,
    muscleMass: data.muscleMass ?? measurement.muscleMass,
    bmi: data.bmi ?? measurement.bmi,
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    recommendations: data.recommendations ?? [],
    createdAt: measurement.createdAt,
  }
}

export class ClaudeSyncService {
  private claude = getClaudeClient()

  async analyzePhoto(photoUrl: string, options?: {
    height?: number
    gender?: 'male' | 'female'
    age?: number
  }) {
    // Analyze photo with Claude Vision
    const analysis = await this.claude.analyzePhoto(photoUrl, options)

    // Get system user ID
    const userId = await getOrCreateSystemUserId()

    // Store the AI analysis. The estimated body metrics are AI *guesses* from a
    // photo, not real weigh-ins, so they go into claudeData only — the measurement
    // columns stay null so this row never appears as a pesée in the Dashboard/Mesures.
    const measurement = await prisma.measurement.create({
      data: {
        userId,
        weight: null,
        bodyFat: null,
        muscleMass: null,
        bmi: null,
        claudeData: {
          weight: analysis.weight ?? null,
          bodyFat: analysis.bodyFat ?? null,
          muscleMass: analysis.muscleMass ?? null,
          bmi: analysis.bmi ?? null,
          muscleScores: {
            chest: analysis.chestScore,
            back: analysis.backScore,
            legs: analysis.legsScore,
            arms: analysis.armsScore,
            shoulders: analysis.shouldersScore,
            core: analysis.coreScore,
          },
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          recommendations: analysis.recommendations,
          overallScore: analysis.overallScore,
          confidence: analysis.confidence,
          imageUrl: photoUrl,
        }
      }
    })

    // TODO: Also create progress photo (requires schema update)

    return {
      ...toAnalysisResult(measurement),
      analysis,
      message: `Claude Vision analysis synced successfully`,
    }
  }

  async getLatestAnalysis(userId?: string) {
    const where: any = {
      claudeData: { not: null }
    }

    if (userId) {
      where.userId = userId
    }

    const measurement = await prisma.measurement.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    })

    if (!measurement) {
      throw new Error('No Claude analysis found')
    }

    return measurement
  }

  async getAnalysesHistory(userId?: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const where: any = {
      claudeData: { not: null },
      createdAt: { gte: startDate }
    }

    if (userId) {
      where.userId = userId
    }

    const measurements = await prisma.measurement.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    const analyses = measurements.map(toAnalysisResult)

    return {
      analyses,
      measurements,
      total: measurements.length,
      message: `Found ${measurements.length} Claude analyses`
    }
  }

  async calculateProgress(userId?: string, days: number = 30) {
    const history = await this.getAnalysesHistory(userId, days)

    if (history.measurements.length < 2) {
      return {
        message: 'Need at least 2 analyses to calculate progress',
        progress: null
      }
    }

    const latest = history.measurements[0]
    const oldest = history.measurements[history.measurements.length - 1]

    const latestData = latest.claudeData as any
    const oldestData = oldest.claudeData as any

    // Metrics live in claudeData now (column fallback for legacy rows).
    const metric = (row: typeof latest, data: any, key: 'weight' | 'bodyFat' | 'muscleMass') =>
      (data?.[key] ?? (row as any)[key] ?? 0)

    const progress = {
      weightChange: metric(latest, latestData, 'weight') - metric(oldest, oldestData, 'weight'),
      bodyFatChange: metric(latest, latestData, 'bodyFat') - metric(oldest, oldestData, 'bodyFat'),
      muscleMassChange: metric(latest, latestData, 'muscleMass') - metric(oldest, oldestData, 'muscleMass'),
      overallScoreChange: (latestData?.overallScore || 0) - (oldestData?.overallScore || 0),
      daysElapsed: Math.floor(
        (new Date(latest.createdAt).getTime() - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    return {
      progress,
      latest,
      oldest,
      measurements: history.measurements,
      message: `Progress calculated over ${progress.daysElapsed} days`
    }
  }

}

// Singleton instance
let syncService: ClaudeSyncService

export const getClaudeSyncService = () => {
  if (!syncService) {
    syncService = new ClaudeSyncService()
  }
  return syncService
}