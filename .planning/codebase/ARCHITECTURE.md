<!-- refreshed: 2026-07-01 -->
# Architecture

**Analysis Date:** 2026-07-01

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js App Router (pages)                       │
│  `/` `/login` `/dashboard` `/weekly` `/video` `/photos` `/morpho`     │
│  `/measurements` `/workouts`          — all client components         │
│                    `app/**/page.tsx`                                  │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │ fetch()
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    `proxy.ts` (Next 16 middleware)                    │
│   Verifies signed session cookie on every request except /login and  │
│   /api/auth/login. Pages redirect to /login; APIs get 401 JSON.      │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Route Handlers — `app/api/**/route.ts`               │
│  auth/{login,logout}  analysis/{photos,weekly,video}  analyze-photo   │
│  hevy/workouts  journal/{sync,energy}  measurements  workouts          │
│  exercise-notes[/[id]]  me  users  nutrition/meals                     │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │ calls into
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Business logic — `lib/*.ts`                      │
│  morpho.ts (weekly pipeline)   claude.ts (Anthropic Vision calls)     │
│  hevy-sync.ts / heavy.ts (Hevy API)   journal-sync.ts / journal-sante │
│  claude-sync.ts (single-photo analysis)  exercise-notes.ts             │
│  auth.ts  system-user.ts  profile.ts  blob.ts  email.ts                │
└───────┬───────────────────┬───────────────────┬───────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────────┐   ┌────────────────────────┐
│ Prisma / Neon  │   │ External APIs      │   │ Vercel Blob / Resend   │
│ Postgres        │   │ Anthropic Claude   │   │ (photo storage, email) │
│ `lib/prisma.ts` │   │ Hevy  Journal Santé│   │ `blob.ts` `email.ts`   │
│ `prisma/schema` │   └───────────────────┘   └────────────────────────┘
└───────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Session gate | Verifies HMAC-signed cookie, redirects/401s unauthenticated requests | `proxy.ts` |
| Auth primitives | Password check, session token sign/verify | `lib/auth.ts` |
| System user | Single-user placeholder — every sync/analysis resolves to one `User` row | `lib/system-user.ts` |
| Weekly morpho pipeline | Orchestrates photo storage, Hevy/Journal context, Claude call, persistence, email | `lib/morpho.ts` |
| Claude client | Raw Anthropic Messages API calls (photo, morphology, exercise-form, progress) | `lib/claude.ts` |
| Single-photo analysis | Legacy/simple Claude Vision analysis stored as `Measurement.claudeData` | `lib/claude-sync.ts` |
| Hevy sync | Pulls workouts + body measurements from Hevy, writes `Workout/Exercise/ExerciseSet` and `Measurement` | `lib/hevy-sync.ts` |
| Hevy API client | Typed fetch wrapper around Hevy's paginated REST API | `lib/heavy.ts` |
| Journal Santé sync | Pulls measurements/meals/activity from an external nutrition app | `lib/journal-sync.ts` |
| Journal Santé API client | Typed fetch wrapper (bearer token via `JOURNAL_SANTE_SECRET`) | `lib/journal-sante.ts` |
| Exercise notes | Freeform per-exercise execution context fed into Claude prompts | `lib/exercise-notes.ts`, model `ExerciseNote` |
| Photo storage | Uploads progress photos to Vercel Blob (with inline-base64 fallback) | `lib/blob.ts` |
| Email | Sends the weekly advice email via Resend (no-ops if unconfigured) | `lib/email.ts` |
| Profile defaults | Hard-coded single-user height/gender/DOB used to prompt Claude | `lib/profile.ts` |
| DB client | Prisma singleton (global-cached in dev) | `lib/prisma.ts` |
| Pose analysis (dead code) | Browser MediaPipe pose/angle math; not imported by any page or API route | `lib/mediapipe.ts` |

## Pattern Overview

**Overall:** Server-rendered shell + client-only pages calling a thin REST-style API layer, with all real logic pushed into `lib/`. Single physical user (`system@example.com`), gated by one shared app password — this is a personal tool, not a multi-tenant SaaS.

**Key Characteristics:**
- Every `app/*/page.tsx` is `'use client'` and fetches its own data via `fetch()` in `useEffect` — there are no server components fetching data, no React Server Component data loading, no route-level loading/error boundaries.
- Route handlers (`app/api/**/route.ts`) are thin: parse request, delegate to a `lib/` service, map errors to JSON. Business logic never lives inline in a route file for anything non-trivial (the weekly/video routes are the closest to an exception, doing image compression inline).
- External integrations (Anthropic, Hevy, Journal Santé, Vercel Blob, Resend) are each wrapped in a dedicated `lib/*.ts` client with a `getXClient()`/`getXService()` factory — usually a lazily-constructed module-level singleton.
- Prisma is the only persistence layer; there is no repository/DAO abstraction beyond the `lib/*.ts` service modules that call `prisma` directly.
- French-language output: every Claude system prompt explicitly instructs "write text values in FRENCH, keep JSON keys in English" — this is a hard product requirement baked into every prompt in `lib/claude.ts`.

