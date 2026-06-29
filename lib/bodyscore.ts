// BodyScore AI Client
// https://bodyscore.ai/docs

export interface BodyScoreAnalysis {
  id: string
  userId: string
  imageUrl: string

  // Body composition
  bodyFat: number  // %
  muscleMass: number  // kg
  bmi: number
  weight: number  // kg

  // Body metrics
  waist: number?  // cm
  chest: number?  // cm
  hips: number?  // cm
  thighs: number?  // cm

  // Confidence scores
  bodyFatConfidence: number  // 0-1
  muscleMassConfidence: number  // 0-1

  // Raw analysis data
  poseData?: any  // Keypoints, landmarks
  segmentation?: any  // Body segmentation

  createdAt: string
}

export interface BodyScoreAnalysisRequest {
  imageUrl: string  // URL de la photo
  height?: number  // cm (optionnel - améliore précision)
  gender?: 'male' | 'female'  // optionnel
  age?: number  // optionnel
}

export interface BodyScoreAnalysisResponse {
  analysis: BodyScoreAnalysis
  status: 'success' | 'processing' | 'failed'
  message?: string
}

export class BodyScoreClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string = 'https://api.bodyscore.ai/v1') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`BodyScore API error: ${response.status} - ${error.message || response.statusText}`)
    }

    return response.json()
  }

  // ANALYZE PHOTO
  async analyzePhoto(request: BodyScoreAnalysisRequest): Promise<BodyScoreAnalysisResponse> {
    return this.request<BodyScoreAnalysisResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // GET ANALYSIS BY ID
  async getAnalysisById(id: string): Promise<BodyScoreAnalysisResponse> {
    return this.request<BodyScoreAnalysisResponse>(`/analysis/${id}`)
  }

  // LIST ANALYSES
  async listAnalyses(options?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<{ analyses: BodyScoreAnalysis[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.userId) params.append('userId', options.userId)
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())

    const endpoint = params.toString() ? `/analyses?${params}` : '/analyses'
    return this.request(endpoint)
  }

  // DELETE ANALYSIS
  async deleteAnalysis(id: string): Promise<void> {
    await this.request(`/analysis/${id}`, {
      method: 'DELETE',
    })
  }
}

// Initialize client
export const getBodyScoreClient = () => {
  const apiKey = process.env.BODYSCORE_API_KEY
  if (!apiKey) {
    throw new Error('BODYSCORE_API_KEY not found in environment variables')
  }
  return new BodyScoreClient(apiKey)
}