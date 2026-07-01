# Architecture Research

**Domain:** Extending an existing single-user Next.js/Prisma fitness-coaching app with (1) goal/progress tracking UI and (2) reference-book RAG injected into existing Claude prompt pipelines
**Researched:** 2026-07-01
**Confidence:** HIGH (component boundaries, derived from direct codebase read) / MEDIUM (RAG storage/embedding choices, verified via web search, no Context7 available for Prisma/pgvector specifics)

## Standard Architecture

### System Overview — where the two features sit in the existing system

```
┌─────────────────────────────────────────────────────────────────────────┐
│  app/goals/page.tsx (NEW)          app/dashboard/page.tsx (existing,     │
│  gauge/chart per goal               + small "goals" summary section)    │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                 │ fetch()                       │ fetch()
                 ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  app/api/goals/route.ts (NEW)        app/api/goals/[id]/route.ts (NEW)  │
│  GET (list+progress), POST create     PATCH/DELETE                     │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ calls into
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  lib/goals.ts (NEW)                                                     │
│  CRUD on Goal model + computeGoalProgress() reading Measurement/         │
│  Workout/ExerciseSet — NO duplicated "current value" storage             │
└───────────────┬───────────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Prisma / Neon Postgres — new `Goal` model + EXISTING Measurement,       │
│  Workout, Exercise, ExerciseSet (read-only for progress computation)     │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  OFFLINE / one-off (NOT a request-time route):                           │
│  scripts/ingest-book.ts (NEW) — PDF → text → chunks → Voyage embeddings  │
│  → BookChunk rows                                                        │
└───────────────┬───────────────────────────────────────────────────────┘
                 ▼ writes once per book
┌─────────────────────────────────────────────────────────────────────────┐
│  Prisma / Neon Postgres — new `BookChunk` model (content + Float[]       │
│  embedding, native Postgres array — no pgvector extension required)      │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ read at request time (cached in-memory, cheap: few 1000s rows)
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  lib/book-rag.ts (NEW)                                                  │
│  retrieveRelevantChunks(queryText, k) → embeds query via Voyage,         │
│  cosine-similarity in JS against cached BookChunk embeddings,            │
│  returns formatted top-k text block (mirrors exercise-notes.ts pattern) │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ called from EXISTING context-assembly code
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  lib/morpho.ts buildHevyContext()/runWeeklyAnalysis() (EXISTING,         │
│  ONE new line added to the `.filter(Boolean).join()` context array)      │
│  app/api/analysis/video/route.ts (EXISTING, same one-line addition       │
│  to the `context` string passed to analyzeExerciseForm)                 │
└───────────────┬───────────────────────────────────────────────────────┘
                 ▼ (context string unchanged in shape — just longer)
┌─────────────────────────────────────────────────────────────────────────┐
│  lib/claude.ts analyzeMorphology() / analyzeExerciseForm() — UNCHANGED  │
│  (already accepts a free-text context string; zero refactor needed)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `Goal` model (Prisma) | Stores target definition only (metric, target value, direction, baseline, deadline) — never a cached "current value" | New model in `prisma/schema.prisma`, relation to `User` like every other model |
| `lib/goals.ts` | CRUD + `computeGoalProgress()` that reads existing `Measurement`/`Workout`/`ExerciseSet` at request time and diffs against the goal's baseline/target | New `lib/` module, plain functions (no need for a class/singleton — no external API involved) |
| `app/api/goals/route.ts` + `[id]/route.ts` | Thin HTTP boundary delegating to `lib/goals.ts` | Matches the `exercise-notes` route pair (`route.ts` + `[id]/route.ts`) — the most recent precedent in this codebase, not the older inline-CRUD routes |
| `app/goals/page.tsx` | Renders gauge/progress-bar per goal, create/edit form | `'use client'`, `fetch()` in `useEffect`, matching every other page |
| `BookChunk` model (Prisma) | One row per ~300-500 token chunk of ingested book text: `content`, `embedding Float[]`, `source` (book title), `author`, `pageRef`, `chunkIndex` | New model; embeddings stored as native Postgres `Float[]` — no `pgvector` extension, no `Unsupported()` type, no raw SQL needed (see Data Storage decision below) |
| `scripts/ingest-book.ts` | One-off/occasional CLI: PDF → plain text → chunk → embed (Voyage) → upsert `BookChunk` rows | Plain Node script (`tsx scripts/ingest-book.ts <path>`), matching the existing `prisma/seed.ts` convention — **not** a request-time API route |
| `lib/voyage.ts` | Typed client wrapping Voyage AI's embeddings endpoint (embed query text and, at ingestion time, chunk text) | New `lib/` module, `getVoyageClient()` singleton factory reading `VOYAGE_API_KEY` from env — same shape as `lib/heavy.ts`/`lib/journal-sante.ts` |
| `lib/book-rag.ts` | `retrieveRelevantChunks(queryText, k=6)`: embed the query, compute cosine similarity in JS against all cached `BookChunk` embeddings, return the top-k chunks formatted as a French-friendly text block | New `lib/` module; pattern mirrors `lib/exercise-notes.ts`'s `formatNotesForPrompt()` exactly |
| `lib/morpho.ts` (existing) | One new call added to the existing context-assembly `Promise.all`/join in `runWeeklyAnalysis()`, alongside `buildHevyContext`/`buildNutritionContext` | No signature changes; `buildBookContext()` follows the same "pure function returning a string, `''` on failure/absence" contract |
| `app/api/analysis/video/route.ts` (existing) | One new call to `retrieveRelevantChunks()` merged into the existing `context` string before calling `analyzeExerciseForm` | Same one-line addition pattern as the morpho pipeline |
| `lib/claude.ts` (existing) | **No changes required.** `analyzeMorphology(images, context, options)` and `analyzeExerciseForm(images, exercise, { context })` already accept a single free-text context string | Confirms the "inject into existing prompt functions" requirement is achievable with zero refactor |

## Recommended Project Structure

```
prisma/
├── schema.prisma            # + model Goal, + model BookChunk
lib/
├── goals.ts                 # NEW — Goal CRUD + progress computation
├── voyage.ts                 # NEW — Voyage AI embeddings client (getVoyageClient())
├── book-rag.ts               # NEW — chunk cache + retrieveRelevantChunks() + formatChunksForPrompt()
├── morpho.ts                 # EXISTING — add buildBookContext() call, one line in the join()
scripts/
├── ingest-book.ts            # NEW — offline PDF ingestion CLI (not a route)
app/
├── goals/
│   └── page.tsx              # NEW — goal list + gauges/charts + create form
├── api/
│   ├── goals/
│   │   ├── route.ts          # NEW — GET (list+progress), POST (create)
│   │   └── [id]/route.ts     # NEW — PATCH (update/status), DELETE
│   └── analysis/
│       └── video/route.ts    # EXISTING — add one retrieveRelevantChunks() call
```

### Structure Rationale

- **`lib/goals.ts` as a single flat file:** matches the codebase's flat `lib/` convention (no subdirectories anywhere in `lib/`); the anti-pattern already flagged in the existing architecture doc (inline CRUD in `measurements`/`workouts`/`users` routes) is exactly what this new feature must avoid.
- **`scripts/ingest-book.ts`, not an API route:** ingestion is infrequent (3 books, run once each, re-run only if content changes), CPU/IO-heavy (PDF parsing + N embedding calls), and would blow past the same serverless `maxDuration` ceiling that already forced `runtime='nodejs'`/`maxDuration=120` on the weekly/video routes. A local script run against the (already locally-accessible, per `CONCERNS.md`) production Neon DB is consistent with the existing `prisma/seed.ts` pattern and the project's solo/no-CI workflow.
- **`lib/voyage.ts` separate from `lib/claude.ts`:** Anthropic does not offer an embeddings API (confirmed below) — a second, distinct external API client is unavoidable. Keeping it separate mirrors how `lib/heavy.ts` and `lib/journal-sante.ts` are already separate single-purpose clients from `lib/claude.ts`.
- **`lib/book-rag.ts` separate from `lib/goals.ts`:** the two new features are functionally unrelated (one queries workout/measurement history, the other retrieves book text) and have no shared dependency — safe to build independently, in either order.

## Architectural Patterns

### Pattern 1: Compute-on-read progress (Goal tracking)

**What:** `Goal` rows store only the target definition (metric, target value, direction, baseline value/date, optional deadline). "Current value" and "percent to goal" are computed at read time from the existing `Measurement`/`Workout`/`ExerciseSet` tables, never cached on the `Goal` row.
**When to use:** Any metric already tracked elsewhere in the schema (weight, body fat, muscle mass via `Measurement`; training volume via `Workout.volume`; per-exercise strength via `ExerciseSet.oneRm`/`weight`×`reps`).
**Trade-offs:** Slightly more read-time computation (aggregation queries) vs. a much simpler mental model with zero risk of the cached value going stale relative to the source data — consistent with how `buildHevyContext()` already recomputes its Hevy summary from raw rows on every call rather than caching it.

**Example:**
```typescript
// lib/goals.ts
export async function computeGoalProgress(goal: Goal): Promise<GoalProgress> {
  switch (goal.metric) {
    case 'bodyFat':
    case 'weight':
    case 'muscleMass': {
      const latest = await prisma.measurement.findFirst({
        where: { userId: goal.userId, claudeData: { equals: Prisma.DbNull }, [goal.metric]: { not: null } },
        orderBy: { createdAt: 'desc' },
      })
      // percent = (baseline - current) / (baseline - target) for a "decrease" goal, etc.
      return toProgress(goal, latest?.[goal.metric] ?? null)
    }
    case 'exerciseMax': {
      const best = await prisma.exerciseSet.findFirst({
        where: { exercise: { name: goal.exerciseName! }, workout: { userId: goal.userId } },
        orderBy: { oneRm: 'desc' },
      })
      return toProgress(goal, best?.oneRm ?? null)
    }
    // 'liftVolume': aggregate Workout.volume over a trailing window
  }
}
```

### Pattern 2: Retrieval-then-inject into an existing free-text context string (RAG)

**What:** Instead of changing `lib/claude.ts` method signatures, treat retrieved book excerpts exactly like `lib/exercise-notes.ts` treats exercise notes: a pure async function that returns a formatted French-friendly text block (or `''`), added to the existing `.filter(Boolean).join('\n\n')` context assembly.
**When to use:** Any time new contextual text needs to reach a Claude call whose signature already accepts a `context: string` parameter — which both `analyzeMorphology` and `analyzeExerciseForm` already do.
**Trade-offs:** Retrieval quality is bounded by how good the "query" text is when no explicit user query exists (see Data Flow below for the concrete query construction per call site) — but this trade-off is far smaller than the alternative (refactoring `lib/claude.ts` to a multi-turn/tool-use RAG loop), which the milestone constraints explicitly rule out.

**Example:**
```typescript
// lib/morpho.ts — inside runWeeklyAnalysis(), alongside the existing Promise.all
const [hevyContext, nutritionContext, bookContext] = await Promise.all([
  buildHevyContext(userId),
  buildNutritionContext(),
  buildBookContext(hevyExerciseNames), // NEW — lib/book-rag.ts, degrades to '' gracefully
])
const context = [hevyContext, nutritionContext, bookContext, previousSummaryLine]
  .filter(Boolean)
  .join('\n\n')
