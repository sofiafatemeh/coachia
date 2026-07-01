# Codebase Concerns

**Analysis Date:** 2026-07-01

## Tech Debt

**Single shared "system user", no real auth/multi-tenancy:**
- Issue: Every sync/analysis writes under one hardcoded user (`system@example.com`), created via `upsert` in `getOrCreateSystemUserId()`. The whole app is gated by one shared password, not per-user accounts.
- Files: `lib/system-user.ts`, `lib/auth.ts`, `proxy.ts`
- Why: Deliberate solo-project simplification (confirmed in code comment: "single-user placeholder until real authentication is added").
- Impact: There is no user isolation. `app/api/users/route.ts` and the `User` model still exist as if multi-user were supported, but nothing in the app actually creates a second user or scopes data by session identity — only by this one system user. If this app is ever opened to more than one person, every data model, API route, and the auth layer needs rework, not just the auth gate.
- Fix approach: Not urgent for solo use. If multi-user is ever needed, replace `checkPassword`/session-cookie auth with per-user credentials, replace `getOrCreateSystemUserId()` calls (used in nearly every `lib/*-sync.ts` and API route) with the authenticated request's user id.

**Local development runs against the production database:**
- Issue: `.env` and `.env.local` (gitignored, confirmed not tracked via `git ls-files`) contain the real Neon `DATABASE_URL`/`POSTGRES_URL*` pulled straight from Vercel via `vercel env pull`. There is no separate local/dev Postgres instance — `npm run dev` reads and writes the same Neon database as the deployed app.
- Files: `.env`, `.env.local`, `lib/prisma.ts` (single `PrismaClient` from `DATABASE_URL`, no env-based branching)
- Why: Deliberate solo-project tradeoff (documented in `DATABASE_SETUP.md` / `NEON_SETUP.md` as the chosen path), avoids running/maintaining a second Postgres instance.
- Impact: Any local experiment, seed script, or manual `psql`/Prisma Studio session mutates real production data (measurements, workouts, morpho analyses, emailed advice history). `npm run build` also runs `prisma migrate deploy` automatically (see `package.json` `build` script and `scripts/vercel-build.sh`), so a schema change tested locally against this same DB is the same migration that will apply in production on next deploy — there is no staging gate.
- Fix approach: If a mistake-prevention layer is wanted, provision a separate Neon branch/project for local dev and point `.env.local` at it, or use Neon's branching feature to fork prod data into an isolated dev branch.

**Push-directly-to-main with no CI gate:**
- Issue: Workflow is push to `main` → Vercel auto-deploys. No PR review, no required checks, `npm run build` does not run lint or tests (only `prisma migrate deploy && prisma generate && next build`).
- Files: `package.json` (`build` script), `scripts/vercel-build.sh`, `vercel.json`
- Why: Solo project, fast iteration is prioritized (confirmed in `REPRISE.md`: "Workflow actuel : push direct sur main").
- Impact: A broken migration, a bad Claude prompt change, or a lint-worthy `any`-typed bug ships straight to production with no automated check beyond `next build` compiling. Migrations in particular run unconditionally on every deploy — a destructive migration would apply to the live DB without a manual approval step.
- Fix approach: Not necessarily wrong for a solo app; if desired, add a lightweight `vercel-build` pre-check (e.g. `npm run lint` non-blocking, or a `prisma migrate diff` sanity check) before `migrate deploy`.

**~26 pre-existing ESLint problems (23 errors, 3 warnings), not enforced anywhere:**
- Issue: `npm run lint` (`eslint`) is not invoked by `npm run build`, so these are silently accepted. Confirmed via `npx eslint .`:
  - `@typescript-eslint/no-explicit-any` (bulk of the errors): `lib/claude-sync.ts` (7×, lines 15/90/114/151/152/155/156), `lib/journal-sante.ts:113`, `lib/mediapipe.ts:50,305`, `app/api/workouts/route.ts:63`, `app/photos/page.tsx:26,77,125`, `app/video/page.tsx:106`, `app/weekly/page.tsx:70`, `app/workouts/page.tsx:26`, `app/measurements/page.tsx:7`
  - `react-hooks` temporal-dead-zone violations ("`fetchX` accessed before it is declared" in a `useEffect`): `app/dashboard/page.tsx:40` (`fetchData`), `app/measurements/page.tsx:17` (`fetchMeasurements`), `app/workouts/page.tsx:35-36` (`fetchWorkouts`, `fetchNotes`) — these work at runtime (function hoisting inside the same render via closures) but are flagged by the newer `eslint-plugin-react-hooks` rule set.
  - `react/no-unescaped-entities`: one JSX apostrophe issue (surfaced from `app/workouts/page.tsx` per the exercise-notes UI).
  - Unused vars: `app/api/analyze-photo/route.ts:2` (`getClaudeClient` imported but unused), `lib/mediapipe.ts:174` (`midPoint`).
