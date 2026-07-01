# Phase 1: Goal & Progress Tracking UI - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 5 (1 schema change, 1 lib module, 1 API route, 1 new page, 1 modified page)
**Analogs found:** 5 / 5 (1 partial — charting has no in-repo analog since `recharts` is a new dependency)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `prisma/schema.prisma` (add `Goal` model) | model | CRUD | `ExerciseNote` model (single-user-scoped, optional window fields) | role-match |
| `lib/goals.ts` (new) | service/utility | transform (compute-on-read aggregation) | `lib/morpho.ts` `buildHevyContext()` (top-N exercises by frequency) + `lib/exercise-notes.ts` (query/filter helper style) | role-match |
| `app/api/goals/route.ts` (new) | route/controller | CRUD (GET compute+read, POST/PUT upsert) | `app/api/exercise-notes/route.ts` (simple CRUD) + `app/api/analysis/weekly/route.ts` (GET with computed/derived payload) | exact (combined) |
| `app/api/goals/[id]/route.ts` (optional, only if delete-goal affordance is added) | route/controller | CRUD (DELETE) | `app/api/exercise-notes/[id]/route.ts` | exact |
| `app/goals/page.tsx` (new) | component (page) | request-response (read-only summary + form) | `app/morpho/page.tsx` (read-only summary page, empty-state handling) + `app/dashboard/page.tsx` (client fetch-on-mount shape) | exact |
| `app/page.tsx` (modify — add card) | component (page fragment) | request-response (static nav link) | Existing `/morpho` card block in same file (`app/page.tsx:75-82`) | exact |

## Pattern Assignments

### `prisma/schema.prisma` — add `Goal` model (model, CRUD)

**Analog:** `ExerciseNote` model (`prisma/schema.prisma:232-250`) — closest existing model for "one row scoped to `userId`, optional nullable fields, no relation-heavy structure."

**Pattern to copy** (structure, not literal fields):
```prisma
model ExerciseNote {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])

  // Exact Exercise.name to attach to, or null for a general note (applies to all).
  exerciseName  String?
  note          String

  // Optional validity window (e.g. "since mid-May"); null = always active.
  activeFrom    DateTime?
  activeUntil   DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([exerciseName])
}
```

