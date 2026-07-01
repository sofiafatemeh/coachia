import { NextResponse } from 'next/server'
import sharp from 'sharp'
import prisma from '@/lib/prisma'
import { getClaudeClient, type ClaudeMorphoImage } from '@/lib/claude'
import { getOrCreateSystemUserId } from '@/lib/system-user'
import { uploadProgressPhoto } from '@/lib/blob'

export const runtime = 'nodejs'
export const maxDuration = 120

async function compressToBase64(buffer: Buffer): Promise<string> {
  const out = await sharp(buffer)
    .resize(720, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer()
  return out.toString('base64')
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const exercise = (formData.get('exercise') as string | null) || 'exercice'
    const duration = parseInt((formData.get('duration') as string | null) || '0') || 0

    // Ordered keyframes extracted client-side from the clip.
    const frameFiles = formData.getAll('frames').filter((f): f is File => f instanceof File)
    if (frameFiles.length === 0) {
      return NextResponse.json({ error: 'Aucune image (frames) reçue' }, { status: 400 })
    }

    const images: ClaudeMorphoImage[] = []
    for (const f of frameFiles) {
      const base64 = await compressToBase64(Buffer.from(await f.arrayBuffer()))
      images.push({ angle: 'frame', base64, mediaType: 'image/jpeg' })
    }

    // Analyse execution/form.
    const claude = getClaudeClient()
    const analysis = await claude.analyzeExerciseForm(images, exercise)

    // Store a representative thumbnail (first frame) so the Video row has a URL.
    const userId = await getOrCreateSystemUserId()
    let url = ''
    try {
      url = await uploadProgressPhoto(Buffer.from(images[0].base64, 'base64'), {
        angle: 'video',
        weekKey: new Date().toISOString().slice(0, 10),
      })
    } catch {
      url = 'data:image/jpeg;base64,' + images[0].base64 // fallback if Blob not configured
    }

    const video = await prisma.video.create({
      data: {
        userId,
        exercise,
        url,
        duration,
        repCount: analysis.reps ?? null,
        formScore: analysis.formScore,
        feedback: analysis.feedback,
        keypoints: analysis.cues as object,
      },
    })

    return NextResponse.json({ video, analysis }, { status: 201 })
  } catch (error) {
    console.error('[API] Video form analysis error:', error)
    return NextResponse.json(
      { error: 'Analyse vidéo échouée', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const exercise = searchParams.get('exercise')

    const videos = await prisma.video.findMany({
      where: exercise ? { exercise } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ videos, total: videos.length })
  } catch (error) {
    console.error('Error fetching video analyses:', error)
    return NextResponse.json({ error: 'Failed to fetch video analyses' }, { status: 500 })
  }
}
