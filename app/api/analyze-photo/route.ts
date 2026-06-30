import { NextResponse } from 'next/server'
import { getClaudeClient } from '@/lib/claude'
import { getClaudeSyncService } from '@/lib/claude-sync'
import sharp from 'sharp'

export async function POST(request: Request) {
  try {
    console.log('[API] POST /api/analyze-photo - Starting...')

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const height = formData.get('height') as string | null
    const gender = formData.get('gender') as string | null
    const age = formData.get('age') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 })
    }

    // Convert to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('[API] Original size:', buffer.length, 'bytes')

    // Compress with Sharp
    const compressed = await sharp(buffer)
      .resize(800, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer()

    const base64 = compressed.toString('base64')
    console.log('[API] Compressed size:', compressed.length, 'bytes', 'Reduction:', ((1 - compressed.length / buffer.length) * 100).toFixed(1) + '%')

    // Create data URL
    const dataUrl = `data:image/jpeg;base64,${base64}`

    // Analyze with Claude
    console.log('[API] Starting Claude analysis...')
    const syncService = getClaudeSyncService()
    const result = await syncService.analyzePhoto(dataUrl, {
      height: height ? parseInt(height) : undefined,
      gender: gender as 'male' | 'female' | undefined,
      age: age ? parseInt(age) : undefined
    })

    console.log('[API] Analysis successful!')
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}