- Impact: None currently blocking; type safety is weaker than it looks in the files above (external API responses and DB `Json` fields cast through `any`).
- Fix approach: Out of scope for unrelated work per project convention. If ever addressed, tackle the `no-explicit-any` cases in `lib/claude-sync.ts` first (weakest typing, used across measurement history/progress calculations).

**Duplicate photo-analysis endpoints with copy-pasted compression logic:**
- Issue: Two separate API routes both ultimately call `ClaudeSyncService.analyzePhoto()`: `app/api/analyze-photo/route.ts` (multipart file upload) and `app/api/analysis/photos/route.ts` (JSON body with `imageUrl` or base64). Both are actively used by `app/photos/page.tsx` (file-upload path uses the former, URL-entry path uses the latter), so this is not dead code, but the two routes each define their own nearly-identical `compressImage`/buffer handling instead of sharing one.
- Files: `app/api/analyze-photo/route.ts`, `app/api/analysis/photos/route.ts`, `lib/claude-sync.ts`
- Impact: A fix to compression quality, error messages, or size limits must be applied in two places; they have already drifted slightly (only `analysis/photos` logs compression-ratio details).
- Fix approach: Extract a shared `compressToBase64`-style helper (the pattern already used in `lib/morpho.ts` and `app/api/analysis/video/route.ts`) into a common module and have both routes call it.

**Dead MediaPipe integration still shipped as a dependency:**
- Issue: `lib/mediapipe.ts` (328 lines: `MediaPipeClient`, `PoseAnalyzer`, angle/tempo/symmetry/bar-path calculators) is not imported by any other file in `app/` or `lib/` — confirmed via `grep -rn "from '@/lib/mediapipe'"` returning nothing. The three `@mediapipe/*` npm packages (`camera_utils`, `drawing_utils`, `pose`) in `package.json` `dependencies` are unused; the actual video-analysis feature (`/video` page → `app/api/analysis/video/route.ts`) sends raw Claude Vision keyframes instead of MediaPipe pose data.
- Files: `lib/mediapipe.ts`, `package.json` (dependencies), `MEDIAPIPE_INTEGRATION.md`
- Why: Earlier implementation approach, superseded by the simpler direct-to-Claude-Vision video analysis (see `fc6deab`/`1dc03c5` commits) without removing the old code/deps.
- Impact: `MEDIAPIPE_INTEGRATION.md` at the repo root documents `lib/mediapipe-sync.ts`, which no longer exists — the doc is misleading if read as current. The unused deps add install size/build time for no runtime benefit.
- Fix approach: Delete `lib/mediapipe.ts`, `MEDIAPIPE_INTEGRATION.md`, and the three `@mediapipe/*` deps unless pose-based video analysis is planned again.

