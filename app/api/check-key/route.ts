import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[API] Checking API key validity...')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not found',
      })
    }

    // Test with Anthropic API key verification endpoint
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    })

    console.log('[API] Models endpoint status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({
        success: false,
        status: response.status,
        error: error.error?.message || response.statusText,
        errorDetails: error,
      })
    }

    const models = await response.json()
    console.log('[API] Available models:', JSON.stringify(models, null, 2))

    return NextResponse.json({
      success: true,
      models,
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