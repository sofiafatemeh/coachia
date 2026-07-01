@AGENTS.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Coach AI**

Une application de coaching fitness personnel, mono-utilisateur, qui combine les données d'entraînement réelles (Hevy), l'analyse morpho-anatomique par IA (photos + vidéo) et le suivi nutrition/énergie (Journal Santé) pour délivrer un accompagnement personnalisé de très haut niveau — l'équivalent d'un coach personnel premium (plusieurs milliers d'euros/an), mais calibré sur la morphologie et l'équipement réels de l'utilisateur.

**Core Value:** Accélérer la perte de masse grasse et la prise de masse musculaire propre de l'utilisateur via des conseils d'entraînement et de nutrition adaptés à sa morphologie réelle et aux machines dont il dispose — pas des conseils génériques.

### Constraints

- **Solo/mono-utilisateur** : un seul mot de passe partagé, un seul "system user" en base — ne pas construire de multi-tenancy tant que la monétisation n'est pas activement décidée.
- **Déploiement** : push direct sur `main`, pas de CI/PR — toute nouvelle phase doit rester compatible avec ce workflow sans l'alourdir.
- **Droits d'auteur** : le contenu des livres de référence ne doit jamais être republié tel quel dans l'app ou dans des documents commités — seulement synthétisé/appliqué dans les prompts IA.
- **Coût/latence IA** : les analyses (photo, morpho hebdo, vidéo) appellent Claude avec des images — attention à ne pas faire exploser les coûts/temps de réponse en ajoutant du contenu de référence volumineux à chaque appel.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - All application code (`app/`, `lib/`, `prisma/seed.ts`), strict mode enabled in `tsconfig.json`
- JavaScript (config only) - `postcss.config.mjs`, `eslint.config.mjs`
## Runtime
- Node.js (Next.js 16 App Router, Node.js runtime explicitly selected for API routes that need it, e.g. `export const runtime = 'nodejs'` in `app/api/analysis/weekly/route.ts`)
- No `.nvmrc` / `engines` field present — no pinned Node version at the repo level; Vercel's default Node runtime applies in production
- npm
- Lockfile: `package-lock.json` present (npm-managed, not yarn/pnpm)
## Frameworks
- Next.js 16.2.9 - App Router (`app/`), full-stack framework (pages + API routes). Note: this is a post-training version with breaking changes vs. the Next.js in Claude's training data — per `AGENTS.md`, consult `node_modules/next/dist/docs/` before writing Next-specific code.
- React 19.2.4 / react-dom 19.2.4 - UI layer
- Tailwind CSS v4 (`tailwindcss ^4`, `@tailwindcss/postcss ^4`) - styling, configured via PostCSS plugin in `postcss.config.mjs`
- None detected — no Jest/Vitest/Playwright config or `*.test.*`/`*.spec.*` files found in the repo
- TypeScript 5.x compiler (`tsc` via `next build`, `noEmit: true` — type-checking only, Next/SWC handles transpilation)
- ESLint 9.x with `eslint-config-next` 16.2.9 (flat config, `eslint.config.mjs`)
- tsx 4.x - runs `prisma/seed.ts` directly (`npm run seed`)
- Prisma CLI 5.22.0 - schema management, migrations, client generation
## Key Dependencies
- `@prisma/client` ^5.22.0 + `prisma` ^5.22.0 - ORM and query builder for PostgreSQL; schema at `prisma/schema.prisma`
- `@vercel/blob` ^2.5.0 - object storage for progress photos (and video, per `Video.url` field) — see `lib/blob.ts`
- `resend` ^6.16.0 - transactional email for weekly morpho-analysis advice — see `lib/email.ts`
- `sharp` ^0.35.2 - server-side image resize/compress before sending photos to Claude Vision — see `lib/morpho.ts` (`compressToBase64`)
- `@mediapipe/pose`, `@mediapipe/camera_utils`, `@mediapipe/drawing_utils` (pinned to specific build timestamps, e.g. `^0.3.1675466862`) - browser-only pose estimation for exercise-video analysis — see `lib/mediapipe.ts`
- No dedicated HTTP client library — all external API calls (Anthropic, Hevy, Journal Santé) use the native `fetch` API directly (`lib/claude.ts`, `lib/heavy.ts`, `lib/journal-sante.ts`)
- `node:crypto` (`createHmac`, `timingSafeEqual`) - HMAC session-token signing for single-user auth — `lib/auth.ts`
## Configuration
- `.env` and `.env.local` present locally (not committed — contents not inspected here); production env vars configured in the Vercel project dashboard
- Key configs required (names only, see INTEGRATIONS.md for details): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HEVY_API_KEY`, `JOURNAL_SANTE_API_URL`, `JOURNAL_SANTE_SECRET`, `RESEND_API_KEY`, `COACH_EMAIL_TO`, `COACH_EMAIL_FROM`, `APP_PASSWORD`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` (implicit — read automatically by `@vercel/blob`, not referenced via `process.env` in app code)
- `next.config.ts` - minimal, no custom Next config options set
- `tsconfig.json` - `@/*` path alias mapped to repo root, `strict: true`, target `ES2017`, `moduleResolution: bundler`
- `postcss.config.mjs` - Tailwind v4 PostCSS plugin only
- `eslint.config.mjs` - flat ESLint config extending `eslint-config-next`
- `vercel.json` - explicit `buildCommand`/`devCommand`/`installCommand`, `framework: nextjs`
- `package.json` `build` script runs `npx prisma migrate deploy && npx prisma generate && next build` — migrations are applied automatically on every Vercel deploy
## Platform Requirements
- Any OS with Node.js + npm
- PostgreSQL reachable via `DATABASE_URL` (Neon, per project context) — no local Docker Compose/DB setup detected in the repo
- No `.nvmrc`; developer must have a Next.js 16 / React 19–compatible Node version
- Deployment target: Vercel (per `vercel.json`, `framework: nextjs`), branch `main`, direct push (no PR/CI workflow files found — no `.github/workflows/`)
- Database: PostgreSQL via Prisma, `migrate deploy` runs as part of the build step (see above)
- Object storage: Vercel Blob (`BLOB_READ_WRITE_TOKEN` auto-provisioned on Vercel once Blob is enabled for the project)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- kebab-case-free, mostly single lowercase words for `lib/` modules: `lib/prisma.ts`, `lib/auth.ts`, `lib/morpho.ts`, `lib/hevy-sync.ts`, `lib/journal-sync.ts`, `lib/journal-sante.ts`, `lib/claude.ts`, `lib/claude-sync.ts`, `lib/system-user.ts`, `lib/exercise-notes.ts`, `lib/blob.ts`, `lib/email.ts`, `lib/mediapipe.ts`, `lib/profile.ts`. One outlier: `lib/heavy.ts` (should be `hevy.ts` — likely a typo, imported as `@/lib/heavy` from `lib/hevy-sync.ts`).
- Next.js App Router conventions drive most naming: every route folder under `app/` is `page.tsx` (UI) or `route.ts` (API handler); dynamic segments use `[id]` (`app/api/exercise-notes/[id]/route.ts`).
- No `*.test.ts` naming pattern exists — there are no test files in the repo.
- Root-level throwaway scripts/docs use SCREAMING_SNAKE or ad-hoc names (`DATABASE_SETUP.md`, `MEDIAPIPE_INTEGRATION.md`, `add-db-url.py`) — these are operational/setup notes, not part of the app's source conventions.
- camelCase for all functions and methods: `getOrCreateSystemUserId`, `syncWorkouts`, `dailyEnergySummary`.
- Data-fetching functions in client components are named `fetch<Noun>` and called directly (not wrapped in a custom hook): `fetchWorkouts`, `fetchNotes`, `fetchMeasurements`, `fetchData`.
- Event handlers use `handle<Event>` prefix: `handleSubmit`, `handleLogout` (`app/login/page.tsx`, `app/page.tsx`).
- Service singletons are exposed via a `get<Service>Service()` factory that lazily instantiates and caches a module-level instance — see `getHevySyncService()` (`lib/hevy-sync.ts:163`), `getJournalSyncService()` (`lib/journal-sync.ts`), `getHevyClient()` (`lib/heavy.ts`), `getClaudeClient()` (`lib/claude.ts`).
- camelCase for local variables and state.
- No `UPPER_SNAKE_CASE` module constants except a handful of true constants: `SESSION_COOKIE`, `SESSION_TTL_SECONDS` (`lib/auth.ts`), `PUBLIC_PATHS` (`proxy.ts`), `DAY_MS` (`lib/hevy-sync.ts`), `SYSTEM_USER_EMAIL` (`lib/system-user.ts`).
- No private-member prefix convention (no leading underscore) — classes use TypeScript `private` keyword instead (`private hevy = getHevyClient()` in `lib/hevy-sync.ts:9`).
- PascalCase interfaces, no `I` prefix: `Measurement`, `Workout`, `DailyEnergy` (`app/dashboard/page.tsx`), `ExerciseNote` (`app/workouts/page.tsx`).
- Client-side page components each redeclare their own local interfaces for API response shapes instead of importing shared types — e.g. `Workout` is independently defined in both `app/dashboard/page.tsx` and `app/workouts/page.tsx` with different field sets. There is no shared `types/` directory; Prisma-generated types (`@prisma/client`) are used directly in `lib/` and API routes instead.
- `type` imports use inline `type` keyword within the same import statement rather than a separate `import type` line: `import { getHevyClient, type HevyWorkout } from '@/lib/heavy'` (`app/api/analysis/weekly/route.ts:3`).
## Code Style
- No `.prettierrc` or Prettier dependency present — formatting is whatever the author/editor produces, not enforced by tooling.
- No semicolons in most `app/` and `lib/` TypeScript files (ASI style) — exception: `app/layout.tsx` uses semicolons throughout. This makes `app/layout.tsx` (largely untouched Next.js scaffold) stylistically inconsistent with the rest of the app.
- Single quotes for strings almost everywhere in application code.
- 2-space indentation.
- ESLint 9 flat config (`eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Run via `npm run lint` (bare `eslint`, no path argument — lints whole repo per flat-config ignores).
- `npm run lint` is **not** part of `npm run build`, so lint errors do not block deploys.
- As of this analysis, running `npx eslint .` reports **26 problems (23 errors, 3 warnings)** across 9 files. This is pre-existing, tolerated debt — do not attempt to opportunistically fix unrelated files' lint errors as part of an unrelated change, but do not introduce new ones either. Breakdown:
- When adding new `fetch*` helper functions called from `useEffect`, either declare them with `function` (hoisted) or move the `useEffect` call below the declaration to avoid adding to this list.
## Import Organization
- No blank line separators are consistently used between import groups; imports are typically 2-4 lines total per file and just listed together.
- No enforced alphabetical sort (ESLint config does not include `import/order`).
- `@/*` maps to the project root (`tsconfig.json` → `"@/*": ["./*"]`), so `@/lib/prisma`, `@/lib/auth`, etc. Used exclusively over relative paths for cross-directory imports.
## Error Handling
- Every route handler wraps its body in `try { ... } catch (error) { ... }` and never lets exceptions propagate — see every file under `app/api/**/route.ts`.
- Errors are logged with `console.error('[API] <Context>:', error)` or a plainer `console.error('Error <doing x>:', error)`, then converted to a JSON error response via `NextResponse.json({ error, details? }, { status })`.
- Standard error body shape for mutation endpoints: `{ success: false, error: '<user-facing message>', details: error instanceof Error ? error.message : 'Unknown error' }`. Read endpoints often use a simpler `{ error: '<message>' }`.
- Common status codes: `400` for missing/invalid input or unknown `action`, `401` for auth failures (`proxy.ts`, `app/api/auth/login/route.ts`), `500` for unexpected/unhandled errors. No `404` convention observed (e.g. delete of a non-existent note still returns `{ success: true }` via `deleteMany`).
- `instanceof Error` narrowing is the standard way to safely extract a message from a caught `unknown`: `error instanceof Error ? error.message : 'Unknown error'` (repeated verbatim across `lib/journal-sync.ts`-backed routes and `lib/hevy-sync.ts`-backed routes).
- Same `try/catch` + `console.error` shape, but user feedback is either silent (empty state falls back to `[]`), an `alert()` call (`app/page.tsx`, `app/workouts/page.tsx` `addNote`), or a `setError(...)` state string rendered inline (`app/login/page.tsx`).
- Optimistic UI updates roll back by re-fetching on failure rather than reverting local state manually: `deleteNote` in `app/workouts/page.tsx:85` removes the note from state immediately, then re-fetches from the server if the DELETE call fails.
## Logging
- Bracketed module tag prefix for traceability: `console.log('[Claude] Starting photo analysis...')` (`lib/claude.ts`), `console.error('[API] Hevy sync error:', error)` (`app/api/hevy/workouts/route.ts`). Use `[API]` in route handlers and `[ModuleName]` (e.g. `[Claude]`) in `lib/` service files.
- Verbose step-by-step `console.log` tracing is used liberally inside AI-integration code (`lib/claude.ts` logs image size, model, response status, parsed result at nearly every step) — this is intentional for debugging the Claude Vision integration in production logs (Vercel), since there is no APM/tracing tool.
- No log levels beyond `log`/`error`/`warn` — no `debug`/`info` distinction.
## Comments
- Comments explain *why*, especially for non-obvious business/data-model decisions, e.g.: `// ExerciseSet requires BOTH exerciseId AND workoutId (non-null)...` (`app/api/workouts/route.ts:39-41`), `// Hevy's /workouts has no date filter — fetch all pages...` (`lib/hevy-sync.ts:17-18`), `// Re-sync is idempotent AND self-healing...` (`lib/hevy-sync.ts:56-57`).
- Module-header comments explain the overall design/security model at the top of key files: `proxy.ts:5-7` (why `proxy` replaces `middleware` in Next 16), `lib/auth.ts:3-5` (single-user auth model), `lib/system-user.ts:6-11` (JSDoc explaining the system-user placeholder).
- French-language UI copy is standard (this is a French-language app); code comments and identifiers are in English.
- Used sparingly, only on a handful of exported helper functions with non-obvious contracts: `lib/auth.ts` (`safeEqual`, `createSessionToken`, `isValidSessionToken`, `checkPassword`, `isAuthConfigured` all have one-line `/** ... */` docblocks), `lib/system-user.ts` (`getOrCreateSystemUserId`). Not used on API route handlers or React components.
- No `TODO(username)` convention. Forward-looking caveats are written as plain narrative comments instead, e.g. `NOTE: this is a single-user placeholder until real authentication is added` (`lib/system-user.ts:9`).
## Function Design
- API route handlers are typically 15-50 lines; page components are 100-300 lines (all UI + all fetch logic + all handlers in one default-exported function component — no extraction into smaller sub-components).
- `lib/` service classes (e.g. `HevySyncService`) keep individual methods focused (single sync operation) but the file as a whole can be large due to nested transaction logic.
- Route handlers follow the Next.js signature exactly: `(request: Request)` or, for dynamic routes, `(request: Request, { params }: { params: Promise<{ id: string }> })` — note `params` is a `Promise` (Next 16 breaking change) and must be `await`ed, e.g. `const { id } = await params` (`app/api/exercise-notes/[id]/route.ts:7`).
- Options are passed as a single object when there is more than one, e.g. `syncWorkouts(options?: { days?: number })`.
- API handlers always return `NextResponse.json(...)`, never a raw object or `undefined`.
- Guard clauses return early on invalid input, e.g. `if (!userId || !name) return NextResponse.json({ error: '...' }, { status: 400 })` (`app/api/workouts/route.ts:35-37`).
## Module Design
- `lib/` modules mix a default export and a named export for the same value in one case: `lib/prisma.ts` exports both `export default prismaClient` and `export { prismaClient as prisma }`. Consuming code is inconsistent as a result — some files `import prisma from '@/lib/prisma'` (default), others `import { prisma } from '@/lib/prisma'` (named). Both work today; prefer the named `{ prisma }` import for new code since it is the more common form in `app/api/**`.
- Otherwise, named exports are standard for functions/classes/constants (`export function`, `export class`, `export const`).
- React pages/components use `export default function ComponentName()` — the Next.js App Router requirement for `page.tsx`.
- No barrel/index files anywhere in `app/` or `lib/` — every module is imported directly by its file path.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Every `app/*/page.tsx` is `'use client'` and fetches its own data via `fetch()` in `useEffect` — there are no server components fetching data, no React Server Component data loading, no route-level loading/error boundaries.
- Route handlers (`app/api/**/route.ts`) are thin: parse request, delegate to a `lib/` service, map errors to JSON. Business logic never lives inline in a route file for anything non-trivial (the weekly/video routes are the closest to an exception, doing image compression inline).
- External integrations (Anthropic, Hevy, Journal Santé, Vercel Blob, Resend) are each wrapped in a dedicated `lib/*.ts` client with a `getXClient()`/`getXService()` factory — usually a lazily-constructed module-level singleton.
- Prisma is the only persistence layer; there is no repository/DAO abstraction beyond the `lib/*.ts` service modules that call `prisma` directly.
- French-language output: every Claude system prompt explicitly instructs "write text values in FRENCH, keep JSON keys in English" — this is a hard product requirement baked into every prompt in `lib/claude.ts`.
## Layers
- Purpose: Forms, previews, and result rendering for each feature (weekly morpho, video form check, single photo, dashboard, measurements, workouts).
- Location: `app/dashboard/page.tsx`, `app/weekly/page.tsx`, `app/video/page.tsx`, `app/photos/page.tsx`, `app/morpho/page.tsx`, `app/measurements/page.tsx`, `app/workouts/page.tsx`, `app/login/page.tsx`, `app/page.tsx` (home)
- Contains: Client components, local `useState`/`useEffect` data fetching, `FormData`/canvas-based media prep (e.g. client-side video-frame extraction in `app/video/page.tsx`).
- Depends on: `app/api/**` route handlers over `fetch`, `lib/profile.ts` for default height/age constants.
- Used by: End user's browser only.
- Purpose: Single-user session enforcement for every request (Next 16 renamed `middleware.ts` → `proxy.ts`, `export function proxy`).
- Location: `proxy.ts` (project root)
- Contains: Cookie check via `lib/auth.ts`, path allowlist (`/login`, `/api/auth/login`).
- Depends on: `lib/auth.ts`.
- Used by: The Next.js request pipeline (matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `*.svg`).
- Purpose: HTTP boundary — parses `FormData`/JSON bodies, calls into `lib/`, returns `NextResponse.json`.
- Location: `app/api/analysis/{photos,weekly,video}`, `app/api/analyze-photo`, `app/api/auth/{login,logout}`, `app/api/hevy/workouts`, `app/api/journal/{sync,energy}`, `app/api/measurements`, `app/api/workouts`, `app/api/exercise-notes[/[id]]`, `app/api/me`, `app/api/users`, `app/api/nutrition/meals`.
- Contains: Request parsing, minimal validation, error-to-JSON mapping. `app/api/analysis/weekly/route.ts` and `app/api/analysis/video/route.ts` set `export const runtime = 'nodejs'` and `maxDuration = 120` because they call Claude Vision with images and must outlive default serverless limits; `app/api/journal/sync/route.ts` sets `maxDuration = 60`.
- Depends on: `lib/*.ts` service modules, `lib/prisma.ts` directly for simple CRUD (`measurements`, `workouts`, `users`).
- Used by: Pages in `app/`.
- Purpose: All non-trivial logic — external API orchestration, Claude prompt construction, data aggregation, persistence rules (e.g. "AI photo estimates never populate `Measurement.weight`, only `claudeData`").
- Location: `lib/`
- Contains: Service classes/functions, singleton factories (`getClaudeClient`, `getHevyClient`, `getHevySyncService`, `getJournalSyncService`, `getJournalClient`, `getClaudeSyncService`).
- Depends on: `lib/prisma.ts`, `@prisma/client`, external HTTP APIs (`fetch`), `sharp` (image compression), `@vercel/blob`, `resend`.
- Used by: Route handlers in `app/api/`.
- Purpose: Durable storage for the single user's measurements, workouts/exercises/sets, meals, videos, progress photos, morpho analyses, and exercise notes.
- Location: `prisma/schema.prisma`, migrations in `prisma/migrations/`.
- Contains: `User`, `Measurement`, `Workout`/`Exercise`/`ExerciseSet`, `Meal`, `Video`, `ProgressPhoto`, `MorphoAnalysis`, `ExerciseNote`.
- Depends on: `DATABASE_URL` (Neon Postgres).
- Used by: Every `lib/*.ts` module that touches persistence.
## Data Flow
### Weekly Morpho Analysis (primary feature)
### Video Exercise-Form Analysis
### Single Photo Analysis (legacy simpler path)
### Dashboard / Measurements Read Path
- No global client state (no Redux/Zustand/Context store) — each page owns its own `useState`, fetching on mount via `useEffect`. Cross-page continuity relies entirely on the database, not client state.
## Key Abstractions
- Purpose: Idempotent import of external data into the local Postgres schema, dedup'd by external id (`hevyId`, `journalId`, `bodyScoreId`).
- Examples: `lib/hevy-sync.ts`, `lib/journal-sync.ts`.
- Pattern: Class with a lazily-constructed underlying API client, exposed via a module-level singleton factory (`getHevySyncService`, `getJournalSyncService`).
- Purpose: Typed `fetch` wrapper for one external REST API, including pagination helpers (`getAllWorkouts`, `getAllBodyMeasurements`) where relevant.
- Examples: `lib/heavy.ts`, `lib/journal-sante.ts`, `lib/claude.ts`.
- Pattern: Constructor takes an API key/base URL from env; private `request<T>()` helper centralizes headers/error handling.
- Purpose: Assemble plain-text context blocks (Hevy training history, nutrition summary, exercise notes) that get appended to a Claude system/user prompt, so the model reasons over the athlete's real data instead of generic assumptions.
- Examples: `buildHevyContext`, `buildNutritionContext` in `lib/morpho.ts`; `formatNotesForPrompt` in `lib/exercise-notes.ts`.
- Pattern: Pure functions returning a French-language string, composed via `.filter(Boolean).join('\n\n')` before being sent to Claude.
- Purpose: Let the core flow (analysis + email) complete even if a secondary integration is slow, unconfigured, or failing.
- Examples: `withTimeout()` in `lib/morpho.ts:18`; Blob-upload fallback to inline `data:` URL (`lib/morpho.ts:176-182`, `app/api/analysis/video/route.ts:49-56`); `sendAdviceEmail` no-op when `RESEND_API_KEY`/`COACH_EMAIL_TO` are absent (`lib/email.ts:20-22`); `buildNutritionContext` returning `''` if `JOURNAL_SANTE_API_URL` unset or the call throws.
- Pattern: Wrap the risky call, catch/timeout, return a safe fallback value or `{ sent: false, reason }`, log via `console.error`.
## Entry Points
- Location: `proxy.ts`
- Triggers: Every incoming request except `_next/static`, `_next/image`, `favicon.ico`, `*.svg` (see `config.matcher`).
- Responsibilities: Session-cookie gate; redirects unauthenticated page requests to `/login?from=<path>`, returns 401 JSON for unauthenticated API requests.
- Location: `app/layout.tsx`
- Triggers: Every page render (root layout).
- Responsibilities: Loads Geist fonts, sets `<html>`/`<body>` classes, page `<title>`/description metadata. No providers, no client wrapper — deliberately minimal.
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
### Inline business logic in route handlers for simple CRUD
## Error Handling
- User-facing `error` message is French and feature-specific (e.g. `'Analyse hebdomadaire échouée'`); `details` carries `error instanceof Error ? error.message : 'Unknown error'` for debugging.
- `lib/` functions that call external APIs generally let errors propagate (`throw`) rather than swallow them, except where graceful degradation is deliberate (see Key Abstractions → graceful degradation).
- `lib/auth.ts` fails closed: any exception while verifying a session token (e.g. missing `AUTH_SECRET`) is caught and treated as "invalid" rather than allowed through.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