**Root-level clutter: one-off setup scripts and stale docs committed alongside the app:**
- Issue: Several ad-hoc Python/shell scripts and narrative markdown docs live at the repo root next to `app/`/`lib/`: `add-db-url.py`, `create-neon-db.py`, `check-schema.sh`, `setup-neon.py`, `setup-neon-auto.sh`, `update-hevy-schema.py`, plus `DATABASE_SETUP.md`, `DATABASE_SETUP_COMPLETE.md`, `NEON_SETUP.md`, `VERCEL_POSTGRES_SETUP.md`, `CLAUDE_INTEGRATION.md`, `MEDIAPIPE_INTEGRATION.md`, `JOURNAL_SANTE_INTEGRATION.md`, `TEST_RESULTS.md`, `VALIDATION.md`.
- Files: repo root (see file list above)
- Why: Accumulated one-off setup/migration helpers and "done" reports written during earlier development sessions; never cleaned up.
- Impact: `DATABASE_SETUP.md` documents three alternative DB providers (Vercel Postgres, local Postgres, Neon) as if all were live options, but Neon is the only one actually in use (per `.env` and `REPRISE.md`) — a future contributor reading it could set up the wrong thing. `TEST_RESULTS.md`/`VALIDATION.md` read as point-in-time reports, not living documentation, and can go stale silently.
- Fix approach: `REPRISE.md` already flags "Réorganiser avec GSD pour un git propre" as the next step — this cleanup is the natural place to prune or archive these files.

