// Claude API Client
// https://docs.anthropic.com/claude/reference/messages

export type ClaudeModel = 'claude-sonnet-4-6' | 'claude-opus-4-8' | 'claude-haiku-4-5-20251001'

// Default model used when the caller doesn't specify one.
// Must be a valid Anthropic model id. 'claude-sonnet-4-6' is a current vision-capable
// model; the earlier 'claude-sonnet-5' does not exist and 404s on every Vision call.
const DEFAULT_MODEL: ClaudeModel = 'claude-sonnet-4-6'

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

export interface ClaudeVisionAnalysis {
  overallScore: number // 0-100
  confidence: number // 0-1
  imageUrl: string
  weight?: number // kg
  bodyFat?: number // %
  muscleMass?: number // kg
  bmi?: number
  chestScore?: number
  backScore?: number
  legsScore?: number
  armsScore?: number
  shouldersScore?: number
  coreScore?: number
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
}

export interface ClaudeMorphoImage {
  angle: string // front | side | back
  base64: string
  mediaType: string
}

export interface ClaudeMorphoAnalysis {
  segments: { name: string; assessment: string }[]
  advice: { exercise?: string; recommendation: string; reason?: string }[]
  progression?: string
  summary: string
  overallScore?: number
}

export interface ClaudeProgressAnalysis {
  scoreDiff: number
  weightDiff?: number
  muscleMassDiff?: number
  bodyFatDiff?: number
  improvements: string[]
  areasForImprovement: string[]
  summary: string
}

