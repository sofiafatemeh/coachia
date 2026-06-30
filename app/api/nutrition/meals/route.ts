import { NextResponse } from 'next/server'
import { getJournalSyncService } from '@/lib/journal-sync'
import prisma from '@/lib/prisma'

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // When a userId is provided (e.g. the dashboard), return the raw meals as an
    // array so the client can list/aggregate them. The `date` param, if present,
    // is treated as a lower bound ("meals since this date").
    if (userId) {
      const date = searchParams.get('date')
      const meals = await prisma.meal.findMany({
        where: {
          userId,
          ...(date ? { time: { gte: new Date(date) } } : {}),
        },
        orderBy: { time: 'desc' },
      })
      return NextResponse.json(meals)
    }

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