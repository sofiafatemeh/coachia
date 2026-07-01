import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await getOrCreateSystemUserId()
    await prisma.exerciseNote.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting exercise note:', error)
    return NextResponse.json({ error: 'Impossible de supprimer la note' }, { status: 500 })
  }
}
