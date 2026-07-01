'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Workout {
  id: string
  name: string
  duration: number | null
  calories: number | null
  completedAt: string
  exercises?: { name: string }[]
}

interface ExerciseNote {
  id: string
  exerciseName: string | null
  note: string
  activeFrom: string | null
  activeUntil: string | null
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const [notes, setNotes] = useState<ExerciseNote[]>([])
  const [newExercise, setNewExercise] = useState('')
  const [newNoteText, setNewNoteText] = useState('')
  const [newActiveFrom, setNewActiveFrom] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    fetchWorkouts()
    fetchNotes()
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

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/exercise-notes')
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching exercise notes:', error)
    }
  }

  const addNote = async () => {
    if (!newNoteText.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/exercise-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName: newExercise || null,
          note: newNoteText.trim(),
          activeFrom: newActiveFrom || null,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      setNewExercise('')
      setNewNoteText('')
      setNewActiveFrom('')
      fetchNotes()
    } catch (error) {
      console.error('Error adding exercise note:', error)
      alert('Erreur lors de l\'ajout de la note')
    } finally {
      setSavingNote(false)
    }
  }

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    try {
      await fetch(`/api/exercise-notes/${id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Error deleting exercise note:', error)
      fetchNotes()
    }
  }

  const exerciseNames = [...new Set(workouts.flatMap((w) => (w.exercises ?? []).map((e) => e.name)))].sort()

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

        {/* Exercise Notes */}
        <div className="bg-white rounded-lg border border-gold-soft p-6 mb-8">
          <h2 className="text-xl font-semibold text-ink mb-1">Notes d&apos;exécution</h2>
          <p className="text-sm text-ink-soft mb-6">
            Précisions sur la façon dont tu exécutes réellement certains exercices (charge par bras,
            variante unilatérale, tempo délibéré...). Utilisées pour affiner les analyses morpho et vidéo.
          </p>

          {notes.length > 0 && (
            <div className="space-y-3 mb-6">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 bg-gold-soft/20 rounded-lg p-4">
                  <div>
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${
                        n.exerciseName ? 'bg-crimson text-white' : 'bg-gold text-onyx'
                      }`}
                    >
                      {n.exerciseName ?? 'Général'}
                    </span>
                    <p className="text-sm text-ink">{n.note}</p>
                    {(n.activeFrom || n.activeUntil) && (
                      <p className="text-xs text-ink-soft mt-1">
                        {n.activeFrom && `depuis le ${new Date(n.activeFrom).toLocaleDateString('fr-FR')}`}
                        {n.activeFrom && n.activeUntil && ' · '}
                        {n.activeUntil && `jusqu'au ${new Date(n.activeUntil).toLocaleDateString('fr-FR')}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="text-ink-soft hover:text-crimson text-sm shrink-0"
                    aria-label="Supprimer la note"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 border-t border-gold-soft pt-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Exercice concerné (laisser vide pour une note générale)
              </label>
              <input
                list="exercise-names"
                value={newExercise}
                onChange={(e) => setNewExercise(e.target.value)}
                placeholder="ex: Développé Militaire (Haltère)"
                className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent text-sm"
              />
              <datalist id="exercise-names">
                {exerciseNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Note</label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="ex: Charge donnée = poids total des deux bras (haltères), pas par bras."
                rows={2}
                className="w-full px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Active depuis le (optionnel)
              </label>
              <input
                type="date"
                value={newActiveFrom}
                onChange={(e) => setNewActiveFrom(e.target.value)}
                className="px-4 py-2 border border-gold-soft rounded-lg focus:ring-2 focus:ring-crimson focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={addNote}
              disabled={savingNote || !newNoteText.trim()}
              className="px-6 py-2 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {savingNote ? 'Ajout...' : 'Ajouter la note'}
            </button>
          </div>
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