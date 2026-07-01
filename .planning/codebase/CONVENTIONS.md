# Coding Conventions

**Analysis Date:** 2026-07-01

## Naming Patterns

**Files:**
- kebab-case-free, mostly single lowercase words for `lib/` modules: `lib/prisma.ts`, `lib/auth.ts`, `lib/morpho.ts`, `lib/hevy-sync.ts`, `lib/journal-sync.ts`, `lib/journal-sante.ts`, `lib/claude.ts`, `lib/claude-sync.ts`, `lib/system-user.ts`, `lib/exercise-notes.ts`, `lib/blob.ts`, `lib/email.ts`, `lib/mediapipe.ts`, `lib/profile.ts`. One outlier: `lib/heavy.ts` (should be `hevy.ts` — likely a typo, imported as `@/lib/heavy` from `lib/hevy-sync.ts`).
- Next.js App Router conventions drive most naming: every route folder under `app/` is `page.tsx` (UI) or `route.ts` (API handler); dynamic segments use `[id]` (`app/api/exercise-notes/[id]/route.ts`).
- No `*.test.ts` naming pattern exists — there are no test files in the repo.
- Root-level throwaway scripts/docs use SCREAMING_SNAKE or ad-hoc names (`DATABASE_SETUP.md`, `MEDIAPIPE_INTEGRATION.md`, `add-db-url.py`) — these are operational/setup notes, not part of the app's source conventions.

**Functions:**
- camelCase for all functions and methods: `getOrCreateSystemUserId`, `syncWorkouts`, `dailyEnergySummary`.
- Data-fetching functions in client components are named `fetch<Noun>` and called directly (not wrapped in a custom hook): `fetchWorkouts`, `fetchNotes`, `fetchMeasurements`, `fetchData`.
- Event handlers use `handle<Event>` prefix: `handleSubmit`, `handleLogout` (`app/login/page.tsx`, `app/page.tsx`).
- Service singletons are exposed via a `get<Service>Service()` factory that lazily instantiates and caches a module-level instance — see `getHevySyncService()` (`lib/hevy-sync.ts:163`), `getJournalSyncService()` (`lib/journal-sync.ts`), `getHevyClient()` (`lib/heavy.ts`), `getClaudeClient()` (`lib/claude.ts`).

**Variables:**
- camelCase for local variables and state.
- No `UPPER_SNAKE_CASE` module constants except a handful of true constants: `SESSION_COOKIE`, `SESSION_TTL_SECONDS` (`lib/auth.ts`), `PUBLIC_PATHS` (`proxy.ts`), `DAY_MS` (`lib/hevy-sync.ts`), `SYSTEM_USER_EMAIL` (`lib/system-user.ts`).
- No private-member prefix convention (no leading underscore) — classes use TypeScript `private` keyword instead (`private hevy = getHevyClient()` in `lib/hevy-sync.ts:9`).

**Types:**
- PascalCase interfaces, no `I` prefix: `Measurement`, `Workout`, `DailyEnergy` (`app/dashboard/page.tsx`), `ExerciseNote` (`app/workouts/page.tsx`).
- Client-side page components each redeclare their own local interfaces for API response shapes instead of importing shared types — e.g. `Workout` is independently defined in both `app/dashboard/page.tsx` and `app/workouts/page.tsx` with different field sets. There is no shared `types/` directory; Prisma-generated types (`@prisma/client`) are used directly in `lib/` and API routes instead.
- `type` imports use inline `type` keyword within the same import statement rather than a separate `import type` line: `import { getHevyClient, type HevyWorkout } from '@/lib/heavy'` (`app/api/analysis/weekly/route.ts:3`).

## Code Style

**Formatting:**
- No `.prettierrc` or Prettier dependency present — formatting is whatever the author/editor produces, not enforced by tooling.
- No semicolons in most `app/` and `lib/` TypeScript files (ASI style) — exception: `app/layout.tsx` uses semicolons throughout. This makes `app/layout.tsx` (largely untouched Next.js scaffold) stylistically inconsistent with the rest of the app.
- Single quotes for strings almost everywhere in application code.
- 2-space indentation.

