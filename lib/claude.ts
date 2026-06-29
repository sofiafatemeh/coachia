// Claude API Client
// https://docs.anthropic.com/claude/reference/messages

export type ClaudeModel = 'claude-3-5-sonnet-20241022' | 'claude-3-5-haiku-20241022' | 'claude-3-opus-20240229'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: ClaudeContent[]
}

export interface ClaudeContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface ClaudeAnalysisRequest {
  model?: ClaudeModel
  maxTokens?: number
  temperature?: number
  system?: string
  messages: ClaudeMessage[]
}

export interface ClaudeAnalysisResponse {
  id: string
  type: string
  role: string
  content: ClaudeContent[]
  model: string
  stop_reason: string | null
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ClaudeVisionAnalysis {
  bodyFat?: number  // %
  muscleMass?: number  // kg
  bmi?: number
  weight?: number  // kg
  confidence?: number  // 0-1

  // Muscle groups
  chestScore?: number  // 0-10
  backScore?: number  // 0-10
  legsScore?: number  // 0-10
  armsScore?: number  // 0-10
  shouldersScore?: number  // 0-10
  coreScore?: number  // 0-10

  // Analysis
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]

  // Overall score
  overallScore?: number  // 0-100
}

export class ClaudeClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string = 'https://api.anthropic.com/v1/messages') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request<T>(options: ClaudeAnalysisRequest): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'false',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.3,
        system: options.system,
        messages: options.messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Claude API error: ${response.status} - ${error.error?.message || response.statusText}`)
    }

    return response.json()
  }

  async analyzePhoto(imageUrl: string, options?: {
    model?: ClaudeModel
    height?: number
    gender?: 'male' | 'female'
    age?: number
  }): Promise<ClaudeVisionAnalysis> {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Build system prompt
    let systemPrompt = `You are an expert fitness coach analyzing physique photos. Provide a detailed analysis including:
1. Body composition (body fat %, muscle mass, BMI, weight)
2. Muscle group scores (chest, back, legs, arms, shoulders, core) - scale 0-10
3. Strengths and weaknesses
4. Specific recommendations
5. Overall score (0-100)

Respond ONLY in valid JSON format.`

    if (options?.height) {
      systemPrompt += `\n\nHeight: ${options.height} cm`
    }
    if (options?.gender) {
      systemPrompt += `\nGender: ${options.gender}`
    }
    if (options?.age) {
      systemPrompt += `\nAge: ${options.age}`
    }

    // Build user message
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Analyze this physique photo and provide a detailed JSON response.',
          },
        ],
      },
    ]

    // Call Claude API
    const response = await this.request<ClaudeAnalysisResponse>({
      model: options?.model || 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages,
    })

    // Parse JSON response
    const textContent = response.content.find(c => c.type === 'text')?.text || '{}'
    const analysis = JSON.parse(textContent)

    return analysis
  }

  async analyzeProgress(photos: string[], options?: {
    model?: ClaudeModel
    days?: number
  }): Promise<{
    overallScore: number
    progress: {
      weightChange: number
      bodyFatChange: number
      muscleMassChange: number
    }
    recommendations: string[]
    strengths: string[]
    weaknesses: string[]
  }> {
    // Analyze first and last photo
    const [first, last] = [photos[0], photos[photos.length - 1]]

    const firstAnalysis = await this.analyzePhoto(first, { model: options?.model })
    const lastAnalysis = await this.analyzePhoto(last, { model: options?.model })

    // Calculate progress
    const progress = {
      weightChange: (lastAnalysis.weight || 0) - (firstAnalysis.weight || 0),
      bodyFatChange: (lastAnalysis.bodyFat || 0) - (firstAnalysis.bodyFat || 0),
      muscleMassChange: (lastAnalysis.muscleMass || 0) - (firstAnalysis.muscleMass || 0),
    }

    // Generate recommendations based on progress
    const recommendations: string[] = []

    if (progress.weightChange < 0) {
      recommendations.push('Excellent weight loss progress! Continue current approach.')
    } else if (progress.weightChange > 0) {
      recommendations.push('Weight gain detected - adjust nutrition/training if goal is weight loss.')
    }

    if (progress.bodyFatChange < 0) {
      recommendations.push('Body fat decreasing - great fat loss progress!')
    } else if (progress.bodyFatChange > 0) {
      recommendations.push('Body fat increasing - review calorie intake and cardio.')
    }

    if (progress.muscleMassChange > 0) {
      recommendations.push('Muscle mass increasing - excellent hypertrophy progress!')
    } else if (progress.muscleMassChange < 0) {
      recommendations.push('Muscle mass decreasing - review protein intake and resistance training.')
    }

    return {
      overallScore: lastAnalysis.overallScore || 0,
      progress,
      recommendations,
      strengths: lastAnalysis.strengths || [],
      weaknesses: lastAnalysis.weaknesses || [],
    }
  }
}

// Initialize client
export const getClaudeClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables')
  }
  return new ClaudeClient(apiKey)
}