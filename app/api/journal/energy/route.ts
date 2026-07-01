import { NextResponse } from 'next/server'
import { getJournalSyncService } from '@/lib/journal-sync'

// Daily calories + macros + estimated expenditure from Journal Santé.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '14') || 14
    const summary = await getJournalSyncService().dailyEnergySummary(days)
    return NextResponse.json({ days: summary })
  } catch (error) {
    console.error('[API] Journal energy error:', error)
    return NextResponse.json(
      { error: 'Énergie Journal Santé indisponible', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