## Layers

**Presentation (`app/**/page.tsx`, `app/layout.tsx`):**
- Purpose: Forms, previews, and result rendering for each feature (weekly morpho, video form check, single photo, dashboard, measurements, workouts).
- Location: `app/dashboard/page.tsx`, `app/weekly/page.tsx`, `app/video/page.tsx`, `app/photos/page.tsx`, `app/morpho/page.tsx`, `app/measurements/page.tsx`, `app/workouts/page.tsx`, `app/login/page.tsx`, `app/page.tsx` (home)
- Contains: Client components, local `useState`/`useEffect` data fetching, `FormData`/canvas-based media prep (e.g. client-side video-frame extraction in `app/video/page.tsx`).
- Depends on: `app/api/**` route handlers over `fetch`, `lib/profile.ts` for default height/age constants.
- Used by: End user's browser only.

**Edge/gate (`proxy.ts`):**
- Purpose: Single-user session enforcement for every request (Next 16 renamed `middleware.ts` → `proxy.ts`, `export function proxy`).
- Location: `proxy.ts` (project root)
- Contains: Cookie check via `lib/auth.ts`, path allowlist (`/login`, `/api/auth/login`).
- Depends on: `lib/auth.ts`.
- Used by: The Next.js request pipeline (matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `*.svg`).

**API (`app/api/**/route.ts`):**
- Purpose: HTTP boundary — parses `FormData`/JSON bodies, calls into `lib/`, returns `NextResponse.json`.
- Location: `app/api/analysis/{photos,weekly,video}`, `app/api/analyze-photo`, `app/api/auth/{login,logout}`, `app/api/hevy/workouts`, `app/api/journal/{sync,energy}`, `app/api/measurements`, `app/api/workouts`, `app/api/exercise-notes[/[id]]`, `app/api/me`, `app/api/users`, `app/api/nutrition/meals`.
- Contains: Request parsing, minimal validation, error-to-JSON mapping. `app/api/analysis/weekly/route.ts` and `app/api/analysis/video/route.ts` set `export const runtime = 'nodejs'` and `maxDuration = 120` because they call Claude Vision with images and must outlive default serverless limits; `app/api/journal/sync/route.ts` sets `maxDuration = 60`.
- Depends on: `lib/*.ts` service modules, `lib/prisma.ts` directly for simple CRUD (`measurements`, `workouts`, `users`).
- Used by: Pages in `app/`.

**Business logic (`lib/*.ts`):**
- Purpose: All non-trivial logic — external API orchestration, Claude prompt construction, data aggregation, persistence rules (e.g. "AI photo estimates never populate `Measurement.weight`, only `claudeData`").
- Location: `lib/`
- Contains: Service classes/functions, singleton factories (`getClaudeClient`, `getHevyClient`, `getHevySyncService`, `getJournalSyncService`, `getJournalClient`, `getClaudeSyncService`).
- Depends on: `lib/prisma.ts`, `@prisma/client`, external HTTP APIs (`fetch`), `sharp` (image compression), `@vercel/blob`, `resend`.
- Used by: Route handlers in `app/api/`.

**Data (`prisma/schema.prisma`, Postgres/Neon):**
- Purpose: Durable storage for the single user's measurements, workouts/exercises/sets, meals, videos, progress photos, morpho analyses, and exercise notes.
- Location: `prisma/schema.prisma`, migrations in `prisma/migrations/`.
- Contains: `User`, `Measurement`, `Workout`/`Exercise`/`ExerciseSet`, `Meal`, `Video`, `ProgressPhoto`, `MorphoAnalysis`, `ExerciseNote`.
- Depends on: `DATABASE_URL` (Neon Postgres).
- Used by: Every `lib/*.ts` module that touches persistence.

## Data Flow

### Weekly Morpho Analysis (primary feature)

