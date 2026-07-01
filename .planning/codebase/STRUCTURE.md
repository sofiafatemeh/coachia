# Codebase Structure

**Analysis Date:** 2026-07-01

## Directory Layout

```
coach/
├── app/                          # Next.js App Router — pages + API routes
│   ├── layout.tsx                # Root layout (fonts, <html>/<body>, metadata)
│   ├── page.tsx                  # Home ("/") — feature grid + Hevy/Journal sync buttons
│   ├── globals.css               # Tailwind v4 entry + design tokens (onyx/gold/crimson/ink)
│   ├── favicon.ico
│   ├── login/page.tsx            # "/login" — password form
│   ├── dashboard/page.tsx        # "/dashboard" — weight/workouts/nutrition overview
│   ├── weekly/page.tsx           # "/weekly" — 3-photo morpho analysis submission
│   ├── video/page.tsx            # "/video" — exercise-form clip submission (client frame extraction)
│   ├── photos/page.tsx           # "/photos" — single photo body analysis
│   ├── morpho/page.tsx           # "/morpho" — view latest persisted MorphoAnalysis
│   ├── measurements/page.tsx     # "/measurements" — weight/circumference history
│   ├── workouts/page.tsx         # "/workouts" — Hevy-synced workout log
│   └── api/                      # Route handlers (each folder = one path segment)
│       ├── auth/{login,logout}/route.ts
│       ├── analysis/{photos,weekly,video}/route.ts
│       ├── analyze-photo/route.ts        # legacy multipart variant of analysis/photos
│       ├── hevy/workouts/route.ts
│       ├── journal/{sync,energy}/route.ts
│       ├── measurements/route.ts
│       ├── workouts/route.ts
│       ├── exercise-notes/route.ts
│       ├── exercise-notes/[id]/route.ts
│       ├── me/route.ts
│       ├── users/route.ts
│       ├── nutrition/meals/route.ts
│       └── body-score/analysis/         # EMPTY directory, no route.ts — stray leftover
├── lib/                          # Business logic, external API clients, singletons
│   ├── prisma.ts                 # Prisma client singleton (globalThis-cached in dev)
│   ├── auth.ts                   # Session cookie sign/verify, password check
│   ├── system-user.ts            # getOrCreateSystemUserId() — the one app user
│   ├── profile.ts                # Hard-coded height/gender/DOB defaults
│   ├── claude.ts                 # ClaudeClient — all Anthropic Messages API calls
│   ├── claude-sync.ts            # Single-photo analysis service (writes Measurement.claudeData)
│   ├── morpho.ts                 # Weekly morpho pipeline orchestration (the core feature)
│   ├── exercise-notes.ts         # ExerciseNote query/filter/format helpers
│   ├── heavy.ts                  # HevyClient — typed Hevy REST API wrapper
│   ├── hevy-sync.ts              # HevySyncService — imports workouts/body measurements
│   ├── journal-sante.ts          # JournalSanteClient — typed external nutrition API wrapper
│   ├── journal-sync.ts           # JournalSyncService — imports measurements/meals, energy summary
│   ├── blob.ts                   # Vercel Blob upload (progress photos)
│   ├── email.ts                  # Resend email send + HTML render for weekly advice
│   └── mediapipe.ts              # UNUSED — browser pose-estimation client, not imported anywhere
├── prisma/
│   ├── schema.prisma              # Data model (see below)
│   ├── migrations/                # Timestamped SQL migrations + migration_lock.toml
│   └── seed.ts                    # referenced by package.json "seed" script (verify presence before relying on it)
├── proxy.ts                       # Next 16 "middleware" (renamed) — session gate for all routes
├── next.config.ts                 # Default Next config (no custom options set)
├── tsconfig.json                  # `@/*` path alias → project root
├── vercel.json                    # framework: nextjs, explicit build/dev/install commands
├── scripts/vercel-build.sh        # prisma migrate deploy + generate, then next build
├── package.json
├── public/                        # Static assets (default Next SVGs)
├── AGENTS.md / CLAUDE.md           # Project instructions (Next 16 breaking-change warning)
├── REPRISE.md                     # Handoff notes / current state summary
└── .planning/codebase/             # This codebase map (STACK/ARCHITECTURE/etc.)
```

## Directory Purposes

**`app/` (pages):**
- Purpose: One directory per route segment; each leaf holds a `page.tsx`.
- Contains: Exclusively `'use client'` components. No `layout.tsx` other than the root. No loading/error boundary files, no server components fetching data.
- Key files: `app/page.tsx` (home/navigation hub), `app/weekly/page.tsx` (primary feature UI).

**`app/api/` (route handlers):**
- Purpose: HTTP boundary translating requests into `lib/` calls.
- Contains: `route.ts` files exporting `GET`/`POST`/`DELETE` handlers. Dynamic segments use Next's `[id]` folder convention with `params: Promise<{ id: string }>` (Next 16 async params).
- Key files: `app/api/analysis/weekly/route.ts` (core feature endpoint, `runtime='nodejs'`, `maxDuration=120`), `app/api/analysis/video/route.ts` (same duration budget).
- Note: `app/api/body-score/analysis/` exists as an empty directory with no `route.ts` — dead scaffolding from an earlier "BodyScore AI" integration referenced in `prisma/schema.prisma` comments (`Measurement.bodyScoreId`/`bodyScoreData`). Safe to ignore or remove; do not assume it serves requests.

**`lib/` (business logic):**
- Purpose: All logic beyond simple parsing lives here — external API clients, Claude prompt construction, sync/orchestration services.
- Contains: Plain classes/functions and `getXClient()`/`getXService()` singleton factories. No subdirectories — flat file list.
- Key files: `lib/morpho.ts` (weekly pipeline), `lib/claude.ts` (all Claude prompts in one file).

**`prisma/`:**
- Purpose: Schema + migration history for the Postgres (Neon) database.
- Contains: `schema.prisma`, one migration folder per applied change (`prisma/migrations/20260629150333_init/` through `.../20260701134917_add_exercise_notes/`).
- Key files: `prisma/schema.prisma` — read this before touching any model; migration filenames are dated (`YYYYMMDDHHMMSS_description`), so the most recent one shows the latest schema change (`add_exercise_notes`, 2026-07-01).

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML shell, fonts, metadata.
- `proxy.ts`: Auth gate for every request (Next 16's replacement for `middleware.ts`).

**Configuration:**
- `tsconfig.json`: `@/*` → repo root path alias (used everywhere as `import ... from '@/lib/...'`).
- `next.config.ts`: Currently empty/default — no image domains, no redirects configured.
- `vercel.json`: Declares `framework: nextjs` and explicit build/dev/install commands.
- `.env` / `.env.local` (present, contents not inspected): expected vars include `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HEVY_API_KEY`, `JOURNAL_SANTE_API_URL`, `JOURNAL_SANTE_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `COACH_EMAIL_TO`, `COACH_EMAIL_FROM`, `APP_PASSWORD`, `AUTH_SECRET` (inferred from `lib/` usage, not from reading the files themselves).

**Core Logic:**
- `lib/morpho.ts`: The weekly analysis pipeline — read this first to understand the app's primary value proposition.
- `lib/claude.ts`: Every Claude prompt (photo, morphology, exercise-form, progress) lives in this one file.
- `prisma/schema.prisma`: Full data model with inline comments explaining non-obvious fields (e.g. `bodyScoreData`, `ExerciseNote`).

**Testing:**
- Not present. No `*.test.*`/`*.spec.*` files, no test runner config, no `__tests__` directories found anywhere in the repo.

## Naming Conventions

**Files:**
- Route handlers: always `route.ts` inside a folder named for the path segment (`app/api/exercise-notes/[id]/route.ts` → `DELETE /api/exercise-notes/:id`).
- Pages: always `page.tsx` inside a folder named for the route (`app/weekly/page.tsx` → `/weekly`).
- `lib/` modules: `kebab-case.ts` named after the integration or concern (`hevy-sync.ts`, `journal-sante.ts`, `exercise-notes.ts`). Note the inconsistent Hevy naming: the API client is `lib/heavy.ts` (typo-like, arguably intentional to avoid a name clash) while the sync service is `lib/hevy-sync.ts` — new Hevy-related code should still import from `lib/heavy.ts` for the client and `lib/hevy-sync.ts` for the sync service; don't rename without checking both.

**Directories:**
- `app/api/<feature>/<sub-action>/route.ts` mirrors REST-ish nesting (`api/analysis/weekly`, `api/journal/sync`).
- Dynamic segments use `[param]` (only current example: `app/api/exercise-notes/[id]`).

## Where to Add New Code

**New Feature (e.g. a new analysis type):**
- Page: new folder under `app/<feature>/page.tsx`, client component, `fetch()`-based data loading (match `app/weekly/page.tsx` pattern).
- API route: `app/api/<feature>/route.ts` (or nested `app/api/analysis/<feature>/route.ts` if it's another Claude-vision analysis, to match the existing `analysis/{photos,weekly,video}` grouping).
- Business logic: new `lib/<feature>.ts` — do not inline non-trivial logic in the route handler (see ARCHITECTURE.md Anti-Patterns).
- Schema: add a model to `prisma/schema.prisma`, then `npx prisma migrate dev --name <description>` to generate a new folder under `prisma/migrations/`.

**New External Integration:**
- API client: `lib/<service>.ts` with a `getXClient()` singleton factory reading its API key from `process.env` (match `lib/heavy.ts`/`lib/journal-sante.ts`).
- Sync/orchestration wrapper (if it writes to the DB): separate `lib/<service>-sync.ts` file, class-based, exposed via `getXSyncService()` (match `lib/hevy-sync.ts`/`lib/journal-sync.ts`).

**Utilities:**
- Small shared helpers with no external dependency (e.g. date math, formatting) currently live inline in whichever `lib/` file needs them (e.g. `startOfIsoWeek`/`weekKey`/`withTimeout` in `lib/morpho.ts`). If a helper becomes needed in more than one file, promote it to a new `lib/utils.ts` (does not exist yet — none of the current helpers are shared across files).

**New Claude prompt/analysis type:**
- Add a method to the `ClaudeClient` class in `lib/claude.ts` rather than creating a second Claude wrapper — every existing analysis type (photo, morphology, exercise-form, progress) is a method on this one class, all reusing `this.baseUrl`/`this.apiKey` and the same JSON-extraction pattern (`text.match(/\{[\s\S]*\}/)`).
- Remember the French-output requirement in the system prompt and the `DEFAULT_MODEL` constant (`claude-sonnet-4-6`) — do not hardcode a different/invalid model id per method.

## Special Directories

**`prisma/migrations/`:**
- Purpose: Historical SQL migration files, one per schema change, applied via `prisma migrate deploy` at build time (`scripts/vercel-build.sh`, also inlined into `package.json`'s `build` script).
- Generated: Yes (by `prisma migrate dev`), but committed to source control.
- Committed: Yes — do not delete or hand-edit past migrations; add new ones.

**`app/api/body-score/analysis/`:**
- Purpose: Empty leftover directory from an earlier "BodyScore AI" integration (see `bodyScoreId`/`bodyScoreData` fields still in `prisma/schema.prisma`, now repurposed for Hevy circumference data).
- Generated: No.
- Committed: Yes, but contains no files — treat as dead scaffolding.

**`.vercel/`:**
- Purpose: Vercel CLI project link metadata (`repo.json`, `README.txt`).
- Generated: Yes, by `vercel link`/CLI.
- Committed: Present in this repo snapshot but typically gitignored — verify `.gitignore` before assuming it's tracked.

**`.planning/`:**
- Purpose: GSD planning artifacts (roadmaps, specs, this codebase map) — not application code.
- Generated: Partially (by GSD tooling).
- Committed: Varies by subfolder; `.planning/codebase/` is the output of this mapping pass.

---

*Structure analysis: 2026-07-01*
