// MediaPipe Pose - Client pour analyse vidéo
// https://google.github.io/mediapipe/solutions/pose.html

export interface PoseLandmark {
  x: number  // Normalized [0.0, 1.0]
  y: number  // Normalized [0.0, 1.0]
  z: number  // Relative scale
  visibility: number  // [0.0, 1.0]
}

export interface Pose {
  landmarks: PoseLandmark[]  // 33 landmarks
  segmentationMask?: Float32Array
}

export interface ExerciseAnalysis {
  // Joint angles (degrees)
  elbowAngle: number
  shoulderAngle: number
  hipAngle: number
  kneeAngle: number
  
  // ROM (Range of Motion)
  elbowROM: number
  shoulderROM: number
  hipROM: number
  kneeROM: number
  
  // Tempo (seconds)
  concentricTime: number
  eccentricTime: number
  totalTime: number
  
  // Symmetry
  leftRightSymmetry: number  // 0-1
  
  // Bar path
  barPath: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    deviation: number  // % deviation from vertical
  }
  
  // Rep detection
  repCount: number
  repQuality: number  // 0-1
}

export class MediaPipeClient {
  private pose: any = null
  
  async initialize() {
    // Import MediaPipe Pose dynamically (browser only)
    if (typeof window === 'undefined') {
      throw new Error('MediaPipe Pose is browser-only. Use server-side pose extraction.')
    }
    
    // Lazy import
    const { Pose } = await import('@mediapipe/pose')
    
    this.pose = new Pose({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      }
    })
    
    await this.pose.initialize()
  }
  
  async analyzeFrame(imageElement: HTMLImageElement | HTMLVideoElement): Promise<Pose> {
    if (!this.pose) {
      await this.initialize()
    }
    
    const result = await this.pose.send({ image: imageElement })
    return result as Pose
  }
  
  async analyzeVideoFrames(
    videoUrl: string,
    options?: {
      sampleRate?: number  // frames per second
      maxFrames?: number
    }
  ): Promise<Pose[]> {
    const sampleRate = options?.sampleRate || 1  // 1 fps
    const maxFrames = options?.maxFrames || 30
    
    // Create video element
    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = true
    video.playsInline = true
    
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve
    })
    
    const duration = video.duration
    const totalFrames = Math.min(
      Math.floor(duration * sampleRate),
      maxFrames
    )
    
    const frames: Pose[] = []
    
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = (i / sampleRate)
      video.currentTime = timestamp
      
      await new Promise((resolve) => {
        video.onseeked = resolve
      })
      
      const pose = await this.analyzeFrame(video)
      frames.push(pose)
    }
    
    return frames
  }
  
  extractKeyFrames(frames: Pose[], count: number = 5): Pose[] {
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
}

export class PoseAnalyzer {
  // Calculate angle between three points
  calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians = Math.atan2(c.y - a.y, c.x - a.x) - Math.atan2(b.y - a.y, b.x - a.x)
    let angle = Math.abs(radians * 180.0 / Math.PI)
    
    if (angle > 180.0) {
      angle = 360 - angle
    }
    
