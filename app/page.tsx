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
    <div className="min-h-screen font-sans">
      <header className="bg-onyx border-b-2 border-gold">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">🏋️ Coach <span className="text-gold">AI</span></h1>
          <button
            onClick={handleLogout}
            className="text-sm text-white/70 hover:text-gold underline"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-4">Bienvenue sur Coach AI</h2>
          <p className="text-ink-soft max-w-2xl mx-auto">
            Application de coaching fitness avec intelligence artificielle.
            Synchronisez vos workouts Hevy, analysez vos photos, et suivez vos progrès.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Dashboard</h3>
            <p className="text-sm text-ink-soft">Vue d&apos;ensemble de vos progrès</p>
          </Link>

          <Link
            href="/photos"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">📸</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Analyse Photos</h3>
            <p className="text-sm text-ink-soft">Analyse IA de vos photos</p>
          </Link>

          <Link
            href="/weekly"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">🗓️</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Analyse hebdo</h3>
            <p className="text-sm text-ink-soft">3 photos + conseils morpho par email</p>
          </Link>

          <Link
            href="/video"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">🎥</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Analyse vidéo</h3>
            <p className="text-sm text-ink-soft">Exécution d&apos;un exercice (~30 s)</p>
          </Link>

          <Link
            href="/morpho"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">🧬</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Dernière analyse morpho</h3>
            <p className="text-sm text-ink-soft">Résumé visuel de ta dernière analyse hebdo</p>
          </Link>

          <Link
            href="/measurements"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">📏</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Mesures</h3>
            <p className="text-sm text-ink-soft">Poids, mensurations, énergie</p>
          </Link>

          <Link
            href="/workouts"
            className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
          >
            <div className="text-3xl mb-3">💪</div>
            <h3 className="text-lg font-semibold text-ink mb-2">Workouts</h3>
            <p className="text-sm text-ink-soft">Synchronisation Hevy &amp; logs</p>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gold-soft">
            <h3 className="text-lg font-semibold text-ink mb-2">🏋️ Hevy Sync</h3>
            <p className="text-sm text-ink-soft mb-4">Synchroniser les workouts (30 derniers jours)</p>
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
              className="w-full px-4 py-2 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition text-sm"
            >
              Synchroniser
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gold-soft">
            <h3 className="text-lg font-semibold text-ink mb-2">🩺 Journal Santé</h3>
            <p className="text-sm text-ink-soft mb-4">Importer poids &amp; mensurations (30 derniers jours)</p>
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
              className="w-full px-4 py-2 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition text-sm"
            >
              Synchroniser
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
