# External Integrations

**Analysis Date:** 2026-07-01

## APIs & External Services

**AI / Vision Analysis:**
- Anthropic Claude API - photo body-composition analysis, weekly morpho-anatomical analysis (3-photo set + Hevy training context), and exercise-form analysis from video keyframes
  - SDK/Client: none — raw `fetch` against `https://api.anthropic.com/v1/messages`, wrapped in `ClaudeClient` at `lib/claude.ts`
  - Auth: API key in `ANTHROPIC_API_KEY` env var, sent as `x-api-key` header (`anthropic-version: 2023-06-01`)
  - Model: `claude-sonnet-4-6` is the hardcoded default (`DEFAULT_MODEL` in `lib/claude.ts`); other valid ids in the `ClaudeModel` type are `claude-opus-4-8` and `claude-haiku-4-5-20251001`. A code comment explicitly warns `claude-sonnet-5` does not exist and 404s.
  - Methods used: `analyzePhoto` (single photo → body comp estimate, called from `app/api/analyze-photo`), `analyzeMorphology` (weekly 3-angle photo set + text context → segments/advice/progression, orchestrated by `lib/morpho.ts`), `analyzeExerciseForm` (ordered video keyframes → form score/cues, used by `app/api/analysis/video`), `analyzeProgress` (two photo sets → diff analysis)
  - Response parsing: all calls request "return ONLY valid JSON" and extract the first `{...}` match from the text response — no structured-output/tool-use API used
  - All Claude-facing prompts instruct the model to respond in French for user-facing text while keeping JSON keys in English

**Workout Data:**
- Hevy (workout-tracking app) public API v1 - source of truth for workouts, exercises, sets, and body measurements (weigh-ins + circumferences)
  - Docs: `https://api.hevyapp.com/docs/`
  - SDK/Client: none — raw `fetch`, wrapped in `HevyClient` at `lib/heavy.ts`
  - Auth: API key in `HEVY_API_KEY` env var, sent as `api-key` header
  - Endpoints used: `/workouts` (paginated, max page size 10, no date filter), `/workouts/{id}`, `/workouts/count`, `/workouts/events?since=` (incremental sync), `/exercise_templates` (page size up to 100), `/body_measurements`, `/user/info`
  - Sync orchestration: `lib/hevy-sync.ts` (`HevySyncService`) — `syncWorkouts` (last N days, default 30, delete+recreate per Hevy workout id for idempotency), `syncBodyMeasurements` (dedupes real weigh-ins by day, stores full circumference set in `Measurement.bodyScoreData`)
  - Triggered from: `app/api/hevy/*` routes (manual sync buttons) and automatically (time-boxed, non-blocking) at the start of `runWeeklyAnalysis` in `lib/morpho.ts`

