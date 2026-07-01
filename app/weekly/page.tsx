'use client'

import { useState } from 'react'
import Link from 'next/link'

interface MorphoResult {
  analysis: {
    segments: { name: string; assessment: string }[]
    advice: { exercise?: string; recommendation: string; reason?: string }[]
    progression?: string
    summary: string
  }
  email: { sent: boolean; reason?: string }
}

const ANGLES = [
  { key: 'front', label: 'Face' },
  { key: 'side', label: 'Profil' },
  { key: 'back', label: 'Dos' },
] as const

export default function WeeklyPage() {
  const [files, setFiles] = useState<Record<string, File | null>>({ front: null, side: null, back: null })
  const [previews, setPreviews] = useState<Record<string, string | null>>({ front: null, side: null, back: null })
  const [height, setHeight] = useState('')
  const [gender, setGender] = useState('male')
  const [age, setAge] = useState('')
  const [email, setEmail] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<MorphoResult | null>(null)

  const pickFile = (angle: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFiles((f) => ({ ...f, [angle]: file }))
    setPreviews((p) => ({ ...p, [angle]: file ? URL.createObjectURL(file) : null }))
  }

  const submit = async () => {
    const chosen = ANGLES.filter((a) => files[a.key])
    if (chosen.length === 0) {
      alert('Ajoute au moins une photo (idéalement les 3 : face, profil, dos).')
      return
    }

    setAnalyzing(true)
    setResult(null)
    try {
      const fd = new FormData()
      for (const a of ANGLES) {
        if (files[a.key]) fd.append(a.key, files[a.key] as File)
      }
      fd.append('height', height)
      fd.append('gender', gender)
      fd.append('age', age)
      if (email) fd.append('email', email)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)
      const res = await fetch('/api/analysis/weekly', { method: 'POST', body: fd, signal: controller.signal })
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
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-900">Analyse hebdo</h1>
          <Link href="/" className="text-zinc-600 hover:text-zinc-900 underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-zinc-600 mb-6">
          Ajoute tes 3 photos de la semaine. L&apos;analyse combine tes proportions et tes exercices Hevy
          pour te conseiller comment adapter ton entraînement — et t&apos;envoie le tout par email.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {ANGLES.map((a) => (
            <label key={a.key} className="bg-white border border-zinc-200 rounded-lg p-4 cursor-pointer hover:border-zinc-400 transition block">
              <div className="font-semibold text-zinc-900 mb-2">{a.label}</div>
              {previews[a.key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[a.key] as string} alt={a.label} className="w-full h-48 object-cover rounded" />
              ) : (
                <div className="w-full h-48 rounded bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">
                  Choisir une photo
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={pickFile(a.key)} />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Taille (cm)" inputMode="numeric" className="px-3 py-2 border border-zinc-300 rounded-lg text-sm" />
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="px-3 py-2 border border-zinc-300 rounded-lg text-sm">
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
          <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Âge" inputMode="numeric" className="px-3 py-2 border border-zinc-300 rounded-lg text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optionnel)" type="email" className="px-3 py-2 border border-zinc-300 rounded-lg text-sm" />
        </div>

        <button
          onClick={submit}
          disabled={analyzing}
          className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition disabled:opacity-50"
        >
          {analyzing ? 'Analyse en cours… (jusqu’à 1 min)' : 'Lancer l’analyse hebdo'}
        </button>

        {result && (
          <div className="mt-8 bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-1">Résumé</h2>
              <p className="text-zinc-700">{result.analysis.summary}</p>
              <p className="text-xs text-zinc-500 mt-2">
                {result.email.sent ? '📧 Conseils envoyés par email.' : `📧 Email non envoyé (${result.email.reason ?? 'non configuré'}).`}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-zinc-900 mb-2">Proportions / segments</h3>
              <ul className="space-y-1 text-sm text-zinc-700">
                {result.analysis.segments.map((s, i) => (
                  <li key={i}><span className="font-medium">{s.name} :</span> {s.assessment}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-zinc-900 mb-2">Conseils pour adapter tes exercices</h3>
              <ul className="space-y-2 text-sm text-zinc-700">
                {result.analysis.advice.map((a, i) => (
                  <li key={i}>
                    {a.exercise && <span className="font-medium">{a.exercise} — </span>}
                    {a.recommendation}
                    {a.reason && <div className="text-zinc-500 italic">{a.reason}</div>}
                  </li>
                ))}
              </ul>
            </div>

            {result.analysis.progression && (
              <div>
                <h3 className="font-semibold text-zinc-900 mb-2">Progression</h3>
                <p className="text-sm text-zinc-700">{result.analysis.progression}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
