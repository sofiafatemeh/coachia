'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LatestMorphoAnalysis {
  id: string
  weekOf: string
  createdAt: string
  analysis: {
    segments: { name: string; assessment: string }[]
    advice: { exercise?: string; recommendation: string; reason?: string }[]
    progression?: string
    summary: string
  }
  photoUrls: { angle: string; url: string }[]
  emailedAt: string | null
}

const ANGLE_LABELS: Record<string, string> = {
  front: 'Face',
  side: 'Profil',
  back: 'Dos',
}
const ANGLE_ORDER = ['front', 'side', 'back']

export default function MorphoPage() {
  const [data, setData] = useState<LatestMorphoAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/analysis/weekly?action=latest')
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setData(await res.json())
      } catch (error) {
        console.error('Error fetching latest morpho analysis:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmtWeek = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const photosByAngle = new Map((data?.photoUrls ?? []).map((p) => [p.angle, p.url]))

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-onyx border-b-2 border-gold">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Dernière analyse morpho</h1>
          <Link href="/" className="text-white/70 hover:text-gold underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading && <p className="text-ink-soft">Chargement...</p>}

        {!loading && notFound && (
          <div className="bg-white border border-gold-soft rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🗓️</div>
            <p className="text-ink mb-4">Aucune analyse morpho n&apos;a encore été réalisée.</p>
            <Link
              href="/weekly"
              className="inline-block px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium"
            >
              Lancer l&apos;analyse hebdo
            </Link>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">
            {/* Summary header */}
            <div className="bg-white border-2 border-gold rounded-lg p-6">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gold-dark font-semibold mb-1">
                    Semaine du {fmtWeek(data.weekOf)}
                  </div>
                  <div className="text-xs text-ink-soft">Réalisée le {fmtDateTime(data.createdAt)}</div>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full ${
                    data.emailedAt
                      ? 'bg-gold-soft/30 text-gold-dark border border-gold-soft'
                      : 'bg-gold-soft/10 text-ink-soft border border-gold-soft'
                  }`}
                >
                  {data.emailedAt ? `📧 Envoyée le ${fmtDateTime(data.emailedAt)}` : '📧 Non envoyée par email'}
                </span>
              </div>
              <p className="text-lg text-ink">{data.analysis.summary}</p>
            </div>

            {/* Photos */}
            {data.photoUrls.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ANGLE_ORDER.filter((a) => photosByAngle.has(a)).map((angle) => (
                  <div key={angle} className="bg-white border border-gold-soft rounded-lg p-4">
                    <div className="font-semibold text-ink mb-2">{ANGLE_LABELS[angle] ?? angle}</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photosByAngle.get(angle)}
                      alt={ANGLE_LABELS[angle] ?? angle}
                      className="w-full h-64 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Segments */}
            {data.analysis.segments.length > 0 && (
              <div className="bg-white border border-gold-soft rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ink mb-4">Proportions / segments</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.analysis.segments.map((s, i) => (
                    <div key={i} className="border-l-4 border-gold pl-4 py-1">
                      <div className="font-medium text-ink">{s.name}</div>
                      <div className="text-sm text-ink-soft">{s.assessment}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advice */}
            {data.analysis.advice.length > 0 && (
              <div className="bg-white border border-gold-soft rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ink mb-4">Conseils pour adapter tes exercices</h2>
                <div className="space-y-4">
                  {data.analysis.advice.map((a, i) => (
                    <div key={i} className="bg-gold-soft/20 rounded-lg p-4">
                      {a.exercise && (
                        <span className="inline-block text-xs font-semibold text-white bg-crimson px-2 py-0.5 rounded-full mb-2">
                          {a.exercise}
                        </span>
                      )}
                      <p className="text-ink">{a.recommendation}</p>
                      {a.reason && <p className="text-sm text-ink-soft italic mt-1">{a.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progression */}
            {data.analysis.progression && (
              <div className="bg-white border border-gold-soft rounded-lg p-6">
                <h2 className="text-xl font-semibold text-ink mb-3">Progression</h2>
                <div className="border-l-4 border-crimson pl-4 italic text-ink">
                  {data.analysis.progression}
                </div>
              </div>
            )}

            <div className="text-center pt-2">
              <Link href="/weekly" className="text-sm text-ink-soft hover:text-crimson underline">
                Lancer une nouvelle analyse hebdo →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
