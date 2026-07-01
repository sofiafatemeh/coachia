# Testing Patterns

**Analysis Date:** 2026-07-01

## Test Framework

**Runner:**
- None. There is no test runner installed or configured. `package.json` has no `test` script, and no `jest`, `vitest`, `mocha`, or similar package appears in `dependencies`/`devDependencies`.
- No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` file exists anywhere in the repo.
- `@playwright/test` appears only as a transitive entry deep in `package-lock.json` (not a direct dependency, not present in `node_modules/@playwright`) — it is pulled in indirectly by tooling, not something this project's code depends on or is set up to use.

**Assertion Library:**
- Not applicable — no test files exist to assert anything.

**Run Commands:**
```bash
npm run dev      # Start dev server (used for manual verification)
npm run lint     # ESLint only — no test execution
npm run build    # prisma migrate deploy && prisma generate && next build — no test step
```
There is no `npm test` / `npm run test` command. Running `npm test` in this repo fails with "missing script: test".

## Test File Organization

**Location:** Not applicable.

**Naming:** Not applicable — confirmed via repo-wide search: zero files matching `*.test.*` or `*.spec.*` under `app/`, `lib/`, `prisma/`, or `scripts/`.

**Structure:**
```
No test directory or co-located test files exist. Structure is:
app/            # pages + API routes, no tests alongside
lib/            # service/helper modules, no tests alongside
prisma/         # schema + migrations + seed.ts, no tests
scripts/        # vercel-build.sh, no tests
```

## Test Structure

Not applicable — no test suite exists to describe a suite-organization pattern for.

## Mocking

Not applicable — no mocking framework or usage found (no `vi.mock`, `jest.mock`, `sinon`, or hand-rolled test doubles in the codebase).

## Fixtures and Factories

- `prisma/seed.ts` (run via `npm run seed` → `tsx prisma/seed.ts`) exists to seed the database with initial/demo data for manual use, but this is a data-seeding script for running the app, not a test fixture factory. Read this file before assuming any "test data" exists — it seeds real dev/prod-adjacent data, not throwaway test rows.

## Coverage

**Requirements:** None. No coverage tool, no coverage script, no threshold enforced anywhere (no CI config found in the repo to enforce one either — deploys go straight to Vercel on push).

## Test Types

**Unit Tests:** Not used.

**Integration Tests:** Not used.

**E2E Tests:** Not used as an automated, checked-in suite. Verification of app behavior is done **manually**, via a bundled agent "run" skill that starts the Next.js dev server and drives it with Playwright to take screenshots for visual/manual review — this is an ephemeral, interactive verification aid (not part of the repo, not invoked by `npm test`, and it produces no checked-in test files or assertions). Do not treat its use as equivalent to an automated regression suite: nothing prevents a regression from shipping silently.
- `TEST_RESULTS.md` (repo root) is a manually-authored log of one deployment's smoke-test notes (curl commands run by hand against the deployed Vercel URL after a specific deploy) — historical notes, not a repeatable test file, and likely stale relative to current routes.

## Common Patterns

Not applicable — there is no async testing, error testing, or snapshot testing pattern to document, since no test files exist.

## Recommendations if Adding Tests

Since this is a solo Next.js 16 project with App Router pages/API routes and a Prisma-backed Postgres database, the lowest-friction way to introduce a real automated suite would be:
- **Unit/integration tests for `lib/*.ts` service modules** (`lib/auth.ts`, `lib/hevy-sync.ts`, `lib/journal-sync.ts`, etc.) using Vitest — these are plain TypeScript functions/classes with clear inputs/outputs, decoupled from React, and are the highest-value/lowest-effort target (e.g. `lib/auth.ts`'s `isValidSessionToken`/`checkPassword`/`createSessionToken` are pure and security-critical, and currently have zero coverage).
- **API route tests** would need either a Next.js route-handler test harness (calling the exported `GET`/`POST` functions directly with a mocked `Request`) or a running dev server + `fetch` — the former is simpler given no test infra exists yet.
- **E2E** could formalize the existing manual Playwright-screenshot workflow into a checked-in `playwright.config.ts` + `e2e/*.spec.ts` suite, but this is a bigger lift and lower priority than unit coverage on `lib/auth.ts` and the Hevy/journal sync logic, which currently have the most complex, most failure-prone logic (transactions, idempotent re-sync, external API calls) and zero verification beyond manual dev-server checks.

---

*Testing analysis: 2026-07-01*
*Update when test patterns change*
