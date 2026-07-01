import { NextResponse } from 'next/server'
import { getHevySyncService } from '@/lib/hevy-sync'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'syncWorkouts', days = 30 } = body

    const syncService = getHevySyncService()

    let result

    switch (action) {
      case 'syncWorkouts':
        result = await syncService.syncWorkouts({ days })
        break

      case 'syncBodyMeasurements':
      case 'syncBodyweight': // legacy alias
        result = await syncService.syncBodyMeasurements()
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[API] Hevy sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync from Hevy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const syncService = getHevySyncService()
    const result = await syncService.syncWorkouts({ days: 7 })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[API] Hevy sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync from Hevy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}