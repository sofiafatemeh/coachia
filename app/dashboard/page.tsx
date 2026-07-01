'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Measurement {
  id: string
  weight: number
  bodyFat: number | null
  muscleMass: number | null
  bmi: number | null
  createdAt: string
}

interface Workout {
  id: string
  name: string
  duration: number | null
  calories: number | null
  completedAt: string
}

interface DailyEnergy {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  activeCalories: number
}

export default function Dashboard() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [energy, setEnergy] = useState<DailyEnergy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Always the single system user (where all syncs/analyses write).
      const meRes = await fetch('/api/me')
      const me = await meRes.json()
      const userId = me?.id

      if (!userId) {
        console.error('No system user')
        setLoading(false)
        return
      }

      const measurementsRes = await fetch(`/api/measurements?userId=${userId}`)
      const measurementsData = await measurementsRes.json()
      setMeasurements(Array.isArray(measurementsData) ? measurementsData : [])

      const workoutsRes = await fetch(`/api/workouts?userId=${userId}`)
      const workoutsData = await workoutsRes.json()
      setWorkouts(Array.isArray(workoutsData) ? workoutsData : [])

      // Daily calories + macros + estimated expenditure from Journal Santé.
      try {
        const energyRes = await fetch('/api/journal/energy?days=30')
        const energyData = await energyRes.json()
        setEnergy(Array.isArray(energyData.days) ? energyData.days : [])
      } catch {
        setEnergy([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="text-zinc-600">Chargement...</div>
      </div>
    )
  }

  const latestMeasurement = measurements[0]
  const today = energy[0]
  const window = energy.slice(0, 7)
  const avg = (sel: (d: DailyEnergy) => number) =>
    window.length ? Math.round(window.reduce((s, d) => s + sel(d), 0) / window.length) : 0
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-900">Coach AI</h1>
          <Link href="/" className="text-zinc-600 hover:text-zinc-900 underline">
            Accueil
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-zinc-900 mb-8">Dashboard</h2>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Composition Corporelle</h3>
            {latestMeasurement ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Poids:</span>
                  <span className="font-medium">{latestMeasurement.weight} kg</span>
                </div>
                {latestMeasurement.bodyFat && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Graisse:</span>
                    <span className="font-medium">{latestMeasurement.bodyFat}%</span>
                  </div>
                )}
                {latestMeasurement.muscleMass && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Masse musculaire:</span>
                    <span className="font-medium">{latestMeasurement.muscleMass} kg</span>
                  </div>
                )}
                {latestMeasurement.bmi && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">IMC:</span>
                    <span className="font-medium">{latestMeasurement.bmi}</span>
                  </div>
                )}
                <div className="text-xs text-zinc-500 mt-2">
                  {new Date(latestMeasurement.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">Aucune donnée</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Séances</h3>
            {workouts.length > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total séances:</span>
                  <span className="font-medium">{workouts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Dernière:</span>
                  <span className="font-medium">{workouts[0].name}</span>
                </div>
                {workouts[0].duration && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Durée:</span>
                    <span className="font-medium">{workouts[0].duration} min</span>
                  </div>
                )}
                <div className="text-xs text-zinc-500 mt-2">
                  {new Date(workouts[0].completedAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">Aucune séance</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Énergie du jour</h3>
            {today ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Calories ingérées:</span>
                  <span className="font-medium">{today.calories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Dépense active:</span>
                  <span className="font-medium">{today.activeCalories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Bilan net:</span>
                  <span className="font-medium">{today.calories - today.activeCalories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Macros (P/G/L):</span>
                  <span className="font-medium">{today.protein} / {today.carbs} / {today.fat} g</span>
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  {fmtDate(today.date)} · moy. 7j: {avg((d) => d.calories)} kcal ingérées, {avg((d) => d.activeCalories)} kcal dépensées
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">Aucune donnée nutrition</div>
            )}
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="bg-white rounded-lg border border-zinc-200 mb-8">
          <h3 className="text-lg font-semibold text-zinc-900 p-6 border-b border-zinc-200">
            Séances récentes
          </h3>
          <div className="divide-y divide-zinc-200">
            {workouts.map((workout) => (
              <div key={workout.id} className="p-6 flex justify-between items-center">
                <div>
                  <div className="font-medium text-zinc-900">{workout.name}</div>
                  <div className="text-sm text-zinc-500">
                    {new Date(workout.completedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="text-right text-sm text-zinc-600">
                  {workout.duration && <div>{workout.duration} min</div>}
                </div>
              </div>
            ))}
            {workouts.length === 0 && <div className="p-6 text-sm text-zinc-500">Aucune séance</div>}
          </div>
        </div>

        {/* Daily energy (30 days) */}
        <div className="bg-white rounded-lg border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-900 p-6 border-b border-zinc-200">
            Bilan énergétique (30 jours)
          </h3>
          {energy.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="text-left font-medium px-6 py-3">Jour</th>
                    <th className="text-right font-medium px-6 py-3">Ingérées</th>
                    <th className="text-right font-medium px-6 py-3">Dépense</th>
                    <th className="text-right font-medium px-6 py-3">Net</th>
                    <th className="text-right font-medium px-6 py-3">P / G / L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {energy.map((d) => (
                    <tr key={d.date}>
                      <td className="px-6 py-3 text-zinc-900">{fmtDate(d.date)}</td>
                      <td className="px-6 py-3 text-right">{d.calories} kcal</td>
                      <td className="px-6 py-3 text-right text-zinc-600">{d.activeCalories} kcal</td>
                      <td className="px-6 py-3 text-right font-medium">{d.calories - d.activeCalories}</td>
                      <td className="px-6 py-3 text-right text-zinc-600">{d.protein} / {d.carbs} / {d.fat} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-sm text-zinc-500">
              Aucune donnée nutrition. Vérifie que Journal Santé est bien connecté.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