**Apply to `Goal`:**
- Same shape: `id`, `userId` + `user` relation, nullable target fields (`targetWeight Float?`, `targetBodyFat Float?`, `targetDate DateTime?`), `createdAt`/`updatedAt`.
- Per CONTEXT.md D-02 (single active goal, no version history) and ARCHITECTURE.md's compute-on-read convention: **store ONLY the target definition** — no computed/cached progress fields (no `currentWeight`, no `percentComplete`). Progress is always derived at request time from `Measurement`/`Workout`/`ExerciseSet` inside `lib/goals.ts`.
- Add `goals Goal[]` (or a single optional relation if enforcing one row) to the `User` model's relation block (`prisma/schema.prisma:14-29`), matching how `exerciseNotes ExerciseNote[]` was added there.
- Add `@@index([userId])` — every other user-scoped model does this.
- Generate the migration the same way the most recent one was: `npx prisma migrate dev --name add_goal` (mirrors `20260701134917_add_exercise_notes` — dated, one folder per schema change, committed).
- Single-active-goal (D-02): do not add a uniqueness constraint that hard-blocks multiple rows — follow the exact same convention already established for the one-user system (`getOrCreateSystemUserId`'s `upsert`): `lib/goals.ts` should read via `prisma.goal.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })` ("most recent" = "current"), and the POST/PUT handler should `upsert`/replace rather than blindly `create` more rows. This matches D-02's decision to keep it simple without a DB-level constraint.

---

### `lib/goals.ts` (new) — service/utility, transform (compute-on-read aggregation)

**Analog 1:** `lib/morpho.ts` `buildHevyContext()` (lines 39-93) — the exact aggregation logic named in CONTEXT.md D-03 to reuse/adapt.

**Core aggregation pattern to copy** (top-N exercises by session frequency):
```typescript
// lib/morpho.ts:39-63
async function buildHevyContext(userId: string): Promise<string> {
  // The last 30 workouts (most recent first).
  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    take: 30,
    include: { exercises: { include: { sets: true } } },
  })

  // Aggregate the heaviest working set per exercise name.
  const best = new Map<string, { weight: number; reps: number; count: number }>()
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const cur = best.get(ex.name) ?? { weight: 0, reps: 0, count: 0 }
      cur.count += 1
      for (const s of ex.sets) {
        if (s.isWarmup) continue
        if (s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
          cur.weight = s.weight
          cur.reps = s.reps
        }
      }
      best.set(ex.name, cur)
    }
  }
  ...
```

**Sort-by-frequency, take top N pattern** (lines 71-73 — this is literally D-03's "top 5-8 by session count"):
```typescript
const lines = [...best.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 20)  // <- change to slice(0, 8) or configurable 5-8 for /goals
  .map(([name, s]) => { ... })
```

**Adapt for `/goals`:** instead of collapsing to a text summary line, build a per-exercise time series (each session's best working set weight/volume + date) so the page can chart it. Same `Map<string, {...}>` grouping approach, but accumulate an array of `{date, weight, volume}` per exercise name instead of a single running best. Sort exercise names by `sessions.length` descending, take top 5-8 (per D-03), resolve ties by most-recent-session (Claude's Discretion note in CONTEXT.md — compare `sessions[0].date` descending as the tiebreaker since `workouts` is already ordered `completedAt: 'desc'`).

**Analog 2:** `lib/exercise-notes.ts` — simple query/filter helper style (small pure functions, one Prisma query per exported function, JSDoc one-liners). Use this shape for smaller `lib/goals.ts` helpers, e.g.:
```typescript
// lib/exercise-notes.ts:4-16 pattern to mirror for e.g. getCurrentGoal()
export async function getActiveExerciseNotes(userId: string, now: Date = new Date()): Promise<ExerciseNote[]> {
  return prisma.exerciseNote.findMany({
    where: { userId, /* ... */ },
    orderBy: { createdAt: 'desc' },
  })
}
```
Apply this to `getCurrentGoal(userId)` → `prisma.goal.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })`.

**Smoothing helper (Claude's Discretion — 7-day rolling average per UI-SPEC.md):** no existing analog in the codebase (first time-series smoothing is needed). Write as a small pure function in `lib/goals.ts`, documented per CONVENTIONS.md's comment style ("explain why, not what" — e.g. `// 7-day rolling average smooths daily weigh-in noise per PITFALLS.md pitfall 5; raw points still rendered as secondary layer`).

**Naming convention to follow:** camelCase functions (`getCurrentGoal`, `getWeightTrend`, `getTopExercisesProgress`, `getProgressPhotoTimeline`), no class/singleton factory needed here (unlike `lib/hevy-sync.ts`'s `getXService()` pattern) since this is stateless read-only aggregation, closer to `lib/exercise-notes.ts`'s plain-function style than `lib/hevy-sync.ts`'s class-based service style.

---

### `app/api/goals/route.ts` (new) — route/controller, CRUD + compute-on-read

**Analog 1:** `app/api/exercise-notes/route.ts` (full file, 40 lines) — simple CRUD GET/POST shape for a user-scoped model.

**Full pattern to copy:**
```typescript
// app/api/exercise-notes/route.ts:1-39
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'

export async function GET() {
  try {
    const userId = await getOrCreateSystemUserId()
    const notes = await prisma.exerciseNote.findMany({
      where: { userId },
      orderBy: [{ exerciseName: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ notes })
  } catch (error) {
    console.error('[API] Error fetching exercise notes:', error)
    return NextResponse.json({ error: 'Impossible de récupérer les notes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getOrCreateSystemUserId()
    const body = await request.json()
    const note = typeof body.note === 'string' ? body.note.trim() : ''
    if (!note) {
      return NextResponse.json({ error: 'Le texte de la note est requis' }, { status: 400 })
    }
    // ... field extraction + validation ...
    const created = await prisma.exerciseNote.create({ data: { userId, /* ... */ } })
    return NextResponse.json({ note: created }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating exercise note:', error)
    return NextResponse.json({ error: 'Impossible de créer la note' }, { status: 500 })
  }
}
```

**Apply to `/api/goals`:**
- `GET`: call `getOrCreateSystemUserId()`, then `getCurrentGoal(userId)` from `lib/goals.ts`, then (if a goal exists) compute progress via the other `lib/goals.ts` helpers, and return one combined JSON payload (`{ goal, weightTrend, bodyFatTrend, exercises, photos }`). If no goal exists, follow `app/api/analysis/weekly/route.ts`'s `404` convention (see Analog 2 below) so `/goals` page can distinguish "no goal" from "fetch error" per UI-SPEC.md's Copywriting Contract requirement.
- `POST`/`PUT`: validate `targetWeight`/`targetBodyFat`/`targetDate` (at least one target required), then `prisma.goal.create(...)` (POST, first goal) or update the existing row (PUT, matches D-02 "editable/replaceable at any time"). Use the same guard-clause style: `if (!targetWeight && !targetBodyFat) return NextResponse.json({ error: '...' }, { status: 400 })`.
- Error status codes: `400` invalid input, `500` unexpected — no `401` needed here (proxy.ts already gates all routes), follow CONVENTIONS.md's documented code table.

**Analog 2:** `app/api/analysis/weekly/route.ts` `GET` handler (lines 50-71) — the `404` vs `500` distinction pattern needed because UI-SPEC.md explicitly requires `/goals` to NOT conflate "no goal set" (expected empty state) with "fetch failed" (error state), unlike `/morpho`'s existing conflation:
```typescript
// app/api/analysis/weekly/route.ts:58-70
try {
  const result = await getLatestMorphoAnalysis()
  if (!result) {
    return NextResponse.json({ error: 'Aucune analyse morpho trouvée' }, { status: 404 })
  }
  return NextResponse.json(result)
} catch (error) {
  console.error('[API] Latest morpho analysis error:', error)
  return NextResponse.json(
    { error: 'Impossible de récupérer la dernière analyse', details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  )
}
```
Reuse the `404` (no goal, `result === null`) vs `500` (caught exception) split exactly like this — the client page then must branch on `res.status === 404` (empty state) vs `!res.ok` (error state) as two distinct UI states, per UI-SPEC.md's Copywriting Contract (this is the one place `/goals` must diverge from `/morpho`'s implementation, which collapses both into a single `notFound` boolean — see `app/morpho/page.tsx:36-44`).

**If a delete-goal affordance is added:** `app/api/goals/[id]/route.ts` — copy `app/api/exercise-notes/[id]/route.ts` verbatim in structure:
```typescript
// app/api/exercise-notes/[id]/route.ts (full file)
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getOrCreateSystemUserId } from '@/lib/system-user'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await getOrCreateSystemUserId()
    await prisma.exerciseNote.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting exercise note:', error)
    return NextResponse.json({ error: 'Impossible de supprimer la note' }, { status: 500 })
  }
}
```
Note the Next 16 async `params` pattern (`Promise<{ id: string }>`, must `await params`) — mandatory per AGENTS.md's breaking-change warning.

---

### `app/goals/page.tsx` (new) — component (page), request-response

**Analog 1:** `app/morpho/page.tsx` (full file) — closest "read-only summary page fetching from one GET endpoint" pattern, explicitly named in CONTEXT.md.

**Imports + fetch-on-mount pattern** (lines 1-50):
```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LatestMorphoAnalysis { /* local interface, no shared types dir */ }

export default function MorphoPage() {
  const [data, setData] = useState<LatestMorphoAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/analysis/weekly?action=latest')
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setData(await res.json())
      } catch (error) {
        console.error('Error fetching latest morpho analysis:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])
  ...
```
**Adapt for `/goals`:** per UI-SPEC.md's explicit requirement, split `notFound` (404 = no goal, benign) from a separate `error` state (network/500 failure) — do NOT collapse both into `notFound` like `/morpho` does. Add a third state: `const [error, setError] = useState(false)`, set it in the `catch` and on non-404 `!res.ok`, and render UI-SPEC.md's distinct copy ("Impossible de charger tes objectifs..." + "Réessayer" retry button) for that branch, vs. the empty-state copy ("Aucun objectif défini pour l'instant." + CTA) for `notFound`.

**Page chrome / header pattern** (lines 60-66) — copy verbatim structure per UI-SPEC.md's own instruction ("copy exact structure from `app/morpho/page.tsx:61-66`"):
```typescript
<div className="min-h-screen font-sans">
  <header className="bg-onyx border-b-2 border-gold">
    <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-white">Dernière analyse morpho</h1>
      <Link href="/" className="text-white/70 hover:text-gold underline">Accueil</Link>
    </div>
  </header>
  <main className="max-w-5xl mx-auto px-4 py-8">
```
Replace `<h1>` text with "Objectifs" (or similar) and keep everything else identical.

**Empty-state pattern** (lines 71-82) — reuse verbatim structure, swap copy for UI-SPEC.md's specified strings:
```typescript
{!loading && notFound && (
  <div className="bg-white border border-gold-soft rounded-lg p-8 text-center">
    <div className="text-4xl mb-4">🗓️</div>
    <p className="text-ink mb-4">Aucune analyse morpho n&apos;a encore été réalisée.</p>
    <Link href="/weekly" className="inline-block px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition font-medium">
      Lancer l&apos;analyse hebdo
    </Link>
  </div>
)}
```
Swap emoji → 🎯, copy → "Aucun objectif défini pour l'instant." / "Définis un poids cible..." + "Définir un objectif" CTA (exact strings from UI-SPEC.md's Copywriting Contract). Add the new distinct error-state block alongside this (not present in `/morpho`, see note above).

**Card/section structure pattern** (lines 84-168) — summary header card (`border-2 border-gold`), then a sequence of `bg-white border border-gold-soft rounded-lg p-6` cards each with a `text-xl font-semibold text-ink mb-4` heading — this maps directly onto UI-SPEC.md's prescribed page order: goal summary card → weight/body-fat trend chart cards → strength/volume chart-grid cards → photo timeline. The `grid grid-cols-1 md:grid-cols-2 gap-4` segment-list pattern (lines 126-138) is the direct analog for the strength/volume per-exercise chart-card grid (GOAL-03).

**Photo grid pattern** (lines 109-123) — reuse verbatim for GOAL-04's timeline (repeated per date group, per UI-SPEC.md):
```typescript
{data.photoUrls.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {ANGLE_ORDER.filter((a) => photosByAngle.has(a)).map((angle) => (
      <div key={angle} className="bg-white border border-gold-soft rounded-lg p-4">
        <div className="font-semibold text-ink mb-2">{ANGLE_LABELS[angle] ?? angle}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photosByAngle.get(angle)} alt={ANGLE_LABELS[angle] ?? angle} className="w-full h-64 object-cover rounded" />
      </div>
    ))}
  </div>
)}
```

**Analog 2:** `app/dashboard/page.tsx` (lines 1-60+) — alternate client-fetch-shape reference named in CONTEXT.md (`fetchData` named function called from `useEffect`, local interfaces per component, no shared types). Note the ESLint gotcha already tracked in CONVENTIONS.md: declare `fetchGoals`/`fetchData` as a hoisted `function` declaration (not `const fn = async () => {}` referenced before declaration) to avoid adding a new `react-hooks` "used before declared" lint error to the existing debt list.

**Charting (GOAL-02/03, `recharts`)** — no in-repo analog exists; `recharts` is a brand-new dependency (confirmed absent from `package.json`). Follow UI-SPEC.md's Phase 1 Visual Notes section directly (already fully specified: `<ResponsiveContainer>` + `<LineChart>`, crimson smoothed line `strokeWidth={2.5}`, low-opacity `stroke-ink-soft/40` raw-point layer, dashed gold `<ReferenceLine>` for target value, no target-date line). Treat UI-SPEC.md as the authoritative pattern source for this piece since no codebase precedent exists.

---

### `app/page.tsx` (modify — add `/goals` card)

**Analog:** the existing `/morpho` card in the same file (`app/page.tsx:75-82`), which is itself the most recently added card (mirrors UI-SPEC.md's own instruction to copy this block).

**Exact pattern to copy:**
```typescript
// app/page.tsx:75-82
<Link
  href="/morpho"
  className="bg-white p-6 rounded-lg border border-gold-soft hover:border-crimson transition cursor-pointer"
>
  <div className="text-3xl mb-3">🧬</div>
  <h3 className="text-lg font-semibold text-ink mb-2">Dernière analyse morpho</h3>
  <p className="text-sm text-ink-soft">Résumé visuel de ta dernière analyse hebdo</p>
</Link>
```
**Apply:** insert an identical `<Link>` block into the same grid (`app/page.tsx:38` `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`) with `href="/goals"`, emoji `🎯`, title "Objectifs", subtitle "Suivi visuel de tes objectifs poids/masse grasse" — exact strings specified in UI-SPEC.md's Page Chrome section. Note: card-level `<h3>` here uses `text-lg` (18px), which UI-SPEC.md explicitly calls out as the pre-existing convention on `app/page.tsx` (not to be "fixed" to `text-xl` — that 20px rule only applies inside `/goals` itself, not to this home-page card).

---

## Shared Patterns

### Auth / User Scoping
**Source:** `lib/system-user.ts` (full file, `getOrCreateSystemUserId()`)
**Apply to:** `lib/goals.ts` and `app/api/goals/route.ts` — every query must be scoped `where: { userId }` using this single-user placeholder, exactly as `app/api/exercise-notes/route.ts` and `lib/morpho.ts` already do. No new auth pattern needed; `proxy.ts` already gates all app routes at the session-cookie level.

### Error Handling
**Source:** CONVENTIONS.md's documented shape, exemplified in `app/api/exercise-notes/route.ts` and `app/api/analysis/weekly/route.ts`
**Apply to:** `app/api/goals/route.ts` (and `[id]/route.ts` if added) — wrap every handler body in `try/catch`, log via `console.error('[API] <Context>:', error)`, respond `NextResponse.json({ error: '<French user-facing message>' }, { status })` (add `details: error instanceof Error ? error.message : 'Unknown error'` for mutation endpoints per the documented convention). Status codes: `400` invalid input, `404` "no goal exists" (GET only, see analog 2 above), `500` unexpected.

### Empty-State vs. Error-State Distinction (new precedent for this phase)
**Source:** UI-SPEC.md's Copywriting Contract, contrasted against `app/morpho/page.tsx`'s existing conflated `notFound` flag
**Apply to:** `app/goals/page.tsx` only — this is the one place this phase must NOT copy `/morpho`'s pattern verbatim; introduce a second `error` boolean/state distinct from `notFound`, per UI-SPEC.md lines 89.

### Compute-on-Read (never cache derived values)
**Source:** ARCHITECTURE.md convention, exemplified by `lib/morpho.ts`'s `buildHevyContext()` recomputing every call (no cached aggregate table)
**Apply to:** `lib/goals.ts` — `Goal` row stores only target definition fields; every progress/percent-complete/trend value is computed fresh from `Measurement`/`Workout`/`ExerciseSet`/`ProgressPhoto` on each `GET /api/goals` call.

### No Shared Types Directory
**Source:** CONVENTIONS.md, exemplified by `Workout` being independently redeclared in `app/dashboard/page.tsx` and `app/workouts/page.tsx`
**Apply to:** `app/goals/page.tsx` — declare local interfaces for the `/api/goals` response shape in the page file itself; do not create a `types/` module.

### Import Order & Path Aliases
**Source:** CONVENTIONS.md, exemplified in every file read above
**Apply to:** all new files — `'use client'` first (client components), then React/Next core imports, then `@/lib/*` / `@/*` absolute imports (never relative `./`/`../`). Prefer named `{ prisma }` import in new `lib/goals.ts` (per CONVENTIONS.md's stated preference), though existing files are inconsistent (`app/api/measurements/route.ts` uses named `{ prisma }`, `app/api/exercise-notes/route.ts` uses default `prisma`).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Charting layer inside `app/goals/page.tsx` (recharts `<LineChart>`/`<ReferenceLine>`/scatter layers) | component (chart) | transform/render | `recharts` is a brand new dependency (absent from `package.json`) — no chart component exists anywhere in the current codebase to copy from. Planner must follow UI-SPEC.md's "Phase 1 Visual Notes" section directly as the pattern source instead of a codebase analog. |
| 7-day rolling average / smoothing function in `lib/goals.ts` | utility | transform | No time-series smoothing exists anywhere in `lib/` today (closest neighbors, `startOfIsoWeek`/`weekKey` in `lib/morpho.ts`, are calendar helpers, not numeric smoothing). Write fresh per CONTEXT.md's "Claude's Discretion" note; document the chosen method (7-day rolling average) in a code comment per CONVENTIONS.md's "explain why" comment style. |
| Chronological `ProgressPhoto` timeline query (grouped by week/date) | service/utility | CRUD (read, grouped) | Existing `ProgressPhoto` usage in `lib/morpho.ts` only ever fetches by `id: { in: [...] }` (`lib/morpho.ts:260`) for a single week's 3 photos — no existing "list all photos chronologically, grouped by date" query exists. Closest structural analog for the query itself is `prisma.exerciseNote.findMany({ where: { userId }, orderBy: ... })` in `app/api/exercise-notes/route.ts`; apply the same `findMany` + `orderBy: { createdAt: 'desc' }` shape, then group client-side or in `lib/goals.ts`. |

## Metadata

**Analog search scope:** `app/`, `app/api/**/route.ts`, `lib/*.ts`, `prisma/schema.prisma`, `.planning/codebase/*.md`
**Files scanned:** `app/morpho/page.tsx`, `app/dashboard/page.tsx`, `app/photos/page.tsx`, `app/page.tsx`, `app/api/analysis/weekly/route.ts`, `app/api/exercise-notes/route.ts`, `app/api/exercise-notes/[id]/route.ts`, `app/api/measurements/route.ts`, `lib/morpho.ts`, `lib/exercise-notes.ts`, `lib/system-user.ts`, `prisma/schema.prisma`, `package.json` (recharts absence confirmed)
**Pattern extraction date:** 2026-07-01
