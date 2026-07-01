'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    weight: '',
    bodyFat: '',
    muscleMass: '',
    bmi: ''
  })

  useEffect(() => {
    fetchMeasurements()
  }, [])

  const fetchMeasurements = async () => {
    try {
      const meRes = await fetch('/api/me')
      const me = await meRes.json()
      const userId = me?.id

      if (!userId) {
        setLoading(false)
        return
      }

      const res = await fetch(`/api/measurements?userId=${userId}`)
      const data = await res.json()
      setMeasurements(data || [])
    } catch (error) {
      console.error('Error fetching measurements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const meRes = await fetch('/api/me')
    const me = await meRes.json()
    const userId = me?.id

    if (!userId) {
      alert('Utilisateur système introuvable')
      return
    }

    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weight: parseFloat(formData.weight),
          bodyFat: formData.bodyFat ? parseFloat(formData.bodyFat) : null,
          muscleMass: formData.muscleMass ? parseFloat(formData.muscleMass) : null,
          bmi: formData.bmi ? parseFloat(formData.bmi) : null
        })
      })

      if (res.ok) {
        setFormData({ weight: '', bodyFat: '', muscleMass: '', bmi: '' })
        fetchMeasurements()
      } else {
        alert('Erreur lors de l\'ajout')
      }
    } catch (error) {
      console.error('Error adding measurement:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>
  }

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-onyx border-b-2 border-gold">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">📏 Mesures</h1>
          <Link href="/" className="text-white/70 hover:text-gold underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg border border-gold-soft p-6">
            <h2 className="text-xl font-semibold text-ink mb-6">Ajouter une mesure</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Poids (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Graisse corporelle (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bodyFat}
                  onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Masse musculaire (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.muscleMass}
                  onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  IMC
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bmi}
                  onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                  className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium"
              >
                Ajouter
              </button>
            </form>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg border border-gold-soft p-6">
            <h2 className="text-xl font-semibold text-ink mb-6">Historique</h2>
            {measurements.length === 0 ? (
              <p className="text-ink-soft text-sm">Aucune mesure enregistrée</p>
            ) : (
              <div className="space-y-4">
                {measurements.map((m) => (
                  <div key={m.id} className="p-4 bg-gold-soft/20 rounded-lg border border-gold-soft">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-ink-soft">
                        {new Date(m.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-2xl font-bold text-ink">{m.weight} kg</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {m.bodyFat && (
                        <div>
                          <span className="text-ink-soft">Graisse:</span>{' '}
                          <span className="font-medium">{m.bodyFat}%</span>
                        </div>
                      )}
                      {m.muscleMass && (
                        <div>
                          <span className="text-ink-soft">Muscle:</span>{' '}
                          <span className="font-medium">{m.muscleMass} kg</span>
                        </div>
                      )}
                      {m.bmi && (
                        <div>
                          <span className="text-ink-soft">IMC:</span>{' '}
                          <span className="font-medium">{m.bmi}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}