**Duplicated request/parse/error-handling boilerplate across `ClaudeClient` methods:**
- Issue: `analyzePhoto`, `analyzeMorphology`, `analyzeExerciseForm`, and `analyzeProgress` in `lib/claude.ts` each independently build the `fetch` call to `https://api.anthropic.com/v1/messages`, check `response.ok`, extract `data.content[0]?.text`, regex-match `\{[\s\S]*\}` for JSON, and `JSON.parse` it — with no shared helper.
- Files: `lib/claude.ts` (all four methods, ~550 lines total)
- Impact: A fix to JSON-extraction robustness (e.g. handling a response with no JSON, or Claude wrapping JSON in markdown fences) must be applied in up to four places; already inconsistent (e.g. `analyzePhoto`'s error branch does `await response.json()` unguarded while `analyzeMorphology`/`analyzeExerciseForm`/`analyzeProgress`'s error branches sometimes do and sometimes don't `.catch(() => ({}))`).
- Fix approach: Extract a shared `callClaude(systemPrompt, content, {model, maxTokens})` + `extractJson(text)` helper.

## Known Bugs

No functionally-reproducible bugs were found in the current `main` (the two most recent bug-shaped commits — `6c62581` time-boxing the weekly sync, and `7ea595d` Blob-storage-misconfig fallback — are already fixed forward on `main`). The items below are lint-level issues, not confirmed runtime bugs; see Tech Debt for detail:
- The `react-hooks` "accessed before declared" warnings in `app/dashboard/page.tsx`, `app/measurements/page.tsx`, and `app/workouts/page.tsx` do not currently break anything (JS function-expression hoisting inside the component body plus `useEffect`'s deferred execution means the function exists by the time the effect runs), but they are fragile to refactor — reordering the `useEffect` above the function declaration, or converting the function to an arrow assigned via `const` evaluated lazily, could introduce a real "cannot access before initialization" TDZ crash. Treat these as "don't reorder without testing" rather than "broken today."

## Security Considerations

**No rate limiting or lockout on the login endpoint:**
- Risk: `app/api/auth/login/route.ts` checks the submitted password against `APP_PASSWORD` with `checkPassword()` (constant-time compare via `timingSafeEqual` in `lib/auth.ts`, which is good — no timing side-channel), but there is no attempt counter, backoff, or IP-based throttling. Since this one password gates 100% of the app's data (all photos, measurements, workouts, morpho/video analyses), an attacker with network access to the deployed URL can attempt unlimited password guesses.
- Files: `app/api/auth/login/route.ts`, `lib/auth.ts`
- Current mitigation: HMAC-signed session cookie (`AUTH_SECRET`), `httpOnly`/`sameSite=lax`/`secure`-in-production cookie flags, constant-time password comparison. `proxy.ts` fails closed (denies) if `AUTH_SECRET` is missing.
- Recommendations: If the app is ever exposed beyond trusted personal use, add a simple in-memory or Vercel KV-backed rate limit (e.g. N failed attempts per IP per window) to `app/api/auth/login/route.ts`.

**All production secrets live in plaintext `.env`/`.env.local` at the repo root:**
- Risk: `.env` (confirmed present, 3378 bytes) contains the real `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, Neon project/auth identifiers, and (per `REPRISE.md`) `ANTHROPIC_API_KEY`, `HEVY_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `APP_PASSWORD`, `AUTH_SECRET` are all configured as Vercel env vars and pulled locally the same way. Both files are correctly excluded via `.gitignore` (`.env*` is git-ignored; confirmed `git ls-files | grep -i env` returns nothing), so they are not committed — but they exist unencrypted on the local filesystem and are refreshed via `vercel env pull`, which by design writes production values to disk.
- Files: `.env`, `.env.local`
- Current mitigation: `.gitignore` correctly blocks all `.env*` variants and `.env` explicitly.
- Recommendations: No action needed for the gitignore itself; just be aware that any local tooling/scripts run in this repo have access to live production credentials (Anthropic, Hevy, Resend, Blob, DB) — treat the local dev machine with the same care as a production credential store.

**No CSRF protection beyond `sameSite=lax`:**
- Risk: State-changing endpoints (`/api/analysis/*`, `/api/journal/sync`, etc.) rely solely on the session cookie plus `sameSite=lax` for protection; there is no CSRF token. `sameSite=lax` blocks most cross-site POST forgeries but not all vectors (e.g. some GET-based state changes — note `app/api/journal/sync/route.ts`'s `GET` handler literally calls `POST()`, so a simple cross-site `<img>`/link GET to `/api/journal/sync` while authenticated would trigger a sync).
- Files: `app/api/journal/sync/route.ts` (`GET` aliases `POST`), `proxy.ts`
- Current mitigation: `sameSite=lax` cookie, single-user low-value target (worst case is an unwanted data sync, not data exfiltration or destructive action).
- Recommendations: Low priority given the single-user/low-stakes nature of a sync-only side effect; if state-changing actions with real consequences are added, don't alias mutating handlers under `GET`.

## Performance Bottlenecks

**Inconsistent/no `maxDuration` on Claude Vision routes vs. their sibling routes:**
- Problem: `app/api/analysis/weekly/route.ts` and `app/api/analysis/video/route.ts` explicitly set `export const maxDuration = 120` (matching Vercel's function timeout to the slow Claude Vision + multi-image work they do), and `app/api/journal/sync/route.ts` sets `maxDuration = 60`. `app/api/analyze-photo/route.ts` and `app/api/analysis/photos/route.ts` do the same class of work (fetch/compress an image, call Claude Vision, parse JSON) but declare no `maxDuration` at all, falling back to the Vercel/Next.js platform default.
- Files: `app/api/analyze-photo/route.ts`, `app/api/analysis/photos/route.ts` (missing) vs. `app/api/analysis/weekly/route.ts`, `app/api/analysis/video/route.ts` (present)
- Cause: These two routes were written earlier (per `git log`, `cfaa2e5`/`d530969`/`76eb72e`) before the `maxDuration` pattern was adopted in the weekly/video routes.
- Improvement path: Add `export const maxDuration = 120` to both routes for consistency with the rest of the Claude Vision call sites, so behavior doesn't depend on whatever the platform default happens to be for the current Vercel plan.

**`runWeeklyAnalysis` has no per-call timeout around the Claude morphology request itself:**
- Problem: The Hevy/Journal Santé auto-sync inside `runWeeklyAnalysis` (`lib/morpho.ts`) is deliberately time-boxed to 12s (`Promise.race` with a `setTimeout`, per commit `6c62581`), but the subsequent `claude.analyzeMorphology(...)` call (the actual multi-image Vision request) has no timeout wrapper — it can run for the full remainder of the route's 120s `maxDuration` budget. If it hangs, the whole request (including the already-uploaded photos and DB writes for them) is lost, and Vercel returns a 504 to the client with no partial persistence of the analysis or fallback email.
- Files: `lib/morpho.ts` (`runWeeklyAnalysis`, step 3 "Morpho analysis")
- Cause: Time-boxing was applied to the sync step (the part that previously caused timeouts, per the commit message "time-box weekly analysis syncs so it never times out before the email") but not to the Claude call itself.
- Improvement path: Wrap `claude.analyzeMorphology(...)` in a shorter explicit timeout (e.g. 90s) with a clear error message, or persist the uploaded photos/context before calling Claude so a Vision-side failure doesn't lose that work.

## Fragile Areas

**External Journal Santé integration has no per-request timeout, only error-message clarity:**
- Files: `lib/journal-sante.ts` (`JournalSanteClient.request`), `lib/journal-sync.ts`
- Why fragile: `request()` calls `fetch(url, ...)` with no `AbortController`/timeout. If Journal Santé (a separate deployed app, `journal-sante-omega.vercel.app`) is unreachable, the `catch` block produces a clear French error message naming the URL and suggesting the `JOURNAL_SANTE_API_URL` env var is misconfigured (good UX for that failure mode) — but if it's merely *slow* (not down), the fetch can hang until the surrounding route's `maxDuration` kills the whole function, rather than failing fast with a distinguishable "Journal Santé timed out" message.
- Common failures: Confirmed by git history — `91247ad` ("clearer Journal Santé fetch errors + tolerate missing URL scheme") and `6a3812c` ("batch Journal Santé sync to avoid function timeout") show this integration has already caused production timeouts once.
- Safe modification: The nutrition/energy context builder in `lib/morpho.ts` (`buildNutritionContext`) already wraps its Journal Santé call in the local `withTimeout()` helper (8s) so a slow Journal Santé never blocks the weekly analysis — this pattern is not applied to `app/api/journal/sync/route.ts` or `app/api/journal/energy/route.ts`, which call the client directly with no timeout.
- Test coverage: None (no test suite exists in this repo at all — see Test Coverage Gaps).

**Claude API error handling is "throw and 500", with no retry, partial-result handling, or model-fallback:**
- Files: `lib/claude.ts` (all four analysis methods), consumed by `app/api/analysis/weekly/route.ts`, `app/api/analysis/video/route.ts`, `app/api/analyze-photo/route.ts`, `app/api/analysis/photos/route.ts`
- Why fragile: Any Claude API error (rate limit, 5xx, invalid model id, malformed JSON in the response) propagates as a thrown `Error` all the way to the route handler, which catches it and returns a generic 500 with `error.message`. There is no retry-on-5xx/rate-limit, no fallback model, and no distinction between "Claude is down" vs "Claude returned unparseable JSON" in the HTTP status returned to the client (both are 500).
- Common failures: A model-id typo previously caused every Vision call to 404 in production (see commit `50a334b` "fix: use valid Claude model id claude-sonnet-4-6 for Vision") — this class of failure (bad model constant) is a single-point-of-failure hardcoded in `DEFAULT_MODEL` in `lib/claude.ts` with no runtime validation against Anthropic's actual model list.
- Safe modification: Any change to `DEFAULT_MODEL` or the JSON-extraction regex (`content.match(/\{[\s\S]*\}/)`) affects all four analysis flows at once; verify all four (photo, morpho, video-form, progress) after any change to `lib/claude.ts`.
- Test coverage: None.

**Hevy sync silently drops per-workout failures into a counter, not a surfaced error:**
- Files: `lib/hevy-sync.ts` (`syncWorkouts`, `syncBodyMeasurements`)
- Why fragile: Both loops `catch` per-item errors, `console.error` them, and increment an `errors` count that's returned in the response body (`{ total, synced, errors, message }`) — callers that don't inspect the JSON body (e.g. the auto-sync inside `runWeeklyAnalysis`, which only logs via `.catch()`) will never surface a partial-sync failure to the user. A systematically-failing sync (e.g. a schema mismatch on one field) could silently under-sync for a long time before being noticed.
- Common failures: None observed currently, but the pattern (swallow-and-count) means a regression here fails quietly rather than loudly.
- Safe modification: When editing `syncWorkout`/`syncBodyMeasurements`, check the returned `errors` count in Vercel logs after deploying, since the API contract won't surface it in the UI.
- Test coverage: None.

## Scaling Limits

**Neon free/starter tier + Vercel serverless function timeouts:**
- Current capacity: Not measured directly (no load testing present), but the architecture (per-request Prisma queries, no caching/read-replicas, single shared Neon connection string with both pooled `DATABASE_URL` and `DATABASE_URL_UNPOOLED` present in `.env`) is sized for single-user, low-concurrency traffic.
- Limit: `maxDuration = 120` on the two Claude Vision + multi-source-sync routes (`weekly`, `video`) is already near typical Vercel Pro plan ceilings; any additional slow step (larger photos, more Hevy history, more Journal Santé data) risks hitting the ceiling again, as has already happened twice (`6a3812c`, `6c62581`).
- Scaling path: Not a near-term concern for a single-user app; if usage grows, move the Hevy/Journal Santé sync out of the request path entirely (e.g. a scheduled Vercel Cron job that keeps the DB warm, so `runWeeklyAnalysis` never needs to sync inline).

## Dependencies at Risk

**`@mediapipe/camera_utils`, `@mediapipe/drawing_utils`, `@mediapipe/pose`:**
- Risk: Unused (see Tech Debt — `lib/mediapipe.ts` is dead code with no importers). Not a "breaking" risk, just dead weight.
- Impact: Larger `node_modules`/install time for zero runtime benefit; a future contributor may assume MediaPipe pose analysis is active when it is not.
- Migration plan: Remove the three packages and `lib/mediapipe.ts` together, or revive the integration if pose-based analysis is wanted again.

**Hardcoded Claude model ids with no runtime validation:**
- Risk: `DEFAULT_MODEL` and the `ClaudeModel` union type in `lib/claude.ts` (`claude-sonnet-4-6`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`) are free-text string literals sent directly to Anthropic's API with no local validation — if Anthropic deprecates/renames a model, every analysis flow 404s until the constant is manually updated (already happened once, commit `50a334b`).
- Impact: Total outage of all four AI analysis features (photo, morpho, video, progress) simultaneously, since they all default to the same `DEFAULT_MODEL`.
- Migration plan: No SDK is used (raw `fetch` to `https://api.anthropic.com/v1/messages`), so there's no compile-time model-id checking available; the only mitigation is manual vigilance when Anthropic ships model changes.

## Missing Critical Features

**No automated tests of any kind:**
- Problem: There is no test runner configured (no `jest.config.*`, `vitest.config.*`, `playwright.config.*`), no `test` script in `package.json`, and `find . -iname "*.test.*" -o -iname "*.spec.*"` returns nothing across the whole repo.
- Blocks: Every change (schema migration, Claude prompt tweak, sync logic change) is verified only by manual click-through or by trusting `next build` to catch type errors. The REPRISE.md handoff notes mention verifying the visual theme "via Playwright headless en local" as an ad hoc one-off, not a committed test.
- Current workaround: Manual testing in production (push to `main`, watch Vercel deploy, click through the live app) — accepted for a solo project via the documented push-direct workflow.

## Test Coverage Gaps

**Entire codebase (100% of `app/` and `lib/`):**
- What's not tested: Everything — auth token signing/verification (`lib/auth.ts`), Hevy sync idempotency/dedup logic (`lib/hevy-sync.ts`), Journal Santé carry-forward logic (`lib/journal-sync.ts`), Claude response parsing (`lib/claude.ts`), the weekly analysis pipeline (`lib/morpho.ts`).
- Risk: `lib/auth.ts`'s `isValidSessionToken`/`safeEqual`/`createSessionToken` are exactly the kind of small, pure, security-critical functions that are cheap to unit-test and expensive to get wrong silently; `lib/journal-sync.ts`'s per-field carry-forward logic (`carried.weight = m.weightKg ?? carried.weight`, etc.) is subtle enough that a regression could silently corrupt historical measurement data without any test catching it.
- Priority: High for `lib/auth.ts` (security-critical, small surface, easy to test) and `lib/journal-sync.ts` (data-integrity-critical carry-forward logic); Medium for the Claude JSON-parsing paths in `lib/claude.ts`; Low for UI pages.
- Difficulty to test: `lib/auth.ts` is trivial to unit test (pure functions, deterministic). `lib/journal-sync.ts`/`lib/hevy-sync.ts` need a test DB or Prisma mocking. `lib/claude.ts`/`lib/morpho.ts` need HTTP mocking (`fetch`) since there's no Anthropic SDK abstraction to mock against — would require intercepting global `fetch`.

---

*Concerns audit: 2026-07-01*
*Update as issues are fixed or new ones discovered*
