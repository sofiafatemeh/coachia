'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Workout {
  id: string
  name: string
  duration: number | null
  calories: number | null
  completedAt: string
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      const res = await fetch('/api/workouts')
      const data = await res.json()
      setWorkouts(data || [])
    } catch (error) {
      console.error('Error fetching workouts:', error)
    }
  }

  const syncHevy = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      const res = await fetch('/api/hevy/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'syncWorkouts', days: 30 })
      })

      const data = await res.json()
      setSyncResult(data)
      fetchWorkouts()
    } catch (error) {
      console.error('Error syncing Hevy:', error)
      setSyncResult({ success: false, error: 'Erreur de sync' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-onyx border-b-2 border-gold">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">💪 Workouts</h1>
          <Link href="/" className="text-white/70 hover:text-gold underline">Accueil</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hevy Sync */}
        <div className="bg-white rounded-lg border border-gold-soft p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-ink">Synchronisation Hevy</h2>
              <p className="text-sm text-ink-soft mt-1">
                Importez vos workouts depuis l'application Hevy
              </p>
            </div>
            <button
              onClick={syncHevy}
              disabled={syncing}
              className="px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Synchronisation...' : '🔄 Synchroniser'}
            </button>
          </div>
          {syncResult && (
            <div className={`p-4 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium text-ink mb-2">
                {syncResult.success ? '✅ Synchronisation réussie' : '❌ Erreur'}
              </div>
              {syncResult.success && (
                <div className="text-sm text-ink">
                  {syncResult.total} workouts au total, {syncResult.synced} synchronisés, {syncResult.errors} erreurs
                </div>
              )}
              {!syncResult.success && (
                <div className="text-sm text-red-700">
                  {syncResult.error || syncResult.details}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workouts List */}
        <div className="bg-white rounded-lg border border-gold-soft p-6">
          <h2 className="text-xl font-semibold text-ink mb-6">
            Séances ({workouts.length})
          </h2>
          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🏋️</div>
              <p className="text-ink-soft mb-4">Aucune séance enregistrée</p>
              <button
                onClick={syncHevy}
                className="px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium"
              >
                Synchroniser depuis Hevy
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div key={workout.id} className="p-4 bg-gold-soft/20 rounded-lg border border-gold-soft">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-ink">{workout.name}</div>
                      <div className="text-sm text-ink-soft">
                        {new Date(workout.completedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="text-right text-sm text-ink-soft">
                      {workout.duration && <div>{workout.duration} min</div>}
                      {workout.calories && <div>{workout.calories} kcal</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}