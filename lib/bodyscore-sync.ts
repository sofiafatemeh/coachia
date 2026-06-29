import prisma from '@/lib/prisma'
import { getBodyScoreClient, type BodyScoreAnalysis } from '@/lib/bodyscore'

export class BodyScoreSyncService {
  private bodyScore = getBodyScoreClient()

  async syncAnalysis(photoUrl: string, options?: {
    height?: number
    gender?: 'male' | 'female'
    age?: number
  }) {
    // Analyze photo with BodyScore AI
    const response = await this.bodyScore.analyzePhoto({
      imageUrl: photoUrl,
      height: options?.height,
      gender: options?.gender,
      age: options?.age,
    })

    if (response.status !== 'success') {
      throw new Error(`BodyScore analysis failed: ${response.message}`)
    }

    const analysis = response.analysis

    // Create measurement in database
    const measurement = await prisma.measurement.create({
      data: {
        userId: 'system', // TODO: Get from auth
        weight: analysis.weight,
        bodyFat: analysis.bodyFat,
        muscleMass: analysis.muscleMass,
        bmi: analysis.bmi,
        bodyScoreId: analysis.id,
        bodyScoreData: {
          waist: analysis.waist,
          chest: analysis.chest,
          hips: analysis.hips,
          thighs: analysis.thighs,
          bodyFatConfidence: analysis.bodyFatConfidence,
          muscleMassConfidence: analysis.muscleMassConfidence,
          poseData: analysis.poseData,
          segmentation: analysis.segmentation,
          imageUrl: analysis.imageUrl,
          analyzedAt: analysis.createdAt
        }
      }
    })

    // Also create progress photo
    await prisma.progressPhoto.create({
      data: {
        userId: 'system', // TODO: Get from auth
        url: analysis.imageUrl,
        angle: 'front', // TODO: Detect angle from photo
        notes: `BodyScore analysis #${analysis.id}`
      }
    })

    return {
      measurement,
      analysis,
      message: `BodyScore analysis synced successfully`
    }
  }

  async getLatestAnalysis(userId?: string) {
    const where: any = {
      bodyScoreId: { not: null }
    }

    if (userId) {
      where.userId = userId
    }

    const measurement = await prisma.measurement.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    })

    if (!measurement) {
      throw new Error('No BodyScore analysis found')
    }

    return measurement
  }

  async getAnalysesHistory(userId?: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const where: any = {
      bodyScoreId: { not: null },
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
      message: `Found ${measurements.length} BodyScore analyses`
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

    const progress = {
      weightChange: latest.weight - oldest.weight,
      bodyFatChange: (latest.bodyFat || 0) - (oldest.bodyFat || 0),
      muscleMassChange: (latest.muscleMass || 0) - (oldest.muscleMass || 0),
      bmiChange: (latest.bmi || 0) - (oldest.bmi || 0),
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
let syncService: BodyScoreSyncService

export const getBodyScoreSyncService = () => {
  if (!syncService) {
    syncService = new BodyScoreSyncService()
  }
  return syncService
}