```

### Pattern 3: In-process brute-force vector search (no vector DB extension)

**What:** Store chunk embeddings as a native Postgres `Float[]` column (Prisma supports scalar list types on Postgres natively — no `Unsupported()` type, no `postgresqlExtensions` preview feature, no raw SQL migration needed). At retrieval time, load all `BookChunk` rows once (cached at module scope, similar to the Prisma-client-on-`globalThis` caching already used in `lib/prisma.ts`), embed the query, and rank by cosine similarity in plain JS.
**When to use:** Small, slow-growing corpora — 3 books chunked at ~300-500 tokens/chunk is roughly 1,000-4,000 rows total. Brute-force cosine similarity over a few thousand vectors in Node is low-single-digit milliseconds; well within the existing 120s serverless budget and far simpler than standing up `pgvector`.
**Trade-offs:** Would not scale to hundreds of thousands of chunks (at that point, `pgvector` + an HNSW/IVFFlat index becomes worth the added complexity — Neon supports the `pgvector` extension natively and Prisma has an open preview path via `postgresqlExtensions` + raw SQL, per current Prisma docs). For this project's actual corpus size (a handful of reference books), that complexity is not justified.

## Data Flow

### Goal progress read flow

```
app/goals/page.tsx (mount)
    ↓ GET /api/goals