export class ClaudeClient {
  private apiKey: string
  private baseUrl = 'https://api.anthropic.com/v1/messages'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzePhoto(imageUrl: string, options?: {
    model?: ClaudeModel
    height?: number
    gender?: 'male' | 'female'
    age?: number
  }): Promise<ClaudeVisionAnalysis> {
    console.log('[Claude] Starting photo analysis...')
    console.log('[Claude] Image URL:', imageUrl)
    console.log('[Claude] Options:', JSON.stringify(options, null, 2))

    try {
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const mediaType = imageResponse.headers.get('content-type') || 'image/jpeg'

      console.log('[Claude] Image fetched. Size:', imageBuffer.byteLength, 'bytes. Type:', mediaType)

      let systemPrompt = `You are an expert fitness coach analyzing physique photos. Provide a detailed analysis including:

1. Overall score (0-100) based on:
   - Muscle definition
   - Symmetry
   - Proportions
   - Overall aesthetics

2. Confidence level (0-1) in your assessment

3. Body composition estimates:
   - Weight (in kg, based on visual appearance)
   - Body fat percentage
   - Muscle mass estimate
   - BMI estimate

4. Muscle group scores (0-100 each):
   - Chest
   - Back
   - Legs
   - Arms
   - Shoulders
   - Core

5. Strengths (3-5 key points)
6. Weaknesses (3-5 key points)
7. Recommendations (3-5 specific, actionable suggestions)

Return ONLY valid JSON with this exact structure:
{
  "overallScore": number,
  "confidence": number,
  "weight": number,
  "bodyFat": number,
  "muscleMass": number,
  "bmi": number,
  "chestScore": number,
  "backScore": number,
  "legsScore": number,
  "armsScore": number,
  "shouldersScore": number,
  "coreScore": number,
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": string[]
}`

      if (options?.height) {
        systemPrompt += `\n\nThe person is ${options.height}cm tall.`
      }
      if (options?.gender) {
        systemPrompt += `\n\nThe person is ${options.gender}.`
      }
      if (options?.age) {
        systemPrompt += `\n\nThe person is approximately ${options.age} years old.`
      }

      const model = options?.model || DEFAULT_MODEL

      console.log('[Claude] Calling Claude API with model:', model)

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
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
              ],
            },
          ],
        }),
      })

      console.log('[Claude] Response status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('[Claude] API Error:', JSON.stringify(error, null, 2))
        throw new Error(`Claude API error: ${response.status} - ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      console.log('[Claude] Response data received. Parsing...')

      const content = data.content[0]?.text || ''
      console.log('[Claude] Raw response:', content.substring(0, 200))

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('[Claude] No JSON found in response')
        throw new Error('No JSON found in Claude response')
      }

      const result = JSON.parse(jsonMatch[0])
      console.log('[Claude] Parsed result:', JSON.stringify(result, null, 2))

      if (typeof result.overallScore !== 'number' || typeof result.confidence !== 'number') {
        console.error('[Claude] Invalid result structure:', result)
        throw new Error('Invalid Claude response structure')
      }

      console.log('[Claude] Analysis successful!')

      return {
        overallScore: result.overallScore,
        confidence: result.confidence,
        imageUrl,
        weight: result.weight,
        bodyFat: result.bodyFat,
        muscleMass: result.muscleMass,
        bmi: result.bmi,
        chestScore: result.chestScore,
        backScore: result.backScore,
        legsScore: result.legsScore,
        armsScore: result.armsScore,
        shouldersScore: result.shouldersScore,
        coreScore: result.coreScore,
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        recommendations: result.recommendations || [],
      }
    } catch (error) {
      console.error('[Claude] Error during analysis:', error)
      if (error instanceof Error) {
        console.error('[Claude] Error message:', error.message)
        console.error('[Claude] Error stack:', error.stack)
      }
      throw error
    }
  }

  /**
   * Morpho-anatomical analysis of the weekly photo set (front/side/back) combined
   * with the athlete's actual Hevy exercises. Produces segment-proportion estimates
   * and concrete advice to adapt those exercises to the morphology.
   */
  async analyzeMorphology(
    images: ClaudeMorphoImage[],
    context: string,
    options?: { model?: ClaudeModel; height?: number; gender?: 'male' | 'female'; age?: number }
  ): Promise<ClaudeMorphoAnalysis> {
    let systemPrompt = `You are an expert in anthropometry and strength & conditioning coaching.
You are given physique photos from up to three angles (front, side, back) and the list of
exercises the athlete actually performs (from their training log). Your job:

1. Estimate the athlete's SEGMENT PROPORTIONS qualitatively from the photos (relative, not
   absolute cm): torso vs leg length, arm and forearm length, femur vs tibia, clavicle/shoulder
   width, hip width. Note the leverages that matter for training.
2. Give CONCRETE, actionable advice to ADAPT THE ATHLETE'S ACTUAL EXERCISES to this morphology
   (stance/grip width, range of motion, foot placement, exercise substitutions, which muscle
   groups to prioritise given the leverages). Reference the exercises from the log by name.
3. Give a brief qualitative PROGRESSION note when previous context is provided.

Do NOT obsess over exact body-fat or weight percentages — the athlete does not care about precise
percentages and knows they are never exact. Focus on morphology, leverages and exercise adaptation.

Return ONLY valid JSON with this exact structure:
{
  "segments": [ { "name": string, "assessment": string } ],
  "advice": [ { "exercise": string, "recommendation": string, "reason": string } ],
  "progression": string,
  "summary": string,
  "overallScore": number
}`

    if (options?.height) systemPrompt += `\n\nThe athlete is ${options.height}cm tall.`
    if (options?.gender) systemPrompt += `\n\nThe athlete is ${options.gender}.`
    if (options?.age) systemPrompt += `\n\nThe athlete is approximately ${options.age} years old.`

    const content: ClaudeContent[] = images.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    }))
    content.push({
      type: 'text',
      text: `Photo angles provided (in order): ${images.map((i) => i.angle).join(', ')}.\n\n${context}`,
    })

    const model = options?.model || DEFAULT_MODEL

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude morpho response')
    }

    const result = JSON.parse(jsonMatch[0])
    return {
      segments: Array.isArray(result.segments) ? result.segments : [],
      advice: Array.isArray(result.advice) ? result.advice : [],
      progression: result.progression ?? undefined,
      summary: result.summary ?? '',
      overallScore: typeof result.overallScore === 'number' ? result.overallScore : undefined,
    }
  }

  async analyzeProgress(
    photoUrls: string[],
    options?: {
      days?: number
      model?: ClaudeModel
    }
  ): Promise<ClaudeProgressAnalysis> {
    console.log('[Claude] Starting progress analysis...')
    console.log('[Claude] Photo URLs:', photoUrls.length, 'photos')

    try {
      const imagePromises = photoUrls.map(async (url) => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`)
        }
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mediaType = response.headers.get('content-type') || 'image/jpeg'
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64,
          },
        }
      })

      const images = await Promise.all(imagePromises)
      console.log('[Claude] Images fetched:', images.length)

      let systemPrompt = `You are an expert fitness coach analyzing progress photos. Compare the physique evolution.

Provide:
1. Overall score difference (positive = improvement)
2. Weight change (in kg, estimate)
3. Muscle mass change (estimate)
4. Body fat change (estimate)
5. 3-5 improvements observed
6. 3-5 areas for continued improvement
7. Brief summary of progress

Return ONLY valid JSON:
{
  "scoreDiff": number,
  "weightDiff": number,
  "muscleMassDiff": number,
  "bodyFatDiff": number,
  "improvements": string[],
  "areasForImprovement": string[],
  "summary": string
}`

      if (options?.days) {
        systemPrompt += `\n\nThese photos were taken ${options.days} days apart.`
      }

      const model = options?.model || DEFAULT_MODEL

      console.log('[Claude] Calling Claude API for progress...')

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                ...images,
                { type: 'text' as const, text: 'Compare these progress photos' },
              ],
            },
          ],
        }),
      })

      console.log('[Claude] Progress response status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('[Claude] Progress API Error:', JSON.stringify(error, null, 2))
        throw new Error(`Claude API error: ${response.status} - ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      console.log('[Claude] Progress response received. Parsing...')

      const content = data.content[0]?.text || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('[Claude] No JSON found in progress response')
        throw new Error('No JSON found in Claude response')
      }

      const result = JSON.parse(jsonMatch[0])
      console.log('[Claude] Progress result:', JSON.stringify(result, null, 2))

      return {
        scoreDiff: result.scoreDiff,
        weightDiff: result.weightDiff,
        muscleMassDiff: result.muscleMassDiff,
        bodyFatDiff: result.bodyFatDiff,
        improvements: result.improvements || [],
        areasForImprovement: result.areasForImprovement || [],
        summary: result.summary || '',
      }
    } catch (error) {
      console.error('[Claude] Progress analysis error:', error)
      throw error
    }
  }
}

export const getClaudeClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  console.log('[Claude] Initializing client... ANTHROPIC_API_KEY found:', !!apiKey)

  if (!apiKey) {
    console.error('[Claude] ANTHROPIC_API_KEY not found in environment variables')
    throw new Error('ANTHROPIC_API_KEY not found in environment variables')
  }

  return new ClaudeClient(apiKey)
}