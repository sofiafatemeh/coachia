import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[API] GET /api/test - Checking environment variables...')

    const env = {
      ANTHROPIC_API_KEY_FOUND: !!process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_API_KEY_LENGTH: process.env.ANTHROPIC_API_KEY?.length || 0,
      ANTHROPIC_API_KEY_PREFIX: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
      HEVY_API_KEY_FOUND: !!process.env.HEVY_API_KEY,
      DATABASE_URL_FOUND: !!process.env.DATABASE_URL,
    }

    console.log('[API] Environment check:', JSON.stringify(env, null, 2))

    return NextResponse.json({
      success: true,
      env,
      message: 'Environment variables checked successfully',
    })
  } catch (error) {
    console.error('[API] Error checking environment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check environment variables',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}