**Nutrition & Activity Data:**
- Journal Santé (external, separately-deployed nutrition/activity tracking app — same author's other project) - source of meals, weight/circumference measurements, and estimated activity expenditure
  - SDK/Client: none — raw `fetch`, wrapped in `JournalSanteClient` at `lib/journal-sante.ts`
  - Base URL: `JOURNAL_SANTE_API_URL` env var (must end in `/api`; defaults to `http://localhost:3000/api` if unset — client tolerates a missing `https://` scheme and auto-prepends it)
  - Auth: bearer token in `JOURNAL_SANTE_SECRET` env var, sent as `Authorization: Bearer <secret>` (only added if the secret is set)
  - Endpoints used: `/meals` (GET/POST), `/meals/{id}`, `/measurements`, `/activity`, `/supplements`
  - Sync orchestration: `lib/journal-sync.ts` (`JournalSyncService`) — `syncMeasurements` (per-field carry-forward for omitted values, idempotent by Journal Santé record id, only persists last 30 days), `syncMeals` (idempotent by Journal Santé meal id, default 90-day window), `dailyEnergySummary`/`dailySummary` (computed on the fly, not persisted)
  - Individual meals are intentionally not part of `syncAll()` — only measurements sync automatically; meal sync is invoked separately (`app/api/journal/sync`, `app/api/nutrition/meals`)
  - Integration is optional/soft-fail: absent `JOURNAL_SANTE_API_URL` short-circuits nutrition-context building in `lib/morpho.ts` (`buildNutritionContext`) and skips the sync in `runWeeklyAnalysis`

## Data Storage

**Databases:**
- PostgreSQL (Neon, per project context) - primary data store for all app data (users, measurements, workouts/exercises/sets, meals, videos, progress photos, morpho analyses, exercise notes)
  - Connection: `DATABASE_URL` env var (read by Prisma directly from `prisma/schema.prisma`'s `datasource db` block — not referenced via `process.env` in application code)
  - Client: Prisma ORM `^5.22.0`, singleton client at `lib/prisma.ts` (global-cached in non-production to avoid connection exhaustion from hot-reload)
  - Migrations: `prisma/migrations/` (implied by standard Prisma layout); applied automatically via `prisma migrate deploy` as part of `npm run build` (see `package.json`)
  - Schema: `prisma/schema.prisma` — single-tenant-shaped models (`User` has no auth fields; see Authentication section) with a `userId` foreign key on every domain table

**File Storage:**
- Vercel Blob - progress photos (public URLs, path pattern `progress/{weekKey}/{angle}.jpg`, random suffix added)
  - SDK/Client: `@vercel/blob` `^2.5.0`, wrapped in `uploadProgressPhoto()` at `lib/blob.ts`
  - Auth: `BLOB_READ_WRITE_TOKEN`, auto-injected by Vercel once Blob storage is enabled for the project — not read explicitly via `process.env` anywhere in app code
  - Fallback: if the Blob upload fails, `lib/morpho.ts` falls back to storing an inline base64 `data:` URL so the analysis pipeline doesn't hard-fail
  - Video URLs (`Video.url` in schema) reference "Drive storage" per schema comments, but no Google Drive SDK/integration was found in `lib/` — likely stored via the same Blob mechanism or manually managed; worth confirming before building on this field

**Caching:**
- None - no Redis/Memcached or other cache layer detected

## Authentication & Identity

**Auth Provider:**
- Custom, single-user, shared-password auth (no per-user accounts, no OAuth/third-party identity provider)
  - Implementation: `lib/auth.ts` — `APP_PASSWORD` env var gates login (`checkPassword`, constant-time compare via `timingSafeEqual`); a successful login issues a signed session token (`<expiryEpochSeconds>.<hmac>`), HMAC-SHA256 signed with `AUTH_SECRET` env var
  - Token storage: httpOnly cookie named `coachia_session` (`SESSION_COOKIE` in `lib/auth.ts`), 30-day TTL (`SESSION_TTL_SECONDS`)
  - Session verification: `proxy.ts` (Next.js 16's renamed `middleware` convention, runs on the Node.js runtime) validates the cookie on every request except `/login` and `/api/auth/login`; unauthenticated API calls get 401, unauthenticated pages redirect to `/login`
  - Login/logout endpoints: `app/api/auth/login`, `app/api/auth/logout`
  - Data-model auth: there is no real multi-user auth — every sync/analysis writes under a single shared "system user" row, created/looked-up via `getOrCreateSystemUserId()` in `lib/system-user.ts` (upserts a `User` row with hardcoded email `system@example.com`). The `User` Prisma model itself has no password/session fields — it exists only as the FK target for domain data.

**OAuth Integrations:**
- None

## Monitoring & Observability

**Error Tracking:**
- None - no Sentry or similar error-tracking SDK detected

**Analytics:**
- None

**Logs:**
- `console.log`/`console.error` only, captured by Vercel's function logs (e.g. extensive `[Claude]`-prefixed logging in `lib/claude.ts`, `[morpho]`-prefixed logging in `lib/morpho.ts`)

## CI/CD & Deployment

**Hosting:**
- Vercel - Next.js app hosting, `vercel.json` sets explicit `buildCommand: npm run build`, `devCommand: npm run dev`, `installCommand: npm install`, `framework: nextjs`
- Deployment: direct push to `main` (no PR workflow per project context; no `.github/workflows/` found in the repo)
- Environment vars: configured in the Vercel project dashboard for production; `.env`/`.env.local` used locally (present but not committed/inspected)

**CI Pipeline:**
- None detected - no GitHub Actions or other CI config found

## Environment Configuration

**Required env vars (names only):**
- `DATABASE_URL` - Postgres connection string (Prisma)
- `ANTHROPIC_API_KEY` - Claude API
- `HEVY_API_KEY` - Hevy API
- `JOURNAL_SANTE_API_URL` - Journal Santé base URL (optional; nutrition sync/context no-ops if absent)
- `JOURNAL_SANTE_SECRET` - Journal Santé bearer token (optional; sent only if present)
- `RESEND_API_KEY` - Resend email (optional; email sending no-ops if absent)
- `COACH_EMAIL_TO` - destination address for weekly advice emails (optional; required alongside `RESEND_API_KEY` for email to actually send)
- `COACH_EMAIL_FROM` - sender address override (defaults to `Coach AI <onboarding@resend.dev>`)
- `APP_PASSWORD` - shared login password
- `AUTH_SECRET` - HMAC signing key for session tokens
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob (implicit, auto-provisioned by Vercel; not read explicitly in code)

**Secrets location:**
- Local: `.env` / `.env.local` (present in repo working tree, gitignored — contents not inspected here per security policy)
- Production: Vercel project environment variables dashboard

## Webhooks & Callbacks

**Incoming:**
- None detected - no `/api/webhooks/*` routes or signature-verification code found

**Outgoing:**
- None - all integrations above (Claude, Hevy, Journal Santé) are pulled/pushed synchronously by the app, not event-driven callbacks

---

*Integration audit: 2026-07-01*
*Update when adding/removing external services*
