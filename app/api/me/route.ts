import { NextResponse } from 'next/server'
import { getOrCreateSystemUserId } from '@/lib/system-user'

// The single-user account that every sync/analysis writes to. All screens should
// read this, not the first row of /api/users (which may be a stale demo user).
export async function GET() {
  const id = await getOrCreateSystemUserId()
  return NextResponse.json({ id })
}
