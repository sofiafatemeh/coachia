import sharp from 'sharp'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getClaudeClient, type ClaudeMorphoImage, type ClaudeMorphoAnalysis } from '@/lib/claude'
import { getOrCreateSystemUserId } from '@/lib/system-user'
import { uploadProgressPhoto } from '@/lib/blob'
import { sendAdviceEmail, renderAdviceEmail } from '@/lib/email'

export interface WeeklyPhotoInput {
  angle: 'front' | 'side' | 'back'
  buffer: Buffer
}

/** Monday 00:00 of the ISO week containing `d`. */
function startOfIsoWeek(d = new Date()): Date {
  const date = new Date(d)
  const day = (date.getUTCDay() + 6) % 7 // 0 = Monday
  date.setUTCDate(date.getUTCDate() - day)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function weekKey(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD of the Monday
}

/**
 * Build a compact text summary of the athlete's actual Hevy training so the
 * morpho analysis can tailor advice to the exercises they really perform.
 */
async function buildHevyContext(userId: string): Promise<string> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const workouts = await prisma.workout.findMany({
    where: { userId, completedAt: { gte: since } },
    orderBy: { completedAt: 'desc' },
    include: { exercises: { include: { sets: true } } },
  })

  // Aggregate the heaviest working set per exercise name.
  const best = new Map<string, { weight: number; reps: number; count: number }>()
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const cur = best.get(ex.name) ?? { weight: 0, reps: 0, count: 0 }
      cur.count += 1
      for (const s of ex.sets) {
        if (s.isWarmup) continue
        if (s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
          cur.weight = s.weight
          cur.reps = s.reps
        }
      }
      best.set(ex.name, cur)
    }
  }

  if (best.size === 0) {
    return 'No Hevy training data available yet for this athlete. Give general morpho-based advice and note that exercise-specific tuning will improve once training data is synced.'
  }

  const lines = [...best.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([name, s]) =>
      `- ${name}: best working set ${s.weight}kg x ${s.reps} (seen in ${s.count} session${s.count > 1 ? 's' : ''})`
    )

  // Latest body circumferences from Hevy body_measurements, if present.
  const latest = await prisma.measurement.findFirst({
    where: { userId, bodyScoreData: { not: Prisma.DbNull } },
    orderBy: { createdAt: 'desc' },
  })
  const circumferences = latest?.bodyScoreData
    ? `\nLatest logged body measurements (cm/kg): ${JSON.stringify(latest.bodyScoreData)}`
    : ''

  return `The athlete's exercises from their Hevy log over the last 30 days:\n${lines.join('\n')}${circumferences}`
}

async function compressToBase64(buffer: Buffer): Promise<string> {
  const compressed = await sharp(buffer)
    .resize(800, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer()
  return compressed.toString('base64')
}

export interface WeeklyAnalysisResult {
  id: string
  weekOf: Date
  analysis: ClaudeMorphoAnalysis
  photoUrls: { angle: string; url: string }[]
  email: { sent: boolean; reason?: string }
}

/**
 * Run the full weekly pipeline: store the 3 photos, gather Hevy context, run the
 * morpho analysis, persist it, and email the advice.
 */
export async function runWeeklyAnalysis(
  photos: WeeklyPhotoInput[],
  options?: { height?: number; gender?: 'male' | 'female'; age?: number; email?: string }
): Promise<WeeklyAnalysisResult> {
  const userId = await getOrCreateSystemUserId()
  const weekOf = startOfIsoWeek()
  const wk = weekKey(weekOf)

  // 1. Store photos (Blob) + ProgressPhoto rows, and prepare images for Claude.
  const images: ClaudeMorphoImage[] = []
  const photoUrls: { angle: string; url: string }[] = []
  const photoIds: string[] = []

  for (const p of photos) {
    const base64 = await compressToBase64(p.buffer)
    images.push({ angle: p.angle, base64, mediaType: 'image/jpeg' })

    // Store in Blob, but don't let a storage misconfig break the analysis:
    // fall back to an inline data URL so the pipeline still completes.
    let url: string
    try {
      url = await uploadProgressPhoto(Buffer.from(base64, 'base64'), { angle: p.angle, weekKey: wk })
    } catch (err) {
      console.error('[morpho] Blob upload failed, storing inline fallback:', err)
      url = `data:image/jpeg;base64,${base64}`
    }
    photoUrls.push({ angle: p.angle, url })

    const row = await prisma.progressPhoto.create({
      data: { userId, url, angle: p.angle },
    })
    photoIds.push(row.id)
  }

  // 2. Previous week's summary for a qualitative progression note.
  const previous = await prisma.morphoAnalysis.findFirst({
    where: { userId, weekOf: { lt: weekOf } },
    orderBy: { weekOf: 'desc' },
  })
  const hevyContext = await buildHevyContext(userId)
  const context = previous?.summary
    ? `${hevyContext}\n\nPrevious week's summary (for progression): ${previous.summary}`
    : hevyContext

  // 3. Morpho analysis.
  const claude = getClaudeClient()
  const analysis = await claude.analyzeMorphology(images, context, {
    height: options?.height,
    gender: options?.gender,
    age: options?.age,
  })

  // 4. Persist.
  const record = await prisma.morphoAnalysis.create({
    data: {
      userId,
      weekOf,
      photoIds,
      segments: analysis.segments as object,
      advice: analysis.advice as object,
      progression: analysis.progression ? { text: analysis.progression } : undefined,
      summary: analysis.summary,
      claudeModel: 'claude-sonnet-4-6',
      raw: analysis as object,
    },
  })

  // 5. Email the advice.
  const weekLabel = weekOf.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const { subject, html } = renderAdviceEmail(analysis, `semaine du ${weekLabel}`)
  const email = await sendAdviceEmail({ subject, html, to: options?.email })
  if (email.sent) {
    await prisma.morphoAnalysis.update({ where: { id: record.id }, data: { emailedAt: new Date() } })
  }

  return { id: record.id, weekOf, analysis, photoUrls, email: { sent: email.sent, reason: email.reason } }
}
