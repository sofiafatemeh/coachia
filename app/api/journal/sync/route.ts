import { NextResponse } from 'next/server'
import { getJournalSyncService } from '@/lib/journal-sync'

export const maxDuration = 60

export async function POST() {
  try {
    const result = await getJournalSyncService().syncAll()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[API] Journal Santé sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Sync Journal Santé échouée', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}
