'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DEFAULT_HEIGHT_CM, currentAge } from '@/lib/profile'

interface AnalysisResult {
  score: number
  weight: number
  bodyFat: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export default function PhotosPage() {
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [height, setHeight] = useState(String(DEFAULT_HEIGHT_CM))
  const [gender, setGender] = useState('male')
  const [age, setAge] = useState(String(currentAge()))
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setImageUrl('')
      console.log('Fichier:', file.name, file.size, 'bytes', file.type)
    }
  }

  const analyzePhoto = async () => {
    if (!imageUrl && !imageFile) {
      alert('Sélectionnez une photo ou entrez une URL')
      return
    }

    setAnalyzing(true)
    setUploadProgress(0)
    setResult(null)

    try {
      console.log('Début analyse...')

      if (imageUrl) {
        // URL mode
        setUploadProgress(50)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000)

        try {
          const res = await fetch('/api/analysis/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl, height, gender, age })
          })

          clearTimeout(timeoutId)

          if (!res.ok) {
            const errorText = await res.text()
            let errorData
            try { errorData = JSON.parse(errorText) } catch { errorData = { error: errorText } }
            throw new Error(errorData.error || `HTTP ${res.status}`)
          }

          const data = await res.json()
          setResult(data)
          fetchHistory()
          setUploadProgress(100)
        } catch (fetchError: any) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Timeout (> 2 min)')
          }
          throw fetchError
        }
        return
      }

      // File upload mode - use FormData
      console.log('Upload fichier...')
      setUploadProgress(25)

      const formData = new FormData()
      formData.append('height', height)
      formData.append('gender', gender)
      formData.append('age', age)
      formData.append('file', imageFile as File)

      console.log('Envoi au serveur...')
      setUploadProgress(50)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)

      try {
        const res = await fetch('/api/analyze-photo', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errorText = await res.text()
          let errorData
          try { errorData = JSON.parse(errorText) } catch { errorData = { error: errorText } }
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }

        console.log('Réponse reçue...')
        setUploadProgress(90)

        const data = await res.json()
        setResult(data)
        fetchHistory()
        setUploadProgress(100)
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout (> 2 min). Image trop grosse ?')
        }
        throw fetchError
      }
    } catch (error) {
      console.error('Error analyzing photo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur: ${errorMessage}`)
    } finally {
      setAnalyzing(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/analysis/photos?action=history&days=30')
      const data = await res.json()
      setHistory(data.analyses || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-onyx border-b-2 border-gold">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">📸 Analyse Photos</h1>
          <Link href="/" className="text-white/70 hover:text-gold underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg border border-gold-soft p-6">
            <h2 className="text-xl font-semibold text-ink mb-6">Analyser une photo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  📷 Photo
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gold-soft/30 file:text-ink hover:file:bg-gold-soft/40"
                  />
                  <div className="text-center text-ink-soft text-sm">ou</div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value)
                      setImageFile(null)
                      setPreviewUrl(null)
                    }}
                    placeholder="https://exemple.com/photo.jpg"
                    className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                  />
                </div>
                {imageFile && (
                  <div className="mt-2 text-sm text-ink-soft">
                    Fichier: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
                {previewUrl && (
                  <div className="mt-4">
                    <div className="text-sm text-ink-soft mb-2">Preview:</div>
                    <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-gold-soft" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="180"
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Genre
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Âge
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                />
              </div>

              {/* Progress bar */}
              {analyzing && (
                <div className="mt-4">
                  <div className="text-sm text-ink-soft mb-2">
                    {uploadProgress < 50 ? 'Préparation...' : uploadProgress < 75 ? 'Envoi...' : uploadProgress < 90 ? 'Analyse...' : 'Terminé!'}
                  </div>
                  <div className="w-full bg-gold-soft/40 rounded-full h-2">
                    <div
                      className="bg-crimson h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={analyzePhoto}
                disabled={analyzing || (!imageUrl && !imageFile)}
                className="w-full px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadProgress < 50 ? 'Préparation...' : uploadProgress < 75 ? 'Envoi...' : 'Analyse...'}
                  </span>
                ) : '🔍 Analyser'}
              </button>

              <div className="text-xs text-ink-soft mt-2">
                Upload via FormData (plus rapide). Compression automatique côté serveur.
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-white rounded-lg border border-gold-soft p-6">
              <h2 className="text-xl font-semibold text-ink mb-6">Résultats</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gold-soft/20 rounded-lg">
                  <div className="text-sm text-ink-soft mb-1">Score global</div>
                  <div className="text-4xl font-bold text-ink">{result.score}/100</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gold-soft/20 rounded-lg">
                    <div className="text-sm text-ink-soft mb-1">Poids estimé</div>
                    <div className="text-2xl font-bold text-ink">{result.weight} kg</div>
                  </div>
                  <div className="p-4 bg-gold-soft/20 rounded-lg">
                    <div className="text-sm text-ink-soft mb-1">Graisse corporelle</div>
                    <div className="text-2xl font-bold text-ink">{result.bodyFat}%</div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-800 mb-2">✅ Points forts</div>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-700">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-800 mb-2">⚠️ Points à améliorer</div>
                  <ul className="space-y-1">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-red-700">• {w}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">💡 Recommandations</div>
                  <ul className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-blue-700">• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gold-soft p-6">
            <h2 className="text-xl font-semibold text-ink mb-6">Historique des analyses (30 jours)</h2>
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="p-4 bg-gold-soft/20 rounded-lg border border-gold-soft">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-ink-soft">
                      {new Date(h.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-2xl font-bold text-ink">{h.score}/100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-ink-soft">Poids:</span>{' '}
                      <span className="font-medium">{h.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-ink-soft">Graisse:</span>{' '}
                      <span className="font-medium">{h.bodyFat}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}