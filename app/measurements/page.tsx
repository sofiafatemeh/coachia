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
      const usersRes = await fetch('/api/users')
      const usersData = await usersRes.json()
      const userId = usersData[0]?.id

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
    const usersRes = await fetch('/api/users')
    const usersData = await usersRes.json()
    const userId = usersData[0]?.id

    if (!userId) {
      alert('Créez d\'abord un utilisateur')
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
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-900">📏 Mesures</h1>
          <Link href="/" className="text-zinc-600 hover:text-zinc-900 underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Ajouter une mesure</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Poids (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Graisse corporelle (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bodyFat}
                  onChange={(e) => setFormData({ ...formData, bodyFat: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Masse musculaire (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.muscleMass}
                  onChange={(e) => setFormData({ ...formData, muscleMass: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  IMC
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.bmi}
                  onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition font-medium"
              >
                Ajouter
              </button>
            </form>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-6">Historique</h2>
            {measurements.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aucune mesure enregistrée</p>
            ) : (
              <div className="space-y-4">
                {measurements.map((m) => (
                  <div key={m.id} className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-zinc-500">
                        {new Date(m.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-2xl font-bold text-zinc-900">{m.weight} kg</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {m.bodyFat && (
                        <div>
                          <span className="text-zinc-600">Graisse:</span>{' '}
                          <span className="font-medium">{m.bodyFat}%</span>
                        </div>
                      )}
                      {m.muscleMass && (
                        <div>
                          <span className="text-zinc-600">Muscle:</span>{' '}
                          <span className="font-medium">{m.muscleMass} kg</span>
                        </div>
                      )}
                      {m.bmi && (
                        <div>
                          <span className="text-zinc-600">IMC:</span>{' '}
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