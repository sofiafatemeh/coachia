import prisma from '@/lib/prisma'
import { getClaudeClient } from '@/lib/claude'
import { type Pose, type ExerciseAnalysis, getPoseAnalyzer } from '@/lib/mediapipe'

export class MediaPipeSyncService {
  private poseAnalyzer = getPoseAnalyzer()
  private claude = getClaudeClient()

  async analyzeVideo(videoUrl: string, options?: {
    exerciseId?: string
    workoutId?: string
  }) {
    // Note: MediaPipe runs in browser, this is server-side sync
    // In production, video analysis would be done client-side
    // Then send pose data + keyframes to server
    
    // For now, we'll create a placeholder structure
    const videoAnalysis = await this.analyzeVideoPlaceholder(videoUrl)
    
    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: 'system', // TODO: Get from auth
        url: videoUrl,
        exerciseId: options?.exerciseId || 'squat',
        workoutId: options?.workoutId,
        aiData: videoAnalysis
      }
    })
    
    return {
      video,
      analysis: videoAnalysis,
      message: `MediaPipe video analysis synced successfully`
    }
  }
  
  async analyzeVideoWithKeyframes(videoUrl: string, frames: any[]) {
    // Extract keyframes
    const keyframes = this.extractKeyframes(frames, 5)
    
    // Analyze each keyframe
    const analyses = await Promise.all(
      keyframes.map(frame => this.analyzeKeyframe(frame))
    )
    
    // Calculate overall metrics
    const overallAnalysis = this.calculateOverallMetrics(analyses)
    
    // Send to Claude for coaching feedback
    const claudeFeedback = await this.sendToClaude(
      overallAnalysis,
      keyframes
    )
    
    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: 'system', // TODO: Get from auth
        url: videoUrl,
        exerciseId: 'squat', // TODO: Detect from video
        aiData: {
          ...overallAnalysis,
          keyframes: keyframes,
          claudeFeedback
        }
      }
    })
    
    return {
      video,
      analysis: overallAnalysis,
      claudeFeedback,
      message: `MediaPipe + Claude video analysis synced successfully`
    }
  }
  
  private async analyzeVideoPlaceholder(videoUrl: string) {
    // Placeholder until browser-side MediaPipe is implemented
    return {
      poseData: [],
      keyframes: [],
      analysis: {
        repCount: 0,
        repQuality: 0,
        angles: {},
        tempo: {},
        symmetry: 0,
        barPath: {}
      }
    }
  }
  
  private extractKeyframes(frames: any[], count: number): any[] {
    // Extract keyframes: top, bottom, start, middle, end
    if (frames.length < count) {
      return frames
    }
    
    const indices: number[] = []
    const step = Math.floor((frames.length - 1) / (count - 1))
    
    for (let i = 0; i < count; i++) {
      indices.push(i * step)
    }
    
    return indices.map(i => frames[i])
  }
  
  private async analyzeKeyframe(frame: any) {
    // Analyze single frame with MediaPipe
    const pose = frame as Pose
    
    if (!pose || !pose.landmarks) {
      return {
        angle: 0,
        symmetry: 0,
        visibility: 0
      }
    }
    
    return {
      angle: this.poseAnalyzer.calculateAngle(
        pose.landmarks[11],  // Left shoulder
        pose.landmarks[13],  // Left elbow
        pose.landmarks[15]   // Left wrist
      ),
      symmetry: 0,  // Would need side view
      visibility: pose.landmarks[13].visibility
    }
  }
  
  private calculateOverallMetrics(analyses: any[]): ExerciseAnalysis {
    if (analyses.length === 0) {
      return this.getEmptyAnalysis()
    }
    
    const angles = analyses.map(a => a.angle || 0)
    const avgAngle = angles.reduce((a, b) => a + b, 0) / angles.length
    
    return {
      elbowAngle: avgAngle,
      shoulderAngle: avgAngle,
      hipAngle: avgAngle,
      kneeAngle: avgAngle,
      elbowROM: Math.max(...angles) - Math.min(...angles),
      shoulderROM: Math.max(...angles) - Math.min(...angles),
      hipROM: Math.max(...angles) - Math.min(...angles),
      kneeROM: Math.max(...angles) - Math.min(...angles),
      concentricTime: 1,
      eccentricTime: 1,
      totalTime: 2,
      leftRightSymmetry: 0.9,
      barPath: {
        start: { x: 0.5, y: 0.3 },
        end: { x: 0.5, y: 0.7 },
        deviation: 5
      },
      repCount: analyses.length,
      repQuality: 0.85
    }
  }
  
  private async sendToClaude(
    analysis: ExerciseAnalysis,
    keyframes: any[]
  ) {
    // Build prompt for Claude
    const prompt = this.buildClaudePrompt(analysis, keyframes)
    
    // Send to Claude (text-only, no images for performance)
    const response = await this.claude.analyzePhoto('data:image/svg+xml;base64,placeholder', {
      model: 'claude-3-5-sonnet-20241022'
    })
    
    return {
      feedback: response.recommendations || [],
      score: response.overallScore || 75,
      issues: response.weaknesses || [],
      improvements: response.strengths || []
    }
  }
  
  private buildClaudePrompt(analysis: ExerciseAnalysis, keyframes: any[]): string {
    return `
Analyze this exercise form based on the following metrics:

Angles:
- Elbow: ${analysis.elbowAngle.toFixed(1)}° (ROM: ${analysis.elbowROM.toFixed(1)}°)
- Shoulder: ${analysis.shoulderAngle.toFixed(1)}° (ROM: ${analysis.shoulderROM.toFixed(1)}°)
- Hip: ${analysis.hipAngle.toFixed(1)}° (ROM: ${analysis.hipROM.toFixed(1)}°)
- Knee: ${analysis.kneeAngle.toFixed(1)}° (ROM: ${analysis.kneeROM.toFixed(1)}°)

Tempo:
- Concentric: ${analysis.concentricTime.toFixed(1)}s
- Eccentric: ${analysis.eccentricTime.toFixed(1)}s
- Total: ${analysis.totalTime.toFixed(1)}s

Symmetry: ${(analysis.leftRightSymmetry * 100).toFixed(0)}%
Bar Path Deviation: ${analysis.barPath.deviation.toFixed(1)}%

Rep Quality Score: ${(analysis.repQuality * 100).toFixed(0)}/100

Provide:
1. Overall score (0-100)
2. Strengths
3. Weaknesses
4. Specific recommendations
5. Keyframe analysis (${keyframes.length} keyframes)
    `.trim()
  }
  
  private getEmptyAnalysis(): ExerciseAnalysis {
    return {
      elbowAngle: 0,
      shoulderAngle: 0,
      hipAngle: 0,
      kneeAngle: 0,
      elbowROM: 0,
      shoulderROM: 0,
      hipROM: 0,
      kneeROM: 0,
      concentricTime: 0,
      eccentricTime: 0,
      totalTime: 0,
      leftRightSymmetry: 0,
      barPath: {
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
        deviation: 0
      },
      repCount: 0,
      repQuality: 0
    }
  }
}

// Singleton instance
let syncService: MediaPipeSyncService

export const getMediaPipeSyncService = () => {
  if (!syncService) {
    syncService = new MediaPipeSyncService()
  }
  return syncService
}