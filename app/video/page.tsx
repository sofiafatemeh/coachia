'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

interface FormResult {
  analysis: {
    formScore: number
    reps?: number
    feedback: string
    cues: { issue: string; correction: string }[]
  }
}

const FRAME_COUNT = 6

export default function VideoPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [exercise, setExercise] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<FormResult | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreviewUrl(f ? URL.createObjectURL(f) : null)
  }

  // Extract FRAME_COUNT evenly-spaced keyframes from the clip via canvas.
  const extractFrames = (url: string): Promise<{ blobs: Blob[]; duration: number }> =>
    new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = url
      video.muted = true
      video.playsInline = true
      videoRef.current = video

      video.onerror = () => reject(new Error('Lecture vidéo impossible'))
      video.onloadedmetadata = async () => {
        const duration = video.duration || 0
        const w = Math.min(video.videoWidth || 720, 720)
        const scale = w / (video.videoWidth || w)
        const h = Math.round((video.videoHeight || 720) * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas non disponible'))

        const blobs: Blob[] = []
        for (let i = 0; i < FRAME_COUNT; i++) {
          const t = (duration * (i + 0.5)) / FRAME_COUNT
          setStatus(`Extraction image ${i + 1}/${FRAME_COUNT}…`)
          await new Promise<void>((res) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              res()
            }
            video.addEventListener('seeked', onSeeked)
            video.currentTime = Math.min(t, Math.max(0, duration - 0.05))
          })
          ctx.drawImage(video, 0, 0, w, h)
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.8))
          if (blob) blobs.push(blob)
        }
        resolve({ blobs, duration: Math.round(duration) })
      }
    })

  const submit = async () => {
    if (!file) {
      alert('Choisis une vidéo (~30 s) de ta série.')
      return
    }
    if (!exercise.trim()) {
      alert('Indique le nom de l’exercice.')
      return
    }
    setAnalyzing(true)
    setResult(null)
    try {
      setStatus('Extraction des images clés…')
      const { blobs, duration } = await extractFrames(previewUrl as string)
      if (blobs.length === 0) throw new Error('Aucune image extraite de la vidéo')

      const fd = new FormData()
      fd.append('exercise', exercise.trim())
      fd.append('duration', String(duration))
      blobs.forEach((b, i) => fd.append('frames', b, `frame-${i}.jpg`))

      setStatus('Analyse de l’exécution…')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const res = await fetch('/api/analysis/video', { method: 'POST', body: fd, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        const txt = await res.text()
        let msg = txt
        try { msg = JSON.parse(txt).details || JSON.parse(txt).error } catch {}
        throw new Error(msg || `HTTP ${res.status}`)
      }
      setResult(await res.json())
    } catch (e: any) {
      alert(`Erreur: ${e.name === 'AbortError' ? 'Timeout (> 2 min)' : e.message}`)
    } finally {
      setAnalyzing(false)
      setStatus('')
    }
  }

  const score = result?.analysis.formScore ?? 0

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-onyx border-b-2 border-gold">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Analyse vidéo</h1>
          <Link href="/" className="text-white/70 hover:text-gold underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-ink-soft mb-6">
          Filme une série (~30 s) d&apos;un exercice. L&apos;analyse examine ton exécution image par image
          et te donne un score de forme + des corrections concrètes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <label className="bg-white border border-gold-soft rounded-lg p-4 cursor-pointer hover:border-crimson transition block">
            <div className="font-semibold text-ink mb-2">Vidéo</div>
            {previewUrl ? (
              <video src={previewUrl} controls className="w-full h-56 object-contain rounded bg-black" />
            ) : (
              <div className="w-full h-56 rounded bg-gold-soft/30 flex items-center justify-center text-ink-soft text-sm">
                Choisir une vidéo
              </div>
            )}
            <input type="file" accept="video/*" className="hidden" onChange={onPick} />
          </label>

          <div className="flex flex-col gap-3">
            <input
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="Exercice (ex: Squat, Développé couché…)"
              className="px-3 py-2 border border-gold-soft rounded-lg text-sm"
            />
            <button
              onClick={submit}
              disabled={analyzing}
              className="px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition disabled:opacity-50"
            >
              {analyzing ? (status || 'Analyse…') : 'Analyser l’exécution'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white border border-gold-soft rounded-lg p-6 space-y-5">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-ink">{score}/100</span>
              <span className="text-ink-soft">score d&apos;exécution</span>
              {typeof result.analysis.reps === 'number' && result.analysis.reps > 0 && (
                <span className="text-sm text-ink-soft ml-auto">{result.analysis.reps} reps détectées</span>
              )}
            </div>
            <p className="text-ink">{result.analysis.feedback}</p>
            <div>
              <h3 className="font-semibold text-ink mb-2">Corrections</h3>
              <ul className="space-y-2 text-sm text-ink">
                {result.analysis.cues.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.issue}</span>
                    <div className="text-ink-soft">→ {c.correction}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
