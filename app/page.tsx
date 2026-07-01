'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-zinc-900">🏋️ Coach AI</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-600 hover:text-zinc-900 underline"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Bienvenue sur Coach AI</h2>
          <p className="text-zinc-600 max-w-2xl mx-auto">
            Application de coaching fitness avec intelligence artificielle.
            Synchronisez vos workouts Hevy, analysez vos photos, et suivez vos progrès.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard"
            className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Dashboard</h3>
            <p className="text-sm text-zinc-600">Vue d&apos;ensemble de vos progrès</p>
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
            <p className="text-sm text-zinc-600">Poids, mensurations, énergie</p>
          </Link>

          <Link
            href="/workouts"
            className="bg-white p-6 rounded-lg border border-zinc-200 hover:border-zinc-400 transition cursor-pointer"
          >
            <div className="text-3xl mb-3">💪</div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Workouts</h3>
            <p className="text-sm text-zinc-600">Synchronisation Hevy &amp; logs</p>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">🏋️ Hevy Sync</h3>
            <p className="text-sm text-zinc-600 mb-4">Synchroniser les workouts (30 derniers jours)</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/hevy/workouts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'syncWorkouts', days: 30 }),
                  })
                  const data = await res.json()
                  alert(`✅ Sync: ${data.synced}/${data.total} workouts`)
                } catch {
                  alert('❌ Erreur de sync')
                }
              }}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition text-sm"
            >
              Synchroniser
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">🩺 Journal Santé</h3>
            <p className="text-sm text-zinc-600 mb-4">Importer poids &amp; mensurations (30 derniers jours)</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/journal/sync', { method: 'POST' })
                  const data = await res.json()
                  if (!res.ok || !data.success) throw new Error(data.details || data.error || 'Erreur')
                  alert(`✅ ${data.message}`)
                } catch (error) {
                  alert(`❌ ${error instanceof Error ? error.message : 'Erreur de sync'}`)
                }
              }}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition text-sm"
            >
              Synchroniser
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