1. User uploads front/side/back photos + optional height/gender/age/email on `/weekly` (`app/weekly/page.tsx`) → `POST /api/analysis/weekly` as `multipart/form-data`.
2. `app/api/analysis/weekly/route.ts` extracts the up-to-3 photo buffers and calls `runWeeklyAnalysis()` (`lib/morpho.ts:136`).
3. `runWeeklyAnalysis` first **time-boxes** background syncs (`lib/morpho.ts:149-163`): triggers `getHevySyncService().syncWorkouts()` + `syncBodyMeasurements()` and, if `JOURNAL_SANTE_API_URL` is set, `getJournalSyncService().syncAll()`, all via `Promise.allSettled`, capped at 12s so a slow external API never blocks the analysis (this is the fix in commit `6c62581`).
4. Each photo is compressed to JPEG/base64 via `sharp` (`compressToBase64`, `lib/morpho.ts:116`), stored to Vercel Blob (`lib/blob.ts:uploadProgressPhoto`, falling back to an inline `data:` URL on failure), and persisted as a `ProgressPhoto` row.
5. `buildHevyContext()` (`lib/morpho.ts:39`) aggregates the athlete's last 30 Hevy workouts into a "best working set per exercise" text block, appends any `ExerciseNote`s relevant to each exercise (`lib/exercise-notes.ts:notesForExercise`) plus general notes, and includes the latest body-circumference JSON.
6. `buildNutritionContext()` (`lib/morpho.ts:96`) pulls a 30-day daily energy summary from Journal Santé (bounded by an 8s timeout) for a French-language nutrition/expenditure block.
7. The previous week's `MorphoAnalysis.summary` (if any) is appended for a progression note.
8. `getClaudeClient().analyzeMorphology(images, context, {height, gender, age})` (`lib/claude.ts:262`) sends all photos + the combined context text to Claude (`claude-sonnet-4-6`), which returns segment assessments, exercise-adaptation advice, a progression note, and a summary — all in French.
9. Result is persisted as a `MorphoAnalysis` row (`segments`, `advice`, `progression`, `summary`, `raw` for audit) and emailed via `renderAdviceEmail` + `sendAdviceEmail` (`lib/email.ts`), which no-ops gracefully if Resend isn't configured.
10. `/morpho` (`app/morpho/page.tsx`) later reads the same data back via `GET /api/analysis/weekly?action=latest` → `getLatestMorphoAnalysis()` (`lib/morpho.ts:252`), which resolves `photoIds` back to `ProgressPhoto` URLs.

### Video Exercise-Form Analysis

1. `/video` (`app/video/page.tsx`) captures a short clip, extracts `FRAME_COUNT` (6) evenly-spaced JPEG keyframes **client-side** via an off-screen `<canvas>` (no MediaPipe/pose library involved despite `lib/mediapipe.ts` existing) and uploads them as `frames` files in `multipart/form-data` to `POST /api/analysis/video`.
2. `app/api/analysis/video/route.ts` compresses each frame with `sharp`, fetches `ExerciseNote`s relevant to the named exercise (`getActiveExerciseNotes` + `notesForExercise` + `generalNotes`, formatted via `formatNotesForPrompt`), and calls `getClaudeClient().analyzeExerciseForm(images, exercise, { context })` (`lib/claude.ts:350`).
3. Claude reads the frames as an ordered movement sequence and returns `formScore`, estimated `reps`, French `feedback`, and structured `cues` — explicitly instructed not to flag a deliberate technique choice described in the notes as a flaw.
4. The first frame is uploaded to Blob as a thumbnail (or inlined as a data URL fallback) and a `Video` row is created with the analysis embedded (`repCount`, `formScore`, `feedback`, `keypoints` = cues).

### Single Photo Analysis (legacy simpler path)

1. `/photos` (`app/photos/page.tsx`) uploads one photo → `POST /api/analysis/photos` (JSON with `imageBase64`/`imageUrl`) or `POST /api/analyze-photo` (multipart, older variant).
2. Both routes delegate to `getClaudeSyncService().analyzePhoto()` (`lib/claude-sync.ts:36`), which calls `getClaudeClient().analyzePhoto()` (`lib/claude.ts:84`) for a single-image score/composition/strengths/weaknesses/recommendations analysis.
3. Result is stored as a `Measurement` with `weight/bodyFat/muscleMass/bmi` columns left `null` and the full AI estimate inside `claudeData` — this is a deliberate invariant (see Architectural Constraints) so AI guesses never contaminate real weigh-ins shown on `/dashboard` and `/measurements`.

### Dashboard / Measurements Read Path

1. `/dashboard` (`app/dashboard/page.tsx`) and `/measurements` first call `GET /api/me` (`lib/system-user.ts:getOrCreateSystemUserId`) to resolve the one system user id (never trusts `/api/users`, which can return stale demo rows).
2. Then fetches `GET /api/measurements?userId=` (filtered to `claudeData IS NULL` — i.e. real weigh-ins only), `GET /api/workouts?userId=`, and `GET /api/journal/energy?days=30`.

