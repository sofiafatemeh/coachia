import { NextResponse } from 'next/server'
import { runWeeklyAnalysis, type WeeklyPhotoInput } from '@/lib/morpho'

export const runtime = 'nodejs'
export const maxDuration = 120

const ANGLES = ['front', 'side', 'back'] as const

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const photos: WeeklyPhotoInput[] = []
    for (const angle of ANGLES) {
      const file = formData.get(angle) as File | null
      if (file) {
        photos.push({ angle, buffer: Buffer.from(await file.arrayBuffer()) })
      }
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une photo est requise (front, side ou back)' },
        { status: 400 }
      )
    }

    const height = formData.get('height') as string | null
    const gender = formData.get('gender') as string | null
    const age = formData.get('age') as string | null
    const email = formData.get('email') as string | null

    const result = await runWeeklyAnalysis(photos, {
      height: height ? parseInt(height) : undefined,
      gender: (gender as 'male' | 'female' | null) ?? undefined,
      age: age ? parseInt(age) : undefined,
      email: email ?? undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[API] Weekly morpho analysis error:', error)
    return NextResponse.json(
      { error: 'Analyse hebdomadaire échouée', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