    return angle
  }
  
  // Calculate Range of Motion
  calculateROM(angles: number[]): number {
    if (angles.length < 2) return 0
    
    const min = Math.min(...angles)
    const max = Math.max(...angles)
    
    return max - min
  }
  
  // Calculate tempo
  calculateTempo(frames: Pose[]): {
    concentricTime: number
    eccentricTime: number
    totalTime: number
  } {
    if (frames.length < 2) {
      return { concentricTime: 0, eccentricTime: 0, totalTime: 0 }
    }
    
    // Simple heuristic: detect concentric vs eccentric based on movement
    const totalTime = frames.length / 30  // Assuming 30 fps
    const midPoint = Math.floor(frames.length / 2)
    
    return {
      concentricTime: totalTime / 2,
      eccentricTime: totalTime / 2,
      totalTime
    }
  }
  
  // Calculate symmetry
  calculateSymmetry(leftLandmarks: PoseLandmark[], rightLandmarks: PoseLandmark[]): number {
    if (leftLandmarks.length !== rightLandmarks.length) {
      return 0
    }
    
    let totalDiff = 0
    
    for (let i = 0; i < leftLandmarks.length; i++) {
      const left = leftLandmarks[i]
      const right = rightLandmarks[i]
      
      // Mirror x-coordinate
      const mirrorX = 1 - right.x
      
      const diff = Math.abs(left.x - mirrorX) + Math.abs(left.y - right.y)
      totalDiff += diff
    }
    
    const avgDiff = totalDiff / leftLandmarks.length
    
    // Convert to similarity score (0-1)
    return Math.max(0, 1 - avgDiff * 2)
  }
  
  // Calculate bar path deviation
  calculateBarPath(frames: Pose[]): {
    start: { x: number; y: number }
    end: { x: number; y: number }
    deviation: number
  } {
    if (frames.length < 2) {
      return { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, deviation: 0 }
    }
    
    const start = frames[0].landmarks[15]  // Left wrist
    const end = frames[frames.length - 1].landmarks[15]
    
    // Calculate deviation from vertical
    const deviation = Math.abs(start.x - end.x) * 100
    
    return {
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      deviation
    }
  }
  
  // Analyze exercise from pose frames
  analyzeExercise(frames: Pose[]): ExerciseAnalysis {
    const angles = frames.map(frame => {
      const landmarks = frame.landmarks
      
      return {
        elbowAngle: this.calculateAngle(
          landmarks[11],  // Left shoulder
          landmarks[13],  // Left elbow
          landmarks[15]   // Left wrist
        ),
        shoulderAngle: this.calculateAngle(
          landmarks[11],  // Left shoulder
          landmarks[23],  // Left hip
          landmarks[25]   // Left knee
        ),
        hipAngle: this.calculateAngle(
          landmarks[23],  // Left hip
          landmarks[25],  // Left knee
          landmarks[27]   // Left ankle
        ),
        kneeAngle: this.calculateAngle(
          landmarks[23],  // Left hip
          landmarks[25],  // Left knee
          landmarks[27]   // Left ankle
        )
      }
    })
    
    // Calculate ROM
    const elbowROM = this.calculateROM(angles.map(a => a.elbowAngle))
    const shoulderROM = this.calculateROM(angles.map(a => a.shoulderAngle))
    const hipROM = this.calculateROM(angles.map(a => a.hipAngle))
    const kneeROM = this.calculateROM(angles.map(a => a.kneeAngle))
    
    // Calculate tempo
    const tempo = this.calculateTempo(frames)
    
    // Calculate symmetry
    const leftArm = [11, 13, 15].map(i => frames[0].landmarks[i])
    const rightArm = [12, 14, 16].map(i => frames[0].landmarks[i])
    const leftRightSymmetry = this.calculateSymmetry(leftArm, rightArm)
    
    // Calculate bar path
    const barPath = this.calculateBarPath(frames)
    
    // Calculate rep quality
    const repQuality = this.calculateRepQuality({
      elbowROM,
      shoulderROM,
      hipROM,
      kneeROM,
      symmetry: leftRightSymmetry,
      barPathDeviation: barPath.deviation
    })
    
    return {
      elbowAngle: angles[angles.length - 1].elbowAngle,
      shoulderAngle: angles[angles.length - 1].shoulderAngle,
      hipAngle: angles[angles.length - 1].hipAngle,
      kneeAngle: angles[angles.length - 1].kneeAngle,
      elbowROM,
      shoulderROM,
      hipROM,
      kneeROM,
      ...tempo,
      leftRightSymmetry,
      barPath,
      repCount: 1,
      repQuality
    }
  }
  
  // Calculate rep quality score
  private calculateRepQuality(metrics: any): number {
    let score = 1.0
    
    // Penalize poor ROM
    if (metrics.elbowROM < 90) score -= 0.2
    if (metrics.shoulderROM < 45) score -= 0.1
    
    // Penalize poor symmetry
    if (metrics.symmetry < 0.8) score -= 0.2
    
    // Penalize poor bar path
    if (metrics.barPathDeviation > 20) score -= 0.3
    
    return Math.max(0, score)
  }
}

// Initialize client
export const getMediaPipeClient = () => {
  return new MediaPipeClient()
}

export const getPoseAnalyzer = () => {
  return new PoseAnalyzer()
}