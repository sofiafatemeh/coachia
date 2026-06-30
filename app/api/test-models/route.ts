import { NextResponse } from 'next/server'

const MODELS_TO_TEST = [
  'claude-3-haiku-20240307',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-20241022',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-20250514',
]

export async function GET() {
  try {
    console.log('[API] Testing all Claude models...')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found')
    }

    const results = []

    for (const model of MODELS_TO_TEST) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [
              {
                role: 'user',
                content: 'Hi',
              },
            ],
          }),
        })

        const success = response.ok
        let error = null

        if (!success) {
          const errorData = await response.json()
          error = errorData.error?.message || response.statusText
        }

        results.push({
          model,
          success,
          status: response.status,
          error,
        })

        console.log(`[API] ${model}: ${response.ok ? '✓' : '✗'} ${response.status}`)

        // If success, break
        if (success) {
          break
        }
      } catch (err) {
        results.push({
          model,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const workingModel = results.find((r) => r.success)

    return NextResponse.json({
      success: true,
      workingModel: workingModel?.model || null,
      results,
    })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}