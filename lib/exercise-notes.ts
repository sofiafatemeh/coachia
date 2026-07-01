import prisma from '@/lib/prisma'
import type { ExerciseNote } from '@prisma/client'

/** Notes active right now: no window, or now inside [activeFrom, activeUntil]. */
export async function getActiveExerciseNotes(userId: string, now: Date = new Date()): Promise<ExerciseNote[]> {
  return prisma.exerciseNote.findMany({
    where: {
      userId,
      AND: [
        { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
        { OR: [{ activeUntil: null }, { activeUntil: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
}

function normalize(name: string): string {
  return name.trim().toLowerCase()
}

/** Notes tied to a specific exercise name (case-insensitive) among the active set. */
export function notesForExercise(notes: ExerciseNote[], exerciseName: string): ExerciseNote[] {
  const target = normalize(exerciseName)
  return notes.filter((n) => n.exerciseName && normalize(n.exerciseName) === target)
}

/** General notes (no exerciseName) among the active set — apply to all exercises. */
export function generalNotes(notes: ExerciseNote[]): ExerciseNote[] {
  return notes.filter((n) => !n.exerciseName)
}

/** Render a block of active notes as plain text for a Claude system/context prompt. */
export function formatNotesForPrompt(notes: ExerciseNote[]): string {
  if (notes.length === 0) return ''

  const perExercise = notes.filter((n) => n.exerciseName)
  const general = notes.filter((n) => !n.exerciseName)

  const lines: string[] = []
  if (perExercise.length > 0) {
    lines.push('Notes d\'exécution spécifiques (à respecter pour interpréter les charges/mouvements) :')
    for (const n of perExercise) {
      lines.push(`- ${n.exerciseName} : ${n.note}`)
    }
  }
  if (general.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('Notes générales sur la période récente :')
    for (const n of general) {
      lines.push(`- ${n.note}`)
    }
  }
  return lines.join('\n')
}
