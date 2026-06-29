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

interface Meal {
  id: string
  name: string
  type: string
  calories: number
  protein: number
  carbs: number
  fats: number
  time: string
}

export default function Dashboard() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch users (hardcoded for demo)
      const usersRes = await fetch('/api/users')
      const usersData = await usersRes.json()
      const userId = usersData[0]?.id

      if (!userId) {
        console.error('No users found')
        setLoading(false)
        return
      }

      // Fetch measurements
      const measurementsRes = await fetch(`/api/measurements?userId=${userId}`)
      const measurementsData = await measurementsRes.json()
      setMeasurements(measurementsData)

      // Fetch workouts
      const workoutsRes = await fetch(`/api/workouts?userId=${userId}`)
      const workoutsData = await workoutsRes.json()
      setWorkouts(workoutsData)

      // Fetch meals (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const mealsRes = await fetch(`/api/nutrition/meals?userId=${userId}&date=${sevenDaysAgo.toISOString().split('T')[0]}`)
      const mealsData = await mealsRes.json()
      setMeals(mealsData)
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
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0)
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0)

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
                {workouts[0].calories && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Calories:</span>
                    <span className="font-medium">{workouts[0].calories} kcal</span>
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
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nutrition (7 jours)</h3>
            {meals.length > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total calories:</span>
                  <span className="font-medium">{totalCalories} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total protéines:</span>
                  <span className="font-medium">{totalProtein.toFixed(1)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Moyenne/jour:</span>
                  <span className="font-medium">{(totalCalories / 7).toFixed(0)} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Repas:</span>
                  <span className="font-medium">{meals.length}</span>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">Aucun repas</div>
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
                  {workout.calories && <div>{workout.calories} kcal</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Meals */}
        <div className="bg-white rounded-lg border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-900 p-6 border-b border-zinc-200">
            Repas récents
          </h3>
          <div className="divide-y divide-zinc-200">
            {meals.slice(0, 10).map((meal) => (
              <div key={meal.id} className="p-6 flex justify-between items-center">
                <div>
                  <div className="font-medium text-zinc-900">{meal.name}</div>
                  <div className="text-sm text-zinc-500">
                    {meal.type} · {new Date(meal.time).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="text-right text-sm text-zinc-600">
                  <div>{meal.calories} kcal</div>
                  <div className="text-xs text-zinc-500">
                    P: {meal.protein}g · C: {meal.carbs}g · F: {meal.fats}g
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}