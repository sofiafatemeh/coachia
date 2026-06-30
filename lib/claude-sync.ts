import prisma from '@/lib/prisma'
import { getClaudeClient, type ClaudeVisionAnalysis } from '@/lib/claude'

export class ClaudeSyncService {
  private claude = getClaudeClient()

  private async getOrCreateSystemUser() {
    let user = await prisma.user.findUnique({
      where: { email: 'system@example.com' },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'system@example.com',
          name: 'System User',
        },
      })
    }

    return user.id
  }

  async analyzePhoto(photoUrl: string, options?: {
    height?: number
    gender?: 'male' | 'female'
    age?: number
  }) {
    // Analyze photo with Claude Vision
    const analysis = await this.claude.analyzePhoto(photoUrl, options)

    // Get system user ID
    const userId = await this.getOrCreateSystemUser()

    // Create measurement in database
    const measurement = await prisma.measurement.create({
      data: {
        userId,
        weight: analysis.weight ?? null,
        bodyFat: analysis.bodyFat ?? null,
        muscleMass: analysis.muscleMass ?? null,
        bmi: analysis.bmi ?? null,
        claudeData: {
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
      measurement,
      analysis,
      message: `Claude Vision analysis synced successfully`
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

    return {
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

    const progress = {
      weightChange: (latest.weight || 0) - (oldest.weight || 0),
      bodyFatChange: (latest.bodyFat || 0) - (oldest.bodyFat || 0),
      muscleMassChange: (latest.muscleMass || 0) - (oldest.muscleMass || 0),
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

  private detectAngle(url: string): string {
    // Simple heuristic to detect angle from URL
    const lower = url.toLowerCase()
    
    if (lower.includes('front') || lower.includes('face')) {
      return 'front'
    }
    if (lower.includes('side') || lower.includes('lateral') || lower.includes('profile')) {
      return 'side'
    }
    if (lower.includes('back') || lower.includes('rear')) {
      return 'back'
    }
    
    return 'front' // Default
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