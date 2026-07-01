import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'

export async function GET() {
  try {
    const userId = await getOrCreateSystemUserId()
    const notes = await prisma.exerciseNote.findMany({
      where: { userId },
      orderBy: [{ exerciseName: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ notes })
  } catch (error) {
    console.error('[API] Error fetching exercise notes:', error)
    return NextResponse.json({ error: 'Impossible de récupérer les notes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getOrCreateSystemUserId()
    const body = await request.json()
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (!note) {
      return NextResponse.json({ error: 'Le texte de la note est requis' }, { status: 400 })
    }
    const exerciseName = typeof body.exerciseName === 'string' && body.exerciseName.trim() ? body.exerciseName.trim() : null
    const activeFrom = body.activeFrom ? new Date(body.activeFrom) : null
    const activeUntil = body.activeUntil ? new Date(body.activeUntil) : null

    const created = await prisma.exerciseNote.create({
      data: { userId, exerciseName, note, activeFrom, activeUntil },
    })
    return NextResponse.json({ note: created }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating exercise note:', error)
    return NextResponse.json({ error: 'Impossible de créer la note' }, { status: 500 })
  }
}
