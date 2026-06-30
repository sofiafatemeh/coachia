import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[API] GET /api/test-claude - Testing Claude API...')

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found')
    }

    // Try simple message without vision first
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Claude API works!"',
          },
        ],
      }),
    })

    console.log('[API] Response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('[API] Error:', JSON.stringify(error, null, 2))
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    console.log('[API] Success:', JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}