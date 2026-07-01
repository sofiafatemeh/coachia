# Project Research Summary

**Project:** Coach AI
**Domain:** Extending a single-user Next.js/Prisma fitness-coaching app with (1) a goal/progress-tracking dashboard UI and (2) reference-book-grounded RAG injected into existing Claude Vision prompts
**Researched:** 2026-07-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone adds two largely independent features to an already-shipped solo fitness-coaching app: a visual goal/progress-tracking UI (weight/body-fat trend, strength/volume charts, photo timeline, vs. numeric targets) and a PDF-ingested RAG layer that grounds Claude's existing morpho/video-analysis prompts in three named training-methodology books (Delavier, Gundill, Lesueur). Both features are additive rather than architectural rewrites: the goal UI is a new Prisma model plus read/aggregate code over data that's already synced (Measurement, Workout, ExerciseSet, ProgressPhoto), and the RAG layer slots into the *existing* `context: string` parameter already accepted by `analyzeMorphology`/`analyzeExerciseForm` — no refactor of `lib/claude.ts` is needed. All four research tracks converge on "no new heavy infrastructure": no vector DB service, no queue/job runner, no LangChain/LlamaIndex, no Prisma major-version bump. Ingestion runs as a one-off local script (mirroring the existing `prisma/seed.ts` pattern), not a serverless route.

The recommended approach is: build the goal-tracking UI first (zero new external dependencies, fully independent, lowest risk, highest immediately-visible value since the underlying data already exists but isn't visualized), then build the RAG pipeline in its documented internal order (schema → embeddings client → ingestion script → retrieval function → one-line wiring into the two existing Vision prompts). The goal UI's real design risk is not technical but UX/behavioral: naive implementations (raw daily weight, linear weight-loss-only progress %, a fixed target-date line) actively produce misleading or discouraging feedback for a *body recomposition* goal, where scale weight is a poor and noisy proxy for the user's actual objective (simultaneous fat loss + muscle gain). The RAG pipeline's real risks are non-technical too: copyright/redistribution exposure from storing raw book text in the shared production DB (this project pushes directly to `main` against a single, locally-reachable prod Neon database, with no staging gate), and cost/latency compounding on Vision routes that have already timed out twice in production and run close to the 120s ceiling with no timeout wrapper around the Claude call itself.

One notable disagreement surfaced between research tracks that the roadmap/planning stage must explicitly resolve: STACK.md recommends the Neon `pgvector` extension (HNSW index) for embedding storage/similarity search, while ARCHITECTURE.md recommends a simpler native Prisma `Float[]` column with brute-force in-process cosine-similarity in JS, arguing pgvector is unjustified complexity at this corpus size (a few thousand chunks) and avoids a riskier extension-enabling migration against the single shared prod DB. Both are technically valid at this scale; ARCHITECTURE.md's reasoning is more tightly grounded in this project's specific constraints (push-direct-to-main, no staging, Prisma has no native vector type), so it is the recommended default — flagged here as a decision to confirm, not silently override, during phase/task planning.

## Key Findings

### Recommended Stack

The stack additions are deliberately minimal and reuse the codebase's existing conventions (hand-rolled `fetch` clients per external API, flat `lib/` modules, `tsx`-run one-off scripts) rather than introducing frameworks.

**Core technologies:**
- **Recharts ^3.9.1** — charting for goal-progress gauges/trend lines/volume charts; verified peer-dep match with the app's pinned React 19.2.4, no `--legacy-peer-deps` needed, and is the engine behind shadcn/ui's chart components (large corpus of adaptable patterns for the existing red/black/gold theme).
- **Voyage AI `voyage-context-3` (or newer `-context-4`)** — text embedding model for book chunks + queries, since Anthropic has no first-party embeddings API and officially recommends Voyage as its partner. Contextualized embeddings (chunk-aware of parent document/chapter) improve retrieval accuracy over naive isolated-chunk embedding.
- **unpdf ^1.6.2** — PDF-to-text extraction for the offline ingestion script; pure-JS with no native dependency for text extraction (unlike `pdf-parse` 2.x, which hard-requires a native canvas binary and risks Vercel-runtime mismatches — though this doesn't apply here since ingestion runs locally, not on Vercel).
- **Embedding storage: pgvector (STACK.md) vs. native `Float[]` + JS cosine similarity (ARCHITECTURE.md)** — see the discrepancy called out in the Executive Summary; both avoid a dedicated vector DB service, differ only on whether to enable the Postgres extension.
- **No new SDK for Voyage** — a ~40-line `lib/voyage.ts` wrapping raw `fetch`, matching `lib/claude.ts`/`lib/heavy.ts`/`lib/journal-sante.ts`'s established shape.
- **No changes to Prisma version** — `Unsupported("vector(...)")` + `$queryRaw` (if pgvector is chosen) or plain `Float[]` (if not) both avoid a major ORM bump.

### Expected Features

**Must have (table stakes / P1):**
- `Goal` model (target weight/body-fat %/date) — the one new required persistence entity; everything else in the goal feature reads existing data.
- Weight/body-fat smoothed trend line vs. target (using existing `Measurement` sync data).
- Strength/volume progression charts per exercise (using existing `Workout`/`ExerciseSet` data) — highest ROI since the data exists but is entirely unvisualized today.
- Progress-photo chronological timeline (using existing `ProgressPhoto` rows).
- PDF ingestion pipeline (Drive PDF → text → chunks → embeddings → storage).
- `buildMethodologyContext()`-style retrieval injected into the existing weekly morpho prompt, with lightweight book/author attribution (paraphrase only, never verbatim quotes).

**Should have (competitive, P2 — add after P1 validated):**
- Numeric "X kg to go" / % progress summary card.
- PR (personal record) badges per exercise.
- Photo compare-slider (any two dates).
- Methodology context extended to video/exercise-note prompts.
- "Recomposition indicator" combining weight + measurement + strength trend into one honest composite signal (matches the user's actual stated goal better than weight alone — genuinely valuable but sequenced after the three underlying trends are individually validated).

**Defer (v2+):**
- AI morpho-score trend overlay (needs a schema/prompt change to make `MorphoAnalysis` scores numeric first — don't force this prematurely).
- Milestone photo pinning/auto-flagging.
- Cross-author synthesis logic in RAG prompting (start with plain top-k retrieval across authors; add explicit reconciliation only if needed).
- Explicitly out of scope per FEATURES/PROJECT: social/leaderboard features, gamification (streaks/badges/XP), a dedicated vector DB service, LangChain/LlamaIndex, model fine-tuning on book content, verbatim-quote citation UI, full page-accurate footnote system, real-time conversational chat.

### Architecture Approach

Both features integrate as thin additive layers on the existing Next.js/Prisma structure with no changes to `lib/claude.ts`. The goal feature follows a **compute-on-read** pattern — `Goal` rows store only the target definition, never a cached "current value," with progress computed at request time from existing `Measurement`/`Workout`/`ExerciseSet` tables (mirroring the existing `buildHevyContext()` recompute-don't-cache convention). The RAG feature follows a **retrieval-then-inject-into-existing-context-string** pattern — a new `lib/book-rag.ts` (mirroring `lib/exercise-notes.ts`'s `formatNotesForPrompt()`) returns a formatted text block that gets added to the existing `.filter(Boolean).join('\n\n')` context assembly already used in `runWeeklyAnalysis()` and the video-analysis route, with graceful `''` degradation if `BookChunk` is empty or the Voyage key is unset.

**Major components:**
1. `Goal` Prisma model + `lib/goals.ts` (CRUD + `computeGoalProgress()`) + `app/api/goals/**` + `app/goals/page.tsx` — fully independent of RAG, no new external dependency, buildable/shippable first.
2. `BookChunk` Prisma model (content, embedding, source/author/pageRef) + `lib/voyage.ts` (embeddings client) — schema and client needed before ingestion or retrieval can be built.
3. `scripts/ingest-book.ts` — offline, one-off CLI (PDF → text → chunk → embed → upsert), explicitly not an API route; depends on the Google Drive PDFs being available.
4. `lib/book-rag.ts` (`retrieveRelevantChunks`) — embeds the query, ranks cached chunks, returns a capped top-k formatted block; wired into `lib/morpho.ts` and `app/api/analysis/video/route.ts` with one-line additions each.

Suggested internal build order for RAG: `Goal` feature (parallel, independent) → `BookChunk` schema → `lib/voyage.ts` → {`scripts/ingest-book.ts`, `lib/book-rag.ts`} → wire into the two existing Vision prompts.

### Critical Pitfalls

1. **Naive fixed-size chunking destroys the anatomical/technique reasoning in the books** — chunk by document structure (per exercise/muscle-group header, not raw character counts), keep each chunk self-contained with its heading context, moderate size (~300-800 tokens) with small overlap. Verify by manually spot-checking top-3 retrieved chunks for 5 real queries — each should be self-contained and answerable.
2. **Cost/latency blowup from injecting book context into every Vision call** — the weekly/video routes already run close to the 120s Vercel ceiling and have timed out twice in production with no timeout wrapper around the Claude call. Cap injected context to a hard token budget (1-2K max), retrieve only chunks relevant to the specific exercise/muscle groups in play, and add a `withTimeout()` wrapper around the retrieval step itself (matching the existing pattern in `buildNutritionContext`).
3. **Copyright/redistribution risk from storing book text (verbatim or as embeddings) in the shared production DB** — this is a hard, explicit constraint in PROJECT.md, not a nice-to-have. Prefer paraphrased/structured extraction over raw prose at ingestion time; never log full chunk text; never let the AI quote large verbatim passages back to the user; keep any book-chunk table out of seed scripts/backups/committed artifacts.
4. **Vector schema migration treated as routine on a push-direct-to-prod, single-shared-DB workflow** — separate the schema/extension migration from the embedding backfill (the backfill must never run inside `prisma migrate deploy`/`vercel-build.sh`); skip ANN indexing entirely at this corpus size (well under 10k rows); test on a Neon branch first if feasible, since this is a materially riskier migration type than the additive `Json`-column migrations this project has done before.
5. **Goal UI mistakes for body recomposition specifically** — three related pitfalls: (a) raw daily weight with no trend smoothing produces discouraging noise (show a smoothed trend as primary, raw points secondary); (b) modeling progress purely as weight-vs-target ignores that muscle gain masks fat loss on the scale for this exact recomposition goal (use a composite of weight trend + measurements + strength/volume, not weight alone); (c) a linear date-based target line sets up guaranteed "behind schedule" framing against normal, non-linear physiological variance (show rate-of-progress against an evidence-based healthy-rate range instead of, or alongside, any fixed end date).

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Goal & Progress Tracking UI
**Rationale:** Zero new external dependencies (no new API key, no new library beyond Recharts), fully independent of the RAG feature, and the underlying data (Measurement, Workout, ExerciseSet, ProgressPhoto) already exists and is entirely unvisualized today — highest value-to-risk ratio, good first phase to build confidence and ship something visible quickly.
**Delivers:** `Goal` model + compute-on-read progress; smoothed weight/body-fat trend vs. target; strength/volume progression charts; progress-photo timeline.
**Addresses:** P1 features from FEATURES.md (Goal model, trend chart, volume charts, photo timeline).
**Avoids:** Pitfalls 5, 6, 7 (raw-weight noise, weight/fat-loss conflation, rigid linear timelines) — these must be designed into the goal model from the start, not retrofitted.

### Phase 2: Book RAG — Ingestion Foundation
**Rationale:** Must precede retrieval/integration; establishes the schema and embeddings client both later steps depend on. Isolating this as its own phase lets the riskier migration/copyright decisions (pgvector vs. Float[], storage format) get made deliberately rather than under pressure while also wiring prompts.
**Delivers:** `BookChunk` schema (decision needed: pgvector extension + `Unsupported`/raw SQL, per STACK.md, vs. native `Float[]` + in-process cosine similarity, per ARCHITECTURE.md — resolve during phase planning), `lib/voyage.ts` embeddings client, `scripts/ingest-book.ts` (PDF → structure-aware chunking → embed → store).
**Uses:** Voyage AI contextualized embeddings, unpdf for extraction, Neon Postgres (with or without pgvector).
**Implements:** Architecture components 2-3 (BookChunk model, voyage client, ingestion script) from ARCHITECTURE.md; must apply Pitfalls 1, 3, 4 (structure-aware chunking, paraphrase-not-verbatim storage, schema/backfill separation) as first-class design decisions, not afterthoughts.

### Phase 3: Book RAG — Retrieval & Prompt Integration
**Rationale:** Depends entirely on Phase 2's schema and client; this is the "wire it into existing prompts" step and is where the cost/latency risk (Pitfall 2) is concretely realized, so it should be scoped and tested independently from ingestion.
**Delivers:** `lib/book-rag.ts` (`retrieveRelevantChunks`, capped top-k, formatted attribution block), one-line integration into `lib/morpho.ts`'s context assembly and `app/api/analysis/video/route.ts`.
**Addresses:** P1 feature "Methodology-grounded advice injection + attribution" from FEATURES.md.
**Avoids:** Pitfall 2 (cost/latency blowup) — requires a token budget cap and a timeout wrapper around retrieval before merging, verified via before/after comparison of Vercel function duration and Anthropic token usage on the weekly/video routes.

### Phase Ordering Rationale

- Phase 1 has no dependency on Phases 2-3 and could in principle run in parallel, but sequencing it first de-risks the milestone (ships value immediately, no new external services) while RAG design decisions (pgvector vs. Float[], chunking strategy) are finalized.
- Phases 2 and 3 must be sequential: BookChunk schema and the Voyage client are hard prerequisites for both ingestion and retrieval; retrieval integration should not begin until ingestion has produced real (or at least representative test) data, since chunk quality directly determines retrieval quality (Pitfall 1) and can only be validated once chunks exist.
- Splitting RAG into two phases (ingestion vs. integration) rather than one lets the copyright/migration-safety decisions (Phase 2) be made without time pressure from also having to wire live Vision prompts, and lets the cost/latency verification (Phase 3) happen against a stable, already-ingested corpus rather than a moving target.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Book RAG ingestion):** Needs a definitive resolution of the pgvector-vs-Float[] storage discrepancy between STACK.md and ARCHITECTURE.md, plus a concrete chunking-strategy spec (chapter/section boundary detection for the specific Delavier/Gundill/Lesueur PDF structures) before implementation — sparse, project-specific judgment calls rather than settled patterns.
- **Phase 3 (Book RAG integration):** Needs explicit token-budget and timeout-wrapper design given the existing production timeout history on these exact routes (`CONCERNS.md` commits `6a3812c`, `6c62581`) — not a generic RAG pattern, but a codebase-specific latency-risk mitigation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Goal tracking UI):** Well-documented, established patterns (Recharts + smoothed-trend UX patterns from MacroFactor/Happy Scale/W8buddy are directly reusable; compute-on-read matches the codebase's own existing `buildHevyContext` convention).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH (charting, PDF extraction, pgvector availability) / MEDIUM (embedding model choice — `voyage-context-4` is two days old with no independent validation at research time; exact contextualized-embeddings pricing tier limits) | Verified via live npm registry checks and official vendor docs; the newest Voyage model lacks third-party corroboration. |
| Features | MEDIUM-HIGH | Tracker feature landscape (#1) is well-established and corroborated across Strong/Hevy/MacroFactor/GainFrame; RAG grounding pattern (#2) is HIGH confidence on the retrieval technique itself but MEDIUM on "what's proportionate for a 1-book corpus" since that's a judgment call, not an industry standard. |
| Architecture | HIGH (component boundaries, derived from direct codebase reads) / MEDIUM (RAG storage/embedding specifics, since no Context7 was available for Prisma/pgvector specifics — relied on official docs + a GitHub discussion). |
| Pitfalls | MEDIUM-HIGH | RAG mechanics and evidence-based fat-loss-rate norms are well-established and cross-verified across multiple independent sources; copyright-risk specifics reference evolving, unsettled case law (Dow Jones v. Perplexity AI) and should be treated as directional risk framing, not legal advice. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **pgvector vs. native `Float[]` for embedding storage:** STACK.md and ARCHITECTURE.md disagree. Resolve explicitly during Phase 2 planning — ARCHITECTURE.md's reasoning (avoids a riskier extension-enabling migration on the single shared prod DB with no staging gate, and Prisma has no native vector type regardless) is more tightly grounded in this project's specific deployment constraints and is the suggested default, but this should be a conscious decision recorded in the phase plan, not silently inherited.
- **`voyage-context-4` maturity:** released two days before this research with no independent benchmarking. Default to `voyage-context-3` (GA, track record) unless a deliberate case is made for the newer model during implementation.
- **Exact chunking/structure-detection approach for the specific PDFs:** general chunking guidance (structure-aware, 300-800 tokens, small overlap) is well-established, but the actual heading/section structure of the Delavier/Gundill/Lesueur PDFs is unknown until the files are examined — budget explicit investigation time in Phase 2 before finalizing the chunker.
- **`MorphoAnalysis` score structure:** the AI morpho-score trend overlay (deferred to v2+) requires a schema/prompt change to make segment scores numeric; not a gap in research, but a known prerequisite to flag if this feature is pulled forward later.
- **Untested carry-forward gap-filling logic in `lib/journal-sync.ts`:** flagged by PITFALLS.md as a pre-existing risk (per `CONCERNS.md`) that could surface as an apparent goal-tracking bug when it's actually a sync-data artifact — worth a quick sanity check against real data during Phase 1 rather than assuming clean input.

## Sources

### Primary (HIGH confidence)
- Neon Docs — pgvector extension: https://neon.com/docs/extensions/pgvector
- Anthropic/Claude Platform Docs — PDF support: https://platform.claude.com/docs/en/build-with-claude/pdf-support
- Anthropic — Embeddings docs: https://docs.claude.com/en/docs/build-with-claude/embeddings
- Voyage AI Docs — contextualized chunk embeddings API reference: https://docs.voyageai.com/reference/contextualized-embeddings-api
- Voyage AI Docs — standard embeddings models/pricing: https://docs.voyageai.com/docs/embeddings
- npm registry (`npm view`) — live version/peer-dependency checks for recharts, unpdf, pdf-parse, prisma, voyageai
- unpdf README + GitHub (`unjs/unpdf`)
- Vercel Docs — Functions duration/Fluid compute
- Direct codebase reads: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONCERNS.md`, `prisma/schema.prisma`, `lib/morpho.ts`, `lib/exercise-notes.ts`, `lib/claude.ts`, `.planning/PROJECT.md`
- Harvard Health — realistic weight-loss rate guidance
- claude-cookbooks (`anthropics/claude-cookbooks/third_party/VoyageAI`) — Voyage as Anthropic's recommended embeddings partner

### Secondary (MEDIUM confidence)
- Neon Blog / thenile.dev — pgvector 0.8.0 / HNSW iterative index scans
- Prisma Docs/Blog — Postgres extensions, `Unsupported` types, ORM 6.13 pgvector-for-Prisma-Postgres framing
- Prisma GitHub Discussion #18220 — no native `vector` scalar type as of current releases
- Voyage AI Blog — `voyage-context-4` announcement (2026-06-29, no independent validation yet)
- shadcn/ui charts docs (Recharts v3 as current standard pairing)
- MacroFactor product help docs — Goal Progress / Weight Trend features
- GainFrame blog — AI photo scoring correlated with workout data
- Strong/Hevy/StrengthLog/LiftTrack product descriptions — volume/1RM progression as category standard
- RAG chunking-pitfall articles (nb-data, Towards Data Science, Unstructured.io, Label Studio, pgEdge, postgresqlhtx.com)
- Precision Nutrition — evidence-based fat-loss/muscle-gain rate ranges
- Gaspari Nutrition — body recomposition realistic timeline

### Tertiary (LOW confidence)
- Dow Jones v. Perplexity AI copyright litigation commentary (single source, evolving case law — directional only, not legal advice)
- W8buddy/Happy Scale/Body Graph product pages — smoothing-approach references, general corroboration only

---
*Research completed: 2026-07-01*
*Ready for roadmap: yes*
