'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Échec de la connexion')
      }

      // Read the original destination from the URL, default to home.
      const from = new URLSearchParams(window.location.search).get('from') || '/'
      router.replace(from.startsWith('/') ? from : '/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-onyx font-sans px-4">
      <div className="w-full max-w-sm bg-white rounded-lg border-2 border-gold p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-ink mb-1">🏋️ Coach <span className="text-crimson">IA</span></h1>
        <p className="text-sm text-ink-soft mb-6">Accès protégé</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent text-ink"
            />
          </div>

          {error && <div className="text-sm text-crimson font-medium">{error}</div>}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
