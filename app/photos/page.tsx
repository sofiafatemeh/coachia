'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  const [height, setHeight] = useState('')
  const [gender, setGender] = useState('male')
  const [age, setAge] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Limit file size to 2MB
      if (file.size > 2 * 1024 * 1024) {
        alert('Image trop grande. Max 2MB. Réduis la taille ou utilise une URL.')
        return
      }
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setImageUrl('')
    }
  }

  const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Scale down if too large
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context error'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          // Compress to JPEG with 0.7 quality
          const compressed = canvas.toDataURL('image/jpeg', 0.7)
          const base64 = compressed.split(',')[1]
          resolve(base64)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  const analyzePhoto = async () => {
    if (!imageUrl && !imageFile) {
      alert('Sélectionnez une photo ou entrez une URL')
      return
    }

    setAnalyzing(true)
    setResult(null)

    try {
      console.log('Début analyse...')
      const payload: any = {
        height: height ? parseInt(height) : undefined,
        gender,
        age: age ? parseInt(age) : undefined
      }

      if (imageFile) {
        // Compress image before sending
        console.log('Compression image...')
        const base64 = await compressImage(imageFile)
        console.log('Image compressée:', (base64.length * 0.75 / 1024 / 1024).toFixed(2), 'MB')
        payload.imageBase64 = base64
      } else {
        payload.imageUrl = imageUrl
      }

      console.log('Envoi à l\'API...')
      const res = await fetch('/api/analysis/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || errorData.details || `HTTP ${res.status}`)
      }

      console.log('Réponse reçue...')
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        fetchHistory()
      } else {
        alert(`Erreur: ${data.error || 'Analyse échouée'}`)
      }
    } catch (error) {
      console.error('Error analyzing photo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur: ${errorMessage}`)
    } finally {
      setAnalyzing(false)
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
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-900">📸 Analyse Photos</h1>
          <Link href="/" className="text-zinc-600 hover:text-zinc-900 underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Analyser une photo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  📷 Photo
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
                  />
                  <div className="text-center text-zinc-500 text-sm">ou</div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value)
                      setImageFile(null)
                      setPreviewUrl(null)
                    }}
                    placeholder="https://exemple.com/photo.jpg"
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  />
                </div>
                {previewUrl && (
                  <div className="mt-4">
                    <div className="text-sm text-zinc-600 mb-2">Preview:</div>
                    <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-zinc-200" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="180"
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Genre
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Âge
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="30"
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={analyzePhoto}
                disabled={analyzing || (!imageUrl && !imageFile)}
                className="w-full px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyse en cours...
                  </span>
                ) : '🔍 Analyser'}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <h2 className="text-xl font-semibold text-zinc-900 mb-6">Résultats</h2>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 rounded-lg">
                  <div className="text-sm text-zinc-600 mb-1">Score global</div>
                  <div className="text-4xl font-bold text-zinc-900">{result.score}/100</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-lg">
                    <div className="text-sm text-zinc-600 mb-1">Poids estimé</div>
                    <div className="text-2xl font-bold text-zinc-900">{result.weight} kg</div>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-lg">
                    <div className="text-sm text-zinc-600 mb-1">Graisse corporelle</div>
                    <div className="text-2xl font-bold text-zinc-900">{result.bodyFat}%</div>
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
          <div className="mt-8 bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Historique des analyses (30 jours)</h2>
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-zinc-500">
                      {new Date(h.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="text-2xl font-bold text-zinc-900">{h.score}/100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-600">Poids:</span>{' '}
                      <span className="font-medium">{h.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">Graisse:</span>{' '}
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