**State Management:**
- No global client state (no Redux/Zustand/Context store) — each page owns its own `useState`, fetching on mount via `useEffect`. Cross-page continuity relies entirely on the database, not client state.

## Key Abstractions

**Sync Service (`HevySyncService`, `JournalSyncService`):**
- Purpose: Idempotent import of external data into the local Postgres schema, dedup'd by external id (`hevyId`, `journalId`, `bodyScoreId`).
- Examples: `lib/hevy-sync.ts`, `lib/journal-sync.ts`.
- Pattern: Class with a lazily-constructed underlying API client, exposed via a module-level singleton factory (`getHevySyncService`, `getJournalSyncService`).

**API Client (`HevyClient`, `JournalSanteClient`, `ClaudeClient`):**
- Purpose: Typed `fetch` wrapper for one external REST API, including pagination helpers (`getAllWorkouts`, `getAllBodyMeasurements`) where relevant.
- Examples: `lib/heavy.ts`, `lib/journal-sante.ts`, `lib/claude.ts`.
- Pattern: Constructor takes an API key/base URL from env; private `request<T>()` helper centralizes headers/error handling.

**Prompt-context builder:**
- Purpose: Assemble plain-text context blocks (Hevy training history, nutrition summary, exercise notes) that get appended to a Claude system/user prompt, so the model reasons over the athlete's real data instead of generic assumptions.
- Examples: `buildHevyContext`, `buildNutritionContext` in `lib/morpho.ts`; `formatNotesForPrompt` in `lib/exercise-notes.ts`.
- Pattern: Pure functions returning a French-language string, composed via `.filter(Boolean).join('\n\n')` before being sent to Claude.

**Graceful external-dependency degradation:**
- Purpose: Let the core flow (analysis + email) complete even if a secondary integration is slow, unconfigured, or failing.
- Examples: `withTimeout()` in `lib/morpho.ts:18`; Blob-upload fallback to inline `data:` URL (`lib/morpho.ts:176-182`, `app/api/analysis/video/route.ts:49-56`); `sendAdviceEmail` no-op when `RESEND_API_KEY`/`COACH_EMAIL_TO` are absent (`lib/email.ts:20-22`); `buildNutritionContext` returning `''` if `JOURNAL_SANTE_API_URL` unset or the call throws.
- Pattern: Wrap the risky call, catch/timeout, return a safe fallback value or `{ sent: false, reason }`, log via `console.error`.

## Entry Points

**`proxy.ts` (Next 16 middleware convention):**
- Location: `proxy.ts`
- Triggers: Every incoming request except `_next/static`, `_next/image`, `favicon.ico`, `*.svg` (see `config.matcher`).
- Responsibilities: Session-cookie gate; redirects unauthenticated page requests to `/login?from=<path>`, returns 401 JSON for unauthenticated API requests.

**`app/layout.tsx`:**
- Location: `app/layout.tsx`
- Triggers: Every page render (root layout).
- Responsibilities: Loads Geist fonts, sets `<html>`/`<body>` classes, page `<title>`/description metadata. No providers, no client wrapper — deliberately minimal.

**Route handlers (`app/api/**/route.ts`):**
- Location: See Component Responsibilities table.
- Triggers: `fetch()` calls from pages.
- Responsibilities: Parse input, call `lib/`, shape JSON response, map thrown errors to `{ error, details }` with a 4xx/5xx status.

## Architectural Constraints