app/api/goals/route.ts → lib/goals.ts: listGoalsWithProgress(userId)
    ↓ for each Goal, computeGoalProgress()
    ↓ queries Measurement (weight/bodyFat/muscleMass) OR ExerciseSet.oneRm OR Workout.volume
    ↓ returns { goal, current, percent, trend } per row
← JSON response ← page renders gauge/chart per goal
```

### RAG retrieval-then-inject flow (the flow the milestone explicitly asks about)

```
OFFLINE (once per book, via scripts/ingest-book.ts):
  PDF file → text extraction → chunk (~300-500 tokens, ~50-100 token overlap)
    → Voyage embed each chunk → upsert BookChunk { content, embedding, source, pageRef }

REQUEST TIME (weekly morpho analysis, unchanged entry point /api/analysis/weekly):
  runWeeklyAnalysis()
    ↓ (existing) buildHevyContext(userId) → exercise names + best sets
    ↓ (existing) buildNutritionContext()
    ↓ (NEW) buildBookContext(exerciseNames) — lib/book-rag.ts
         → queryText = exerciseNames.join(', ') + fixed anchor terms
           ("morphologie, leviers, adaptation d'exercices")
         → embed(queryText) via Voyage
         → cosine-similarity rank against cached BookChunk embeddings
         → top-k (5-8) chunks → formatChunksForPrompt() → French text block
           with source attribution (book title, page) for traceability
    ↓ context = [hevy, nutrition, bookContext, previousSummary].filter(Boolean).join('\n\n')
    ↓ (existing, UNCHANGED) claude.analyzeMorphology(images, context, options)

