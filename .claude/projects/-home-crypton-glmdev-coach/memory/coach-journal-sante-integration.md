---
name: coach-journal-sante-integration
description: Journal Santé is the source of truth for the Coach app's weight, mensurations and nutrition — API contract and coach-side sync
metadata:
  type: reference
---

The owner runs a separate **Journal Santé** app (private repo `github.com/sofiafatemeh/journal-sante`, Next.js + Neon) where they log weight, body measurements and nutrition. It is the **source of truth** for those into the Coach app. See [[coach-product-vision]].

**Journal Santé API (read endpoints, public — the `/api/gpt/*` variants add a `Authorization: Bearer <GPT_ACTION_SECRET>` check):**
- `GET /api/measurements` → `{ measurements: [{ id, measuredAt, weightKg, waistCm?, thighCm?, neckCm?, bicepsCm?, notes? }] }`
- `GET /api/meals` → `{ meals: [{ id, eatenAt, label, calories, protein, carbs, fat, fiber, notes? }] }`
- also `/api/activity`, `/api/supplements`, `/api/summary/today`.

**Coach-side config (Vercel env):**
- `JOURNAL_SANTE_API_URL` — base URL **including `/api`**, e.g. `https://<journal-domain>/api`. The client (`lib/journal-sante.ts`) defaults to `http://localhost:3000/api` if unset.
- `JOURNAL_SANTE_SECRET` — optional; sent as `Authorization: Bearer` (only needed if the Journal Santé side enforces it).

**Coach-side sync (`lib/journal-sync.ts`, `POST /api/journal/sync`, home "Journal Santé" button):**
- Measurements → coach `Measurement` rows (real weigh-ins, `claudeData` null). **Per-field carry-forward**: a new entry missing a field inherits the last known value. Idempotent by Journal Santé id stored in `bodyScoreId`; circumferences kept in `bodyScoreData` (used by the morpho analysis via `buildHevyContext`).
- Nutrition: individual meals are NOT stored (owner doesn't care about meals). Instead `dailyEnergySummary(days)` aggregates daily calories + macros + estimated expenditure (active calories from `/api/activity`) on the fly; exposed via `GET /api/journal/energy`. (`syncMeals` still exists but is unused by `syncAll`.)
- **Scope = last 30 days** everywhere (Hevy workouts + body measurements, Journal Santé measurement writes with carry-forward seeded from full history, energy summary).
- **Sync is automatic, no button**: the weekly analysis (`runWeeklyAnalysis`) auto-syncs Hevy + Journal Santé (best-effort) at the start, then feeds the last 30 workouts + 30 days of nutrition/energy into the morpho prompt. The home "Journal Santé" button remains as an optional manual trigger.