- **Single-user model:** There is exactly one real user (`getOrCreateSystemUserId()` upserts `system@example.com`). `User`/multi-tenant fields exist in the schema (and `app/api/users/route.ts` still supports creating arbitrary users) but the product no longer has a user-selection UI (removed per commit `c610ae4`) — all reads/writes funnel through `/api/me`.
- **AI-estimate vs. real-data invariant:** `Measurement` rows from AI photo analysis (`lib/claude-sync.ts`) always set `weight/bodyFat/muscleMass/bmi` columns to `null` and stash the guess in `claudeData`; real weigh-ins (Hevy/Journal Santé sync) always leave `claudeData` null. Every read path that should show "real" data explicitly filters `claudeData: { equals: Prisma.DbNull }` (`app/api/measurements/route.ts:18`, `lib/hevy-sync.ts:125`). Breaking this convention in new code would silently corrupt the dashboard's weight chart.
- **Serverless time budget:** Vercel functions have a duration ceiling; `app/api/analysis/weekly/route.ts` and `app/api/analysis/video/route.ts` explicitly opt into `runtime = 'nodejs'` and `maxDuration = 120` because they call Claude Vision with multiple images. `runWeeklyAnalysis` further self-time-boxes its background Hevy/Journal syncs to 12s total so the whole request (sync + 3-image Claude call + email) fits comfortably inside that window — this was a direct bug fix (see git log `6c62581`).
- **No middleware.ts:** This Next.js version (16.2.9) renamed the middleware file convention to `proxy.ts` exporting `proxy()` instead of `middleware()` — do not create `middleware.ts`, it will not run. See `AGENTS.md` for the "this is NOT the Next.js you know" warning; consult `node_modules/next/dist/docs/` before assuming API compatibility with older Next versions.
- **Global state:** Two module-level singletons pattern: Prisma client cached on `globalThis` in non-production (`lib/prisma.ts:7-9`) to survive dev hot-reload; each sync/service class (`HevySyncService`, `JournalSyncService`, `ClaudeSyncService`) is memoized in a module-level `let syncService` variable behind a `getXService()` getter.
- **Dead code:** `lib/mediapipe.ts` (browser pose-estimation client) is not imported anywhere — the shipped video-analysis flow instead extracts raw JPEG keyframes client-side and sends them straight to Claude Vision. Treat this file as unused unless a future phase explicitly revives client-side pose math.
- **Language requirement:** All Claude system prompts (`lib/claude.ts`) explicitly require French output text with English JSON keys — any new Claude-calling code must follow the same convention to keep UI copy consistent.

## Anti-Patterns

### Duplicate photo-analysis endpoints

**What happens:** `app/api/analysis/photos/route.ts` and `app/api/analyze-photo/route.ts` both accept a single photo and both end up calling `getClaudeSyncService().analyzePhoto()` — one expects JSON (`imageUrl`/`imageBase64`), the other expects `multipart/form-data`.
**Why it's wrong:** Two entry points for the same operation means bug fixes/behavior changes (e.g. compression quality, error shape) must be applied twice or they silently diverge — `app/api/analysis/photos/route.ts` compresses via `compressImage()` while `app/api/analyze-photo/route.ts` inlines nearly identical `sharp` code.
**Do this instead:** Treat `app/api/analysis/photos` as canonical (it is the one referenced by the newer `/photos` page path structure); if both are still reachable from the UI, consolidate the multipart variant into a thin wrapper that calls the same shared compression helper.

### Inline business logic in route handlers for simple CRUD

**What happens:** `app/api/measurements/route.ts`, `app/api/workouts/route.ts`, and `app/api/users/route.ts` call `prisma` directly with no `lib/` service layer, while every other feature (Hevy, Journal Santé, Claude, morpho) goes through a dedicated `lib/*.ts` module.
**Why it's wrong:** Inconsistent layering makes it unclear where to add validation or shared logic (e.g. the `claudeData: DbNull` filter convention is duplicated ad hoc rather than centralized).
**Do this instead:** New non-trivial read/write logic for these models should be added to a `lib/` module (e.g. `lib/measurements.ts`) rather than growing inline in the route handler, matching the pattern used by `lib/hevy-sync.ts`/`lib/journal-sync.ts`.

## Error Handling

**Strategy:** Every route handler wraps its logic in `try/catch`, logs the raw error with `console.error`, and returns `NextResponse.json({ error, details }, { status })` — no shared error-handling middleware or typed error classes.

**Patterns:**
- User-facing `error` message is French and feature-specific (e.g. `'Analyse hebdomadaire échouée'`); `details` carries `error instanceof Error ? error.message : 'Unknown error'` for debugging.
- `lib/` functions that call external APIs generally let errors propagate (`throw`) rather than swallow them, except where graceful degradation is deliberate (see Key Abstractions → graceful degradation).
- `lib/auth.ts` fails closed: any exception while verifying a session token (e.g. missing `AUTH_SECRET`) is caught and treated as "invalid" rather than allowed through.

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` only, no structured logger. `lib/claude.ts`'s `analyzePhoto`/`analyzeProgress` methods are especially verbose (logging every intermediate step); `analyzeMorphology`/`analyzeExerciseForm` are quieter. No log levels or redaction — be careful not to log secrets or full base64 image payloads.

**Validation:** Minimal and manual — route handlers check for required fields (`if (!file) return 400`) but there is no schema validation library (no zod/yup) anywhere in the codebase.

**Authentication:** Single shared password (`APP_PASSWORD`) + HMAC-signed session cookie (`AUTH_SECRET`), enforced globally by `proxy.ts`. No per-user accounts, no OAuth, no roles.

---

*Architecture analysis: 2026-07-01*