REQUEST TIME (video form analysis, unchanged entry point /api/analysis/video):
  ↓ (existing) exercise notes context via formatNotesForPrompt()
  ↓ (NEW) buildBookContext([exerciseName]) — same lib/book-rag.ts function, k smaller (e.g. 3-4)
  ↓ context = [notesContext, bookContext].filter(Boolean).join('\n\n')
  ↓ (existing, UNCHANGED) claude.analyzeExerciseForm(images, exercise, { context })
```

### Key Data Flows

1. **Goal progress is always derived, never duplicated:** the same invariant discipline already established for `Measurement.claudeData` (AI estimate vs. real data) extends naturally here — a `Goal` row is a target, not a snapshot.
2. **Book content never enters the request path until ingestion has already happened:** retrieval degrades to `''` if `BookChunk` is empty or `VOYAGE_API_KEY` is unset, exactly like `buildNutritionContext()` already degrades to `''` if `JOURNAL_SANTE_API_URL` is unset — this is the same graceful-degradation contract already established in `lib/morpho.ts`, so wiring in RAG cannot break the existing weekly/video flows even before any books are ingested.
3. **Embedding cost is paid once at ingestion, not per-request:** only the short query text (exercise names + anchor terms, a handful of tokens) is embedded at request time; the expensive part (embedding every chunk of every book) happens exactly once in `scripts/ingest-book.ts`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (solo user, 3 reference books, ~1-4k chunks) | Brute-force in-process cosine similarity, `Float[]` column, no pgvector — simplest possible correct implementation |
| If book corpus grows to tens of books / 50k+ chunks | Add `pgvector` extension (Neon supports it on every plan) + an HNSW index, migrate `BookChunk.embedding` via Prisma's `postgresqlExtensions` preview feature + raw SQL for the similarity query — the `BookChunk` row shape does not need to change, only the query path |
| Goal tracking at any realistic personal-use scale | No adjustment needed — the underlying tables (`Measurement`, `Workout`, `ExerciseSet`) are already indexed on `userId`/date and read volume here is trivial (one dashboard/goals page load) |

### Scaling Priorities

1. **First (and only foreseeable) bottleneck:** chunk-embedding cache staleness after re-ingesting a book — mitigate by invalidating/recomputing the in-memory cache whenever `scripts/ingest-book.ts` runs (or simply accept a cold-start reload, since this is a low-traffic solo app where a Vercel serverless instance recycles frequently anyway).
2. **Not a near-term concern:** query latency, corpus size, or concurrent load — this is explicitly out of scope per `PROJECT.md` ("Out of Scope: monétisation / multi-utilisateur").

## Anti-Patterns to Avoid

### Anti-Pattern 1: Caching "current value" on the Goal row

**What people do:** Add a `currentValue`/`percentComplete` column to `Goal` and update it via a sync job or on every measurement write.
**Why it's wrong:** Introduces a second source of truth that can silently drift from the real `Measurement`/`ExerciseSet` data (the exact class of bug the codebase's `claudeData` invariant already exists to prevent) and requires remembering to update it from every write path (Hevy sync, Journal Santé sync, manual measurement entry...).
**Do this instead:** Compute progress from existing tables at read time in `lib/goals.ts`, as already done for every other aggregation in this codebase (`buildHevyContext`, `buildNutritionContext`).

### Anti-Pattern 2: Refactoring `lib/claude.ts` to accept a `bookChunks` array parameter

**What people do:** Add a new `references?: BookChunk[]` parameter to `analyzeMorphology`/`analyzeExerciseForm` and format it inside `lib/claude.ts`.
**Why it's wrong:** Unnecessary surface-area growth on the one file (`lib/claude.ts`) that already holds every Claude prompt; the milestone context explicitly asks to avoid a "major refactor" of this file. The existing `context: string` parameter is already the generalized injection point — that's exactly why `lib/exercise-notes.ts` was built the way it was.
**Do this instead:** Format book excerpts into the same context string other injectors already use, in a new `lib/book-rag.ts`, and simply add it to the existing `join()` call sites.

### Anti-Pattern 3: Building the PDF ingestion pipeline as a synchronous serverless API route

**What people do:** `app/api/books/ingest/route.ts` accepting a multipart PDF upload, parsing + chunking + embedding all inline in the request handler.
**Why it's wrong:** Multiple embedding API calls (one per chunk, potentially hundreds per book) plus PDF parsing will very likely exceed even the already-extended `maxDuration = 120` used for the weekly/video Claude-vision routes, and — because ingestion happens rarely (per book, not per user action) — there is no product reason to expose it as an HTTP endpoint at all.
**Do this instead:** A local script (`scripts/ingest-book.ts`) run manually against the (already locally-reachable, per `CONCERNS.md`) production database, matching the existing `prisma/seed.ts` convention.

### Anti-Pattern 4: Injecting full book chapters into every Claude call "to be safe"

**What people do:** Concatenate entire relevant chapters instead of a handful of the top-ranked chunks, reasoning that "more context = better advice."
**Why it's wrong:** Directly violates the explicit cost/latency constraint in `PROJECT.md` ("attention à ne pas faire exploser les coûts/temps de réponse en ajoutant du contenu de référence volumineux à chaque appel") — every weekly/video analysis already sends 1-6 images plus multiple context blocks; adding thousands of extra tokens per call on every request compounds cost linearly with usage.
**Do this instead:** Retrieve only the top-k (5-8 for morpho, 3-4 for video) most relevant chunks per call, each capped at ~300-500 tokens, keeping the added context bounded regardless of corpus size.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Voyage AI (embeddings) | New `lib/voyage.ts` client, `getVoyageClient()` singleton, `VOYAGE_API_KEY` env var | Anthropic does not offer an embeddings API and officially recommends Voyage AI for Claude-paired RAG (confirmed via Anthropic's own cookbook and docs) — this is an unavoidable second external API, not a design choice that could be avoided by staying "all-Anthropic" |
| Neon Postgres (pgvector extension) | Deliberately NOT used at current scale | Available on every Neon plan at no extra cost if corpus growth later justifies it — see Scaling Considerations |
| PDF text extraction | A Node-compatible PDF-to-text library (e.g. `pdf-parse`/`unpdf`) run inside `scripts/ingest-book.ts` | LOW confidence on exact library choice — verify current maintenance status at implementation time; this runs in a local script, not a serverless route, so bundle-size/edge-runtime compatibility constraints that would otherwise matter do not apply here |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `app/goals/page.tsx` ↔ `app/api/goals/**` | `fetch()`, JSON | Matches every existing page↔API boundary; no new pattern introduced |
| `lib/goals.ts` ↔ Prisma (`Measurement`/`Workout`/`ExerciseSet`) | Direct `prisma.*.findFirst/aggregate` calls | Read-only from these existing models; only the new `Goal` model is written |
| `lib/book-rag.ts` ↔ `lib/morpho.ts` / `app/api/analysis/video/route.ts` | Plain async function call returning a string | Identical shape to `lib/exercise-notes.ts`'s `formatNotesForPrompt()` — this is the "no major refactor" seam the milestone context points to |
| `lib/book-rag.ts` ↔ `lib/voyage.ts` | Direct function call to embed the query text | `lib/voyage.ts` has no knowledge of chunking/retrieval, matching how `lib/heavy.ts` has no knowledge of sync logic (that lives in `lib/hevy-sync.ts`) |
| `scripts/ingest-book.ts` ↔ `lib/voyage.ts` + Prisma | Same `lib/voyage.ts` client reused for chunk-time embedding as for query-time embedding | Avoids a second embeddings client; one `lib/voyage.ts` module serves both the offline script and the request-time retrieval path |

## Suggested Build Order

1. **`Goal` Prisma model + `lib/goals.ts` + `app/api/goals/**` + `app/goals/page.tsx`** — fully independent of the RAG feature; can be built and shipped first or in parallel. No new external dependency (no new API key, no new library) — lowest-risk, fastest to ship.
2. **`BookChunk` Prisma model** — schema-only step, needed before anything else in the RAG feature can be written or tested (must exist before ingestion can write to it, and before retrieval can query it).
3. **`lib/voyage.ts` (Voyage AI client)** — needed before both ingestion (to embed chunks) and retrieval (to embed the query); build once, use in both places.
4. **`scripts/ingest-book.ts`** — depends on 2 and 3; this is the step that requires an actual PDF (i.e. depends on the Google Drive share link mentioned in `PROJECT.md` being available). Run manually per book once ready.
5. **`lib/book-rag.ts` (`retrieveRelevantChunks`)** — depends on 2 and 3; can be built and unit-tested against a small manually-seeded set of `BookChunk` rows even before step 4 runs at scale, since it degrades gracefully on an empty table (returns `''`).
6. **Wire into `lib/morpho.ts` and `app/api/analysis/video/route.ts`** — one-line additions to each; depends on step 5 existing, but does not require step 4 (real book data) to be complete to merge safely, since the graceful-degradation contract means an empty `BookChunk` table just means no book context is added yet.

Steps 1-6 for RAG have a hard internal dependency chain (2 → 3 → {4, 5} → 6); the Goal feature (item 1) has no dependency on any of it and can proceed independently in parallel.

## Sources

- [Postgres extensions | Prisma Documentation](https://www.prisma.io/docs/postgres/database/postgres-extensions) — MEDIUM confidence: confirms Prisma's current native array-type support and the `postgresqlExtensions` preview-feature path for `pgvector`, used to justify the "skip pgvector at this scale" recommendation.
- [The pgvector extension - Neon Docs](https://neon.com/docs/extensions/pgvector) — MEDIUM confidence: confirms `pgvector` is available on every Neon plan at no extra cost, supporting the stated scaling path.
- [Vector type needed for storing OpenAI embeddings · prisma/prisma · Discussion #18220](https://github.com/prisma/prisma/discussions/18220) — MEDIUM confidence: community discussion confirming Prisma lacks a first-class native `vector` scalar type as of current releases, supporting the "use `Float[]` + JS cosine similarity" recommendation over forcing pgvector integration.
- [Embeddings - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/embeddings) — HIGH confidence, official Anthropic documentation: confirms Anthropic has no first-party embeddings model/API and directs developers to Voyage AI.
- [claude-cookbooks/third_party/VoyageAI/how_to_create_embeddings.md](https://github.com/anthropics/claude-cookbooks/blob/main/third_party/VoyageAI/how_to_create_embeddings.md) — HIGH confidence, official Anthropic cookbook: confirms Voyage AI as Anthropic's own recommended embeddings partner for Claude-paired RAG.
- Direct codebase reads (this session): `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `prisma/schema.prisma`, `lib/morpho.ts`, `lib/exercise-notes.ts`, `lib/claude.ts` — HIGH confidence, primary source for all component-boundary and existing-pattern claims in this document.

---
*Architecture research for: Goal tracking + reference-book RAG extension to an existing single-user Next.js/Prisma coaching app*
*Researched: 2026-07-01*
