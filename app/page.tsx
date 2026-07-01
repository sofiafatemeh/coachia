'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data || [])
      if (data && data.length > 0) {
        setSelectedUser(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    const name = prompt('Nom:')
    if (!name) return

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: `${name.toLowerCase()}@example.com` })
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="text-zinc-600">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-900">🏋️ Coach AI</h1>
          <div className="flex items-center gap-3">
            {users.length > 0 && (
              <select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-4 py-2 border border-zinc-300 rounded-lg"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-600 hover:text-zinc-900 underline"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">
            Bienvenue sur Coach AI
          </h2>
          <p className="text-zinc-600 max-w-2xl mx-auto">
            Application de coaching fitness avec intelligence artificielle. 
            Synchronisez vos workouts Hevy, analysez vos photos, et suivez vos progrès.
          </p>
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 p-8 text-center">
            <p className="text-zinc-600 mb-4">Aucun utilisateur trouvé</p>
            <button
              onClick={createUser}
              className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition font-medium"
            >
              Créer un utilisateur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/dashboard"
              className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
            >
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Dashboard</h3>
              <p className="text-sm text-zinc-600">Vue d'ensemble de vos progrès</p>
            </Link>

            <Link
              href="/photos"
              className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
            >
              <div className="text-3xl mb-3">📸</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Analyse Photos</h3>
              <p className="text-sm text-zinc-600">Analyse IA de vos photos</p>
            </Link>

            <Link
              href="/weekly"
              className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
            >
              <div className="text-3xl mb-3">🗓️</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Analyse hebdo</h3>
              <p className="text-sm text-zinc-600">3 photos + conseils morpho par email</p>
            </Link>

            <Link
              href="/video"
              className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
            >
              <div className="text-3xl mb-3">🎥</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Analyse vidéo</h3>
              <p className="text-sm text-zinc-600">Exécution d&apos;un exercice (~30 s)</p>
            </Link>

            <Link
              href="/measurements"
              className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
            >
              <div className="text-3xl mb-3">📏</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Mesures</h3>
              <p className="text-sm text-zinc-600">Poids, graisse, masse musculaire</p>
            </Link>

            <Link
              href="/workouts"
              className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
            >
              <div className="text-3xl mb-3">💪</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Workouts</h3>
              <p className="text-sm text-zinc-600">Synchronisation Hevy & logs</p>
            </Link>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">🏋️ Hevy Sync</h3>
            <p className="text-sm text-zinc-600 mb-4">Synchronisez vos workouts depuis l'app Hevy</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/hevy/workouts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'syncWorkouts', days: 30 })
                  })
                  const data = await res.json()
                  alert(`✅ Sync: ${data.synced}/${data.total} workouts`)
                } catch (error) {
                  alert('❌ Erreur de sync')
                }
              }}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition text-sm"
            >
              Synchroniser
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">🍽️ Journal Nutrition</h3>
            <p className="text-sm text-zinc-600 mb-4">Résumé nutritionnel quotidien</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/nutrition/meals')
                  const data = await res.json()
                  alert(`📅 ${data.date}\n🏋️ ${data.workouts} séances\n⚖️ Poids: ${data.measurements?.weight || 'N/A'} kg`)
                } catch (error) {
                  alert('❌ Erreur')
                }
              }}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition text-sm"
            >
              Voir résumé
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">📈 Progression</h3>
            <p className="text-sm text-zinc-600 mb-4">Analyse de progression sur 30 jours</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/analysis/photos?action=progress&days=30')
                  const data = await res.json()
                  alert(`📊 Score actuel: ${data.currentScore}/100\n🎯 Objectif: ${data.targetScore}/100\n✅ Amélioration: ${data.improvement || 0}%`)
                } catch (error) {
                  alert('❌ Erreur')
                }
              }}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition text-sm"
            >
              Voir progression
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}