**Linting:**
- ESLint 9 flat config (`eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Run via `npm run lint` (bare `eslint`, no path argument — lints whole repo per flat-config ignores).
- `npm run lint` is **not** part of `npm run build`, so lint errors do not block deploys.
- As of this analysis, running `npx eslint .` reports **26 problems (23 errors, 3 warnings)** across 9 files. This is pre-existing, tolerated debt — do not attempt to opportunistically fix unrelated files' lint errors as part of an unrelated change, but do not introduce new ones either. Breakdown:
  - `@typescript-eslint/no-explicit-any` (majority of errors): `app/api/workouts/route.ts:63`, `app/measurements/page.tsx:7`, `app/photos/page.tsx:26,77,125`, `app/video/page.tsx:106`, `app/weekly/page.tsx:70`, `app/workouts/page.tsx:26`, `lib/claude-sync.ts` (7 occurrences), `lib/journal-sante.ts:113`, `lib/mediapipe.ts:50,305`.
  - `react-hooks` "accessed before declared" errors where a `useEffect` calls a `fetch*` function defined later in the component body (hoisting/TDZ issue with `const` function expressions): `app/dashboard/page.tsx` (`fetchData`), `app/measurements/page.tsx` (`fetchMeasurements`), `app/workouts/page.tsx` (`fetchWorkouts`, `fetchNotes`).
  - `react/no-unescaped-entities`: `app/workouts/page.tsx:135` (apostrophe in French text).
  - `no-unused-vars` warnings: `app/api/analyze-photo/route.ts:2` (`getClaudeClient` imported but unused), `lib/mediapipe.ts:174` (`midPoint`).
  - `@next/next/no-img-element` warning: `app/photos/page.tsx:202` (raw `<img>` instead of `next/image`).
- When adding new `fetch*` helper functions called from `useEffect`, either declare them with `function` (hoisted) or move the `useEffect` call below the declaration to avoid adding to this list.

## Import Organization

**Order:**
1. `'use client'` directive (client components only) — always the first line, followed by a blank line.
2. React/Next core imports (`react`, `next/link`, `next/navigation`, `next/server`).
3. Internal `@/lib/*` and `@/` absolute imports.
4. No relative (`./`, `../`) imports observed within `app/` or `lib/` — everything internal goes through the `@/*` alias.

**Grouping:**
- No blank line separators are consistently used between import groups; imports are typically 2-4 lines total per file and just listed together.
- No enforced alphabetical sort (ESLint config does not include `import/order`).

**Path Aliases:**
- `@/*` maps to the project root (`tsconfig.json` → `"@/*": ["./*"]`), so `@/lib/prisma`, `@/lib/auth`, etc. Used exclusively over relative paths for cross-directory imports.

## Error Handling

**Patterns (API routes):**
- Every route handler wraps its body in `try { ... } catch (error) { ... }` and never lets exceptions propagate — see every file under `app/api/**/route.ts`.
- Errors are logged with `console.error('[API] <Context>:', error)` or a plainer `console.error('Error <doing x>:', error)`, then converted to a JSON error response via `NextResponse.json({ error, details? }, { status })`.
- Standard error body shape for mutation endpoints: `{ success: false, error: '<user-facing message>', details: error instanceof Error ? error.message : 'Unknown error' }`. Read endpoints often use a simpler `{ error: '<message>' }`.
- Common status codes: `400` for missing/invalid input or unknown `action`, `401` for auth failures (`proxy.ts`, `app/api/auth/login/route.ts`), `500` for unexpected/unhandled errors. No `404` convention observed (e.g. delete of a non-existent note still returns `{ success: true }` via `deleteMany`).
- `instanceof Error` narrowing is the standard way to safely extract a message from a caught `unknown`: `error instanceof Error ? error.message : 'Unknown error'` (repeated verbatim across `lib/journal-sync.ts`-backed routes and `lib/hevy-sync.ts`-backed routes).

**Patterns (client components):**
- Same `try/catch` + `console.error` shape, but user feedback is either silent (empty state falls back to `[]`), an `alert()` call (`app/page.tsx`, `app/workouts/page.tsx` `addNote`), or a `setError(...)` state string rendered inline (`app/login/page.tsx`).
- Optimistic UI updates roll back by re-fetching on failure rather than reverting local state manually: `deleteNote` in `app/workouts/page.tsx:85` removes the note from state immediately, then re-fetches from the server if the DELETE call fails.

## Logging

**Framework:** `console.log` / `console.error` only — no structured logging library (no `pino`, `winston`, etc.).

**Patterns:**
- Bracketed module tag prefix for traceability: `console.log('[Claude] Starting photo analysis...')` (`lib/claude.ts`), `console.error('[API] Hevy sync error:', error)` (`app/api/hevy/workouts/route.ts`). Use `[API]` in route handlers and `[ModuleName]` (e.g. `[Claude]`) in `lib/` service files.
- Verbose step-by-step `console.log` tracing is used liberally inside AI-integration code (`lib/claude.ts` logs image size, model, response status, parsed result at nearly every step) — this is intentional for debugging the Claude Vision integration in production logs (Vercel), since there is no APM/tracing tool.
- No log levels beyond `log`/`error`/`warn` — no `debug`/`info` distinction.

## Comments

**When to Comment:**
- Comments explain *why*, especially for non-obvious business/data-model decisions, e.g.: `// ExerciseSet requires BOTH exerciseId AND workoutId (non-null)...` (`app/api/workouts/route.ts:39-41`), `// Hevy's /workouts has no date filter — fetch all pages...` (`lib/hevy-sync.ts:17-18`), `// Re-sync is idempotent AND self-healing...` (`lib/hevy-sync.ts:56-57`).
- Module-header comments explain the overall design/security model at the top of key files: `proxy.ts:5-7` (why `proxy` replaces `middleware` in Next 16), `lib/auth.ts:3-5` (single-user auth model), `lib/system-user.ts:6-11` (JSDoc explaining the system-user placeholder).
- French-language UI copy is standard (this is a French-language app); code comments and identifiers are in English.

**JSDoc/TSDoc:**
- Used sparingly, only on a handful of exported helper functions with non-obvious contracts: `lib/auth.ts` (`safeEqual`, `createSessionToken`, `isValidSessionToken`, `checkPassword`, `isAuthConfigured` all have one-line `/** ... */` docblocks), `lib/system-user.ts` (`getOrCreateSystemUserId`). Not used on API route handlers or React components.

**TODO Comments:**
- No `TODO(username)` convention. Forward-looking caveats are written as plain narrative comments instead, e.g. `NOTE: this is a single-user placeholder until real authentication is added` (`lib/system-user.ts:9`).

## Function Design

**Size:**
- API route handlers are typically 15-50 lines; page components are 100-300 lines (all UI + all fetch logic + all handlers in one default-exported function component — no extraction into smaller sub-components).
- `lib/` service classes (e.g. `HevySyncService`) keep individual methods focused (single sync operation) but the file as a whole can be large due to nested transaction logic.

**Parameters:**
- Route handlers follow the Next.js signature exactly: `(request: Request)` or, for dynamic routes, `(request: Request, { params }: { params: Promise<{ id: string }> })` — note `params` is a `Promise` (Next 16 breaking change) and must be `await`ed, e.g. `const { id } = await params` (`app/api/exercise-notes/[id]/route.ts:7`).
- Options are passed as a single object when there is more than one, e.g. `syncWorkouts(options?: { days?: number })`.

**Return Values:**
- API handlers always return `NextResponse.json(...)`, never a raw object or `undefined`.
- Guard clauses return early on invalid input, e.g. `if (!userId || !name) return NextResponse.json({ error: '...' }, { status: 400 })` (`app/api/workouts/route.ts:35-37`).

## Module Design

**Exports:**
- `lib/` modules mix a default export and a named export for the same value in one case: `lib/prisma.ts` exports both `export default prismaClient` and `export { prismaClient as prisma }`. Consuming code is inconsistent as a result — some files `import prisma from '@/lib/prisma'` (default), others `import { prisma } from '@/lib/prisma'` (named). Both work today; prefer the named `{ prisma }` import for new code since it is the more common form in `app/api/**`.
- Otherwise, named exports are standard for functions/classes/constants (`export function`, `export class`, `export const`).
- React pages/components use `export default function ComponentName()` — the Next.js App Router requirement for `page.tsx`.

**Barrel Files:**
- No barrel/index files anywhere in `app/` or `lib/` — every module is imported directly by its file path.

---

*Convention analysis: 2026-07-01*
*Update when patterns change*
