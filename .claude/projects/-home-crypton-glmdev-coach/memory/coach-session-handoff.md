---
name: coach-session-handoff
description: Where the Coach app stands and what's pending — resume point after the 2026-07-01 session
metadata:
  type: project
---

State as of 2026-07-01 (end of session). App is **live and working** on Vercel `main`. Workflow: **push directly to `main`** (no PRs), Vercel auto-deploys. See [[coach-product-vision]], [[coach-hevy-api-notes]], [[coach-journal-sante-integration]].

**Done and deployed (all on `main`):**
- Claude model id fixed to `claude-sonnet-4-6`; all AI analysis output forced to **French**.
- Dashboard shows the **real weigh-in**, not the AI photo estimate.
- **Hevy** integration rewritten against the real public API v1 (workouts + exercises + sets + `/body_measurements`), scoped to 30 days, self-healing re-sync.
- **Weekly morpho analysis**: page `/weekly` (3 photos face/profil/dos) → Vercel Blob → Claude `analyzeMorphology` (segments + last 30 Hevy workouts + 30d nutrition/energy) → advice → **Resend email**. Model `MorphoAnalysis` (+ migration). Auto-syncs Hevy + Journal Santé first (no button needed).
- **Video form analysis**: page `/video` (≤30s clip → 6 canvas keyframes → Claude `analyzeExerciseForm` → formScore + cues).
- **Journal Santé** = source of truth for weight/mensurations/nutrition. `/api/journal/sync` (per-field carry-forward, 30d), `/api/journal/energy` (daily calories/macros + estimated expenditure; individual meals NOT stored). Dashboard shows the energy view.
- Profile defaults (`lib/profile.ts`): height **174**, age auto from DOB **1981-04-28**.
- **Single-user cleanup**: `/api/me` = system user; dashboard + measurements read it (fixed the "fictif"/demo-user data); removed the multi-user selector + create-user from home.

**Env vars set on the coach Vercel project:** APP_PASSWORD, AUTH_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, HEVY_API_KEY, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY, COACH_EMAIL_TO, JOURNAL_SANTE_API_URL=`https://journal-sante-omega.vercel.app/api`. (COACH_EMAIL_FROM and JOURNAL_SANTE_SECRET optional/unused.)

**PENDING — start here next session:**
1. **UI theme (not started).** Owner wants: ALL text **black** (grey `text-zinc-400/500/600` is illegible in places) + prettier/more colorful, **dominant red / black / gold (or)**. Planned approach: theme centrally in `app/globals.css` (override grey text utilities to a dark ink; primary buttons `bg-zinc-900` → red; gold accents; black header) + light per-page touches. Pages: `/` , `/dashboard`, `/weekly`, `/video`, `/photos`, `/measurements`, `/workouts`, `/login`. I was about to read `app/globals.css` when the session ended.
2. **GSD reorg** for a clean git (owner's plan for next session).

Note: stray demo users may still exist in the DB but are now harmless (everything uses the system user via `/api/me`).
