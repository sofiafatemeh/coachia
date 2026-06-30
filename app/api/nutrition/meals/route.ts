import { NextResponse } from 'next/server'
import { getJournalSyncService } from '@/lib/journal-sync'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'dailySummary', date, days = 7 } = body

    const syncService = getJournalSyncService()

    let result

    switch (action) {
      case 'syncMeals':
        result = await syncService.syncMeals({ days })
        break

      case 'dailySummary':
        result = await syncService.dailySummary(date)
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
    console.error('[API] Journal sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync journal data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const syncService = getJournalSyncService()
    const result = await syncService.dailySummary()

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[API] Journal sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get daily summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}