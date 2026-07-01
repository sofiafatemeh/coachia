# Pitfalls Research

**Domain:** PDF-grounded RAG added to an existing Claude Vision pipeline + body-recomposition goal/progress tracking UI (solo, single-user, production Next.js/Prisma/Neon app)
**Researched:** 2026-07-01
**Confidence:** MEDIUM-HIGH (RAG mechanics and fat-loss-rate norms are well-established and cross-verified across multiple sources; copyright-risk specifics are evolving case law, treat as directional not legal advice)

## Critical Pitfalls

### Pitfall 1: Chunking strategy destroys the anatomical/technique reasoning the books provide

**What goes wrong:**
Fixed-size/character-count chunking (e.g. "every 500 characters") on Delavier/Gundill/Lesueur-style books splits a muscle-group explanation from its illustration caption, or an exercise cue from its exception/caveat paragraph, or a table row from its header. Retrieval then returns a chunk that scores as "relevant" (right keywords) but is answerable-broken — half a technique cue with no context, or a caveat with no idea what it's an exception to. Multiple independent sources confirm this is the single most common RAG failure mode: chunks that are too large average multiple ideas into one embedding (nothing scores sharply), chunks that are too small are semantically stranded, and chunks that cut across a logical boundary produce two incomplete, individually-irrelevant-looking halves.

**Why it happens:**
Naive chunking is the fastest thing to implement first ("split the PDF text every N tokens") and looks like it works in a quick manual test with 2-3 queries, but degrades silently as the corpus and query variety grow. It's worse for illustrated technique books than for prose because these books rely heavily on structure (muscle group headers, numbered exercise steps, tables of variations) that character-count chunking ignores entirely.

**How to avoid:**
Chunk by document structure, not raw character counts: split on headers/sections (per exercise or per muscle group, which these books are already organized around), keep each chunk self-contained (include the exercise name / muscle group as context even if it was only stated in a parent heading), and use a moderate target size (roughly 300-800 tokens per general RAG guidance) with a small overlap (~10-20%) so boundary-adjacent sentences aren't orphaned. Since these are scanned/formatted PDFs, budget explicit time for PDF text extraction quality (tables, multi-column layout, image captions) before worrying about chunk size — bad extraction guarantees bad chunking regardless of strategy.

**Warning signs:**
- Retrieved chunks "look" topically relevant but the AI's advice is generic/hedged rather than citing a specific cue from the book
- Manual spot-check: pull the top-3 retrieved chunks for 5 real morpho-analysis queries and read them — if any chunk requires the sentence before/after it to make sense, chunking is broken
- Same query returns wildly different chunks between two very similar photos/exercises

**Phase to address:**
Book-RAG ingestion phase (chunking/extraction step), before any embedding or retrieval work begins.

---

### Pitfall 2: Cost/latency blowup from injecting retrieved book context into every Vision call

**What goes wrong:**
The existing Vision routes (`weekly` morpho analysis, `video` form analysis) already run close to their Vercel `maxDuration` ceiling (120s) and have twice caused production timeouts (commits `6a3812c`, `6c62581` per `.planning/codebase/CONCERNS.md`). Naively prepending several retrieved book chunks to every single Claude Vision request (multiple images + now several KB of retrieved text) adds real token cost and — more critically for this app — real latency risk, on routes that have no retry/timeout wrapper around the Claude call itself (`runWeeklyAnalysis` in `lib/morpho.ts` has no timeout around `claude.analyzeMorphology`, confirmed in CONCERNS.md). Modern RAG guidance is explicit that 2026-era systems should *not* blindly retrieve-and-inject on every call — retrieval should be routed/conditional, since bigger context windows add cost and noise without proportional benefit.

**Why it happens:**
It's the simplest implementation: "always fetch top-K chunks, always prepend to the system prompt." It works in local testing (short PDFs, one query) and only becomes a problem once the book corpus grows or a query touches many chunks (e.g. a full-body morpho analysis needing cues about several muscle groups at once).

**How to avoid:**
- Retrieve only what's relevant to the current analysis context (e.g. only chunks matching the specific muscle groups/exercises flagged in this photo/video, not a blanket "top 10 chunks" every time)
- Cap total retrieved-context tokens with a hard budget (e.g. 1-2K tokens max appended per call) and truncate/rank rather than concatenate everything
- Add the same timeout discipline already used elsewhere in the codebase (`withTimeout()` pattern in `lib/morpho.ts`'s `buildNutritionContext`) around the retrieval step itself, so a slow embedding/DB lookup can't push an already-tight Vision call over the 120s ceiling
- Consider caching embeddings/retrieval results per exercise or muscle-group tag rather than re-querying the vector store on every single Vision call

**Warning signs:**
- Weekly/video analysis routes start approaching 120s more often after RAG is added (check Vercel function duration logs)
- Anthropic token usage/cost per Vision call visibly increases after RAG launch
- A user-visible timeout/504 recurs (this has already happened twice for unrelated reasons — a third recurrence tied to RAG context injection should be treated as a regression, not "normal")

**Phase to address:**
Book-RAG integration phase (the step where retrieval is wired into the existing `lib/claude.ts` prompt-building, not the ingestion/chunking step).

---

### Pitfall 3: Copyright/redistribution risk from storing book text (verbatim or as embeddings) in the production database

**What goes wrong:**
Storing full extracted chunks of copyrighted book text (Delavier/Gundill/Lesueur) in Neon Postgres — even "just for retrieval, never shown to the user directly" — is a real and current legal exposure, not a theoretical one. Litigation such as *Dow Jones v. Perplexity AI* argues that large-scale copying at the retrieval-database "input stage" itself can constitute infringement, independent of what the model outputs. Separately, there's a technical redistribution risk specific to this project's constraints: this repo pushes directly to `main` with no PR/CI gate, and local dev runs against the *same* production Neon database as the deployed app (per CONCERNS.md) — meaning any seed script, migration, or debugging dump that touches the book-chunks table has a higher chance of accidentally leaking into a commit, a log, or an ad-hoc script left at the repo root (the existing pattern of "one-off scripts committed at root" is called out in CONCERNS.md as already-existing clutter).

**Why it happens:**
It's technically the easiest approach — dump full PDF text into chunks, embed each chunk, done. Teams conflate "the LLM output doesn't show the book text" with "therefore we're not redistributing it," but the *storage* itself (a queryable, exportable copy of the copyrighted text sitting in a DB) is the actual point of exposure this project's own constraints document flag ("le contenu des livres de référence ne doit jamais être republié tel quel dans l'app ou dans des documents commités").

**How to avoid:**
- Do not store raw/verbatim chunk text in the database at all if avoidable — store a compact *paraphrased summary* or *structured extraction* (e.g. "exercise: X, cue: Y, common mistake: Z" as short bullet facts) rather than book prose, generated once during ingestion (this also produces better, more chunk-independent retrieval units, addressing Pitfall 1)
- If verbatim storage is used for retrieval fidelity, keep it in a table that is never included in any seed script, backup export, or debug dump that could leave the DB boundary; never log full chunk text to Vercel logs
- Reconfirm the source PDFs are only accessed via the intended restricted Google Drive link (not re-uploaded anywhere public, not committed to git, not attached to Vercel Blob with a public URL — check the same public/private distinction already relevant to photo/video Blob storage)
- Never let the RAG system's output directly quote large verbatim passages back to the user in emails or the UI — the system prompt should explicitly instruct the model to paraphrase/apply the retrieved technique guidance, not reproduce it
- Treat this as a "never acceptable to skip" prevention step given this is the user's own explicit stated constraint in PROJECT.md, not just general best practice

**Warning signs:**
- Any script or migration that does `SELECT * FROM book_chunks` for anything other than the retrieval query path itself
- A committed `.sql` seed file, fixture, or debug script containing extracted book text
- An email or UI screen displaying a paragraph-length excerpt that closely mirrors book wording rather than synthesized advice

**Phase to address:**
Book-RAG ingestion phase (storage schema decision) and book-RAG integration phase (prompt construction — paraphrase instruction).

---

### Pitfall 4: Vector index setup treated as an afterthought on a push-direct-to-prod, single-DB workflow

**What goes wrong:**
Adding pgvector (or an equivalent embedding-storage approach) requires a Postgres extension enable + schema migration. Because this project's `prisma migrate deploy` runs unconditionally on every Vercel build against the *only* database that exists (prod, per CONCERNS.md — no separate local/dev DB, no staging gate), an embedding-dimension mismatch, a botched `CREATE EXTENSION vector`, or an oversized initial backfill migration (embedding hundreds of book chunks synchronously during a migration/build step) risks a failed or slow production deploy with no rollback gate.

**Why it happens:**
Vector-column migrations feel like "just another Prisma migration" but they differ in two ways this project isn't set up to handle gracefully: (1) they often require a one-time data-population step (running the embedding API over all chunks) that doesn't fit cleanly into a schema migration and shouldn't run inside `vercel-build.sh`, and (2) index type choice (no index vs IVFFlat vs HNSW) depends on row count, which is unknowable in advance for a growing personal book library.

**How to avoid:**
- Enable the extension and create the schema (empty vector column) as a normal migration; run the actual embedding backfill as a separate one-off script invoked manually (or an API route triggered manually), never inside the build/migrate step
- Given the corpus size here is a handful of personal reference books (not 100k+ rows), skip building an ANN index (IVFFlat/HNSW) initially — a vector column with sequential scan is fine under ~10k rows per common guidance, and this project's chunk count will likely be far below that; revisit only if retrieval latency becomes a measured problem
- Test the migration path once against a throwaway local/branch DB if at all possible before it touches the shared prod DB (Neon supports DB branching — worth using here specifically, even though the project doesn't use it elsewhere, given migrations to a new extension are qualitatively riskier than the additive `Json`-column migrations this project has done before)

**Warning signs:**
- A deploy takes noticeably longer than prior deploys after the RAG migration ships (sign that embedding backfill got bundled into the migration/build path)
- `prisma migrate deploy` failing mid-way on `CREATE EXTENSION` (Neon plan/permission issue) with no easy recovery since it's the only DB

**Phase to address:**
Book-RAG ingestion phase (schema/migration design), first task.

---

### Pitfall 5: Goal-tracking UI displays raw daily weight, producing discouraging noise instead of signal

**What goes wrong:**
Body weight fluctuates day-to-day from water retention, sodium, glycogen, training timing, and bowel contents — independent of actual fat-mass change. Multiple weight-tracking products (Happy Scale, MacroFactor, W8buddy) exist specifically to solve this UX failure: showing raw daily weight on a graph makes normal ±1-2kg noise look like "progress reversed," which is demotivating and can drive compulsive re-weighing or abandonment of tracking altogether. For this project specifically, weight data arrives from two sync sources (Hevy body measurements + Journal Santé) with irregular cadence and (per CONCERNS.md) carry-forward gap-filling logic in `lib/journal-sync.ts` that is untested — meaning the "raw" data feeding a naive graph may already contain silent carry-forward artifacts, compounding the noise problem.

**Why it happens:**
A literal "plot the numbers we have" graph is the fastest thing to build and is what most one-off personal trackers do first; the smoothing/trend layer is usually skipped as "polish" rather than recognized as the actual point of the feature for a body-recomposition goal.

**How to avoid:**
- Compute and display a trend line (e.g. exponentially-weighted moving average or a simple multi-day rolling average, the pattern used by Happy Scale/MacroFactor/W8buddy) as the primary visual, with raw daily points shown small/secondary (or optional) — never the raw series alone as the headline number
- Pair scale weight with at least one non-scale signal already available in this app (photo-based visual analysis, measurements/circumference from Journal Santé, strength/volume progression from Hevy) so a "bad" weight week doesn't read as "no progress" when other signals are positive — directly serves the user's own stated goals (fat loss AND lean mass gain AND strength progression, not weight alone)
- Explicitly label what's being shown ("trend" vs "today's reading") so the two are never visually confused

**Warning signs:**
- Goal-progress graph shows a jagged sawtooth with no smoothing applied
- A single high-sodium day or post-workout weigh-in visibly reads as "regression" on the goal gauge
- No secondary metric (photo/measurement/strength) surfaced alongside weight on the same progress view

**Phase to address:**
Goal/progress-tracking UI phase — core requirement of the phase, not a later refinement.

---

### Pitfall 6: Conflating "weight loss" with "fat loss" in the goal model itself

**What goes wrong:**
The user's stated goal is explicitly body recomposition (lose 10-15kg of fat mass while also gaining lean muscle) — a case where scale weight is a *poor* proxy for the actual goal, since simultaneous muscle gain partially offsets fat loss on the scale. A goal UI that models progress purely as "current weight → target weight" will understate real progress (muscle gained masks fat lost) and can actively discourage a user who is recomposing successfully but sees a flat or slow-moving scale number.

**Why it happens:**
"Track weight toward a target weight" is the default mental model for a weight-loss goal and is what most simple tracker UIs default to, even when the user's actual goal (stated in PROJECT.md: "perte de masse grasse... prise de masse propre... définition musculaire") is explicitly a composition change, not a scale-weight change.

**How to avoid:**
- Model the goal around available fat-mass/composition proxies this app already collects (body measurements/circumferences from Journal Santé, the AI-estimated "physique score"/segment analysis from the morpho pipeline) rather than scale weight alone as the primary progress axis
- If body-fat percentage isn't directly measured (no DEXA/calipers mentioned in PROJECT.md), be honest in the UI that photo-based AI estimates and circumference trends are directional indicators, not precise body-fat measurements — avoid presenting an AI-estimated body-fat number with false precision (e.g. "18.3%") when the underlying method (photo analysis) doesn't support that precision
- Track strength/volume progression (already available from Hevy sync) as a first-class recomposition signal alongside weight/measurements, since strength maintenance/gain during a cut is itself evidence of muscle retention

**Warning signs:**
- Goal UI's primary "progress %" is computed solely from `(start_weight - current_weight) / (start_weight - target_weight)`
- No measurement/strength/visual signal factored into the headline progress number
- AI-estimated body-fat percentage displayed with decimal precision implying an accuracy the input method can't support

**Phase to address:**
Goal/progress-tracking UI phase — goal-model design, before any graph/gauge UI is built.

---

### Pitfall 7: Unrealistic or rigid timelines baked into the goal UI

**What goes wrong:**
A goal-tracking UI that lets the user (or worse, auto-computes) a linear date-based target — "10kg by [date 8 weeks from now]" — sets up a guaranteed-failure framing, since sustainable fat loss is broadly ~0.5-1% of bodyweight per week, and recomposition (simultaneous fat loss + muscle gain) is slower than fat loss alone and highly non-linear week to week. For someone with 10-15kg of fat to lose, a realistic timeline is likely 6+ months, not weeks; a UI that shows a straight-line "expected" trajectory from day 1 to goal will make completely normal plateaus or slow weeks look like failure against the app's own displayed expectation.

**Why it happens:**
A straight line between "start" and "goal by date X" is the simplest thing to draw on a chart, and users often want to set a target date even though physiology doesn't cooperate with fixed dates.

**How to avoid:**
- If a target date is shown at all, derive the "expected" pace from evidence-based rates (~0.5-1% bodyweight/week fat loss; slower for recomposition) rather than letting an arbitrary user-picked date define a linear slope — or avoid a fixed end-date framing entirely and instead show rate-of-progress (trend slope over recent weeks) against a healthy-rate reference range
- Design the progress UI around "are you in a healthy/expected rate range" rather than "are you on pace for date X" — this reframes a slow week as "still within healthy range" rather than "behind schedule"
- Surface this as an explicit non-goal in the UI copy: recomposition is not linear, expect plateaus

**Warning signs:**
- UI shows a straight dotted "target line" from start to a fixed end date with no basis in physiological rate limits
- No indication anywhere in the UI of what a "normal" weekly rate of change looks like, so any deviation reads as unexplained failure

**Phase to address:**
Goal/progress-tracking UI phase — goal-model and target-setting design.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Storing raw book-chunk text instead of paraphrased/structured extractions | Faster to implement, higher retrieval fidelity short-term | Copyright/redistribution exposure; harder to guarantee no verbatim leakage in logs/UI | Never, for this project — user has explicitly flagged copyright as a hard constraint (PROJECT.md) |
| Always retrieving top-K chunks and prepending to every Vision call | Simple to wire up | Cost/latency creep on routes already near the 120s timeout ceiling | Only acceptable for a first throwaway prototype, never for the shipped version |
| Bundling the embedding backfill into the Prisma migration/build step | One less script to write/run manually | Risk of a slow/failed prod build with no rollback path (single shared DB) | Never — always run backfills as a separate manual step |
| Plotting raw daily weight with no smoothing | Fastest chart to ship | Discouraging UX, possible abandonment of tracking | Only as a very first internal draft, not the shipped goal UI |
| Linear date-based target line for fat-loss goal | Simple UI, satisfies "show me a date" instinct | Sets up guaranteed "behind schedule" framing against normal biological variance | Never for the primary progress view; acceptable only as an optional/secondary "if you want a date estimate" toggle |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| pgvector on Neon | Assuming ANN indexing (IVFFlat/HNSW) is required immediately | Skip indexing below ~10k rows (this project's book corpus is small); add an index only if retrieval latency is measured to be a problem |
| Claude Vision + retrieved context | Concatenating all retrieved chunks unconditionally into the system prompt on every call | Cap total injected tokens, retrieve only chunks relevant to the specific muscle groups/exercises in the current analysis |
| Google Drive PDF ingestion | Treating the "link with access" sharing setting as a permanent access guarantee for an automated ingestion job | Verify the ingestion script's auth/access survives link expiry or permission changes; fail loudly (not silently skip) if a PDF can't be fetched during ingestion |
| Existing sync data (Hevy + Journal Santé) feeding the goal UI | Assuming the measurement history is complete/regular; building the goal graph directly off raw synced rows | Reuse/validate against the same carry-forward logic already in `lib/journal-sync.ts`, and be aware it is untested (per CONCERNS.md) — a goal-progress regression could stem from an existing sync bug, not the new feature |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No caching of embeddings/retrieval per exercise or muscle group | Every Vision call re-embeds the query and re-queries the vector store | Cache retrieval results keyed by exercise/muscle-group tag, since the book corpus changes rarely | Noticeable once RAG retrieval is added to routes already near 120s (weekly/video analysis) |
| Full-corpus sequential scan on every retrieval query | Retrieval latency creeps up as more books/chunks are added | Fine at current scale (a few books); revisit only if corpus grows into the thousands of chunks | >10k chunk rows per general pgvector guidance |
| Synchronous embedding backfill during ingestion of new PDFs | Long-running ingestion script or (worse) a migration/build step that times out | Run backfill as a background/manual script with progress logging, not inside `vercel-build.sh` | As soon as more than a few dozen chunks need embedding at once |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging full retrieved chunk text (or full PDF extraction output) to Vercel function logs during development/debugging | Copyrighted text persists in log retention outside the app's own DB access controls | Log chunk IDs/metadata only, never full text, in any ingestion or retrieval debug logging |
| Leaving a one-off PDF-extraction/embedding script at the repo root (matching the existing pattern of committed one-off scripts flagged in CONCERNS.md) | Book text or extraction artifacts could end up committed if a script writes intermediate output files into the repo | Write any intermediate extraction/debug output to a gitignored directory (or the scratchpad-equivalent), never the repo root |
| Treating the Google Drive "link with access" PDFs as safe to fetch from a public API route without validating the caller | An ingestion endpoint that fetches from Drive and writes to the DB, if exposed as a public route, could be triggered by anyone | Gate any ingestion trigger route behind the existing session-cookie auth, same as other mutating routes |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Raw daily weight graph as the goal-progress headline | Discouragement from normal water-weight noise; possible tracking abandonment | Trend/smoothed line as primary, raw points secondary |
| Single scale-weight number as "the" progress metric for a recomposition goal | Muscle gain masking fat loss reads as "no progress" | Composite view: weight trend + measurements + strength/volume + photo-based estimate |
| Linear date-based target line | Normal plateaus read as "falling behind" | Rate-of-progress framing against an evidence-based healthy-rate range, not a fixed end date |
| AI-estimated body-fat % shown with false decimal precision | Overconfidence in an estimate the method can't support, followed by disillusionment when it "doesn't match" other measurements | Present as a range or qualitative trend ("estimated, trending down") rather than a precise percentage |
| Book-derived advice quoting book prose closely in emails/UI | Feels like a wall of dense reference text rather than personalized coaching (and edges toward the copyright concern above) | System prompt instructs paraphrase/application of the cue to the user's specific context, not reproduction |

## "Looks Done But Isn't" Checklist

- [ ] **Book-RAG ingestion:** Often missing a paraphrase/summarization step — verify chunks stored in the DB are not near-verbatim book prose
- [ ] **Book-RAG retrieval wired into Vision prompts:** Often missing a token/relevance cap — verify total injected context per call has an explicit ceiling and isn't "all matching chunks"
- [ ] **Goal/progress UI:** Often missing trend smoothing — verify the headline number/line is a smoothed trend, not the latest raw sync value
- [ ] **Goal/progress UI:** Often missing a secondary signal — verify at least one non-scale-weight metric (measurement, strength, photo estimate) is visible on the same view
- [ ] **Vector migration:** Often missing separation of schema migration vs. data backfill — verify the embedding backfill does not run inside `prisma migrate deploy`/`vercel-build.sh`
- [ ] **Timeout handling on RAG-augmented Vision calls:** Often missing — verify a timeout wraps the retrieval step itself, consistent with the existing `withTimeout()` pattern in `lib/morpho.ts`

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Chunking produces bad retrieval after launch | LOW-MEDIUM | Re-chunk from source PDFs with structure-aware splitting and re-embed; since chunks/embeddings are derived data (not source of truth per the "documents vs chunks vs embeddings" schema pattern), this is a data-only fix, not a schema rewrite, if the schema separates these concerns from the start |
| Verbatim book text discovered already stored/logged | MEDIUM | Purge affected rows/log entries, switch ingestion to paraphrased extraction, re-ingest; audit git history for any accidental commit of extraction output |
| Vision routes start timing out after RAG launch | LOW | Add/lower a token cap on injected context and add a timeout wrapper around retrieval; this is an additive fix, not a redesign, if retrieval was built as a separate composable step from prompt-building |
| Goal UI shipped with raw-weight-only graph, users find it discouraging | LOW | Add trend-smoothing computation as a follow-up (pure function over existing data, no schema change) and swap the default view |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Chunking destroys technique reasoning | Book-RAG: ingestion/chunking | Manual spot-check of top-3 retrieved chunks for 5 representative queries reads as self-contained and answerable |
| Cost/latency blowup from context injection | Book-RAG: integration into Vision prompts | Compare Vercel function duration + Anthropic token usage before/after RAG launch on weekly/video routes |
| Copyright/redistribution risk of stored book text | Book-RAG: ingestion schema design | Confirm DB stores paraphrased/structured facts, not verbatim prose; confirm no chunk text appears in logs, emails, or UI |
| Vector migration risk on shared prod DB | Book-RAG: ingestion schema design (first task) | Migration only creates schema/extension; backfill run as a separate manual script; ideally tested on a Neon branch first |
| Discouraging raw-weight UX | Goal-tracking: UI design | Progress view's primary line is a smoothed trend; raw points are secondary/optional |
| Weight-loss/fat-loss conflation | Goal-tracking: goal-model design | Progress % is computed from a composite (measurements/strength/photo signal), not scale weight alone |
| Unrealistic/rigid timeline | Goal-tracking: goal-model design | No fixed linear target-date line as the primary framing; healthy-rate range is shown for context |

## Sources

- [23 RAG Pitfalls and How to Fix Them](https://www.nb-data.com/p/23-rag-pitfalls-and-how-to-fix-them) — chunking failure modes (MEDIUM confidence, cross-referenced with multiple sources below)
- [Your Chunks Failed Your RAG in Production](https://towardsdatascience.com/your-chunks-failed-your-rag-in-production/) — boundary/context-loss failure modes
- [Common Challenges in RAG and How to Solve Them in Production | Unstructured](https://unstructured.io/insights/rag-pipeline-challenges-from-data-ingestion-to-retrieval) — ingestion-to-retrieval pipeline issues
- [Seven RAG Pitfalls and How to Solve Them | Label Studio](https://labelstud.io/blog/seven-ways-your-rag-system-could-be-failing-and-how-to-fix-them/)
- [PostgreSQL pgvector and RAG: Best Practices](https://postgresqlhtx.com/postgresql-pgvector-and-rag-best-practices-and-examples-for-better-results/) — chunk size, indexing thresholds (MEDIUM confidence)
- [The pgvector extension - Neon Docs](https://neon.com/docs/extensions/pgvector) — official Neon documentation (HIGH confidence)
- [Building a RAG Server with PostgreSQL - Part 2 | pgEdge](https://www.pgedge.com/blog/building-a-rag-server-with-postgresql-part-2-chunking-and-embeddings) — schema separation (documents/chunks/embeddings) pattern
- [New Copyright Concerns in Retrieval Augmented Generation (RAG)](https://eu.36kr.com/en/p/3422429684387205) — Dow Jones v. Perplexity AI RAG copyright litigation (MEDIUM confidence, single source on an evolving legal topic — treat as directional, not legal advice)
- [RAG Security: Vector & Embedding Weaknesses | OWASP LLM08](https://www.a10networks.com/glossary/rag-security/) — embedding inversion risk
- [RAG is Dead, Long Live RAG | LightOn](https://lighton.ai/lighton-blogs/rag-is-dead-long-live-rag-retrieval-in-the-age-of-agents) — cost/latency of blanket retrieval vs. conditional/routed retrieval
- [A Review of the Macrofactor Macro-Tracking App](https://outlift.com/macrofactor-review/) — trend-weight approach to noisy scale data
- [Body Graph - weight, fat, water & muscle tracking App](https://apps.apple.com/us/app/body-graph-weight-fat-water-muscle-tracking/id878553602)
- [W8buddy recomposition tracker](https://www.w8buddy.com/en/) — 5-day smoothing approach
- [Precision Nutrition: Realistic rates of fat loss and muscle gain](https://www.precisionnutrition.com/rates-of-fat-loss-and-muscle-gain) — evidence-based weekly rate ranges (MEDIUM-HIGH confidence, established sports-nutrition source)
- [Harvard Health: What does a healthy, realistic rate of weight loss look like](https://www.health.harvard.edu/weight-loss/what-does-a-healthy-realistic-rate-of-weight-loss-look-like-and-why-does-it-matter) — 1-2 lb/week guidance (HIGH confidence, institutional source)
- [How Long Does Body Recomposition Take? | Gaspari Nutrition](https://gasparinutrition.com/blogs/fitness-facts/how-long-does-body-recomposition-take-a-realistic-timeline) — 12-16 week minimum timeline for visible recomposition change
- `.planning/codebase/CONCERNS.md` — project-specific technical debt (shared prod DB, no timeout on Claude morphology call, push-direct-to-main workflow, untested sync carry-forward logic) used to ground generic pitfalls in this codebase's actual constraints
- `.planning/PROJECT.md` — user's explicit copyright constraint and stated recomposition goals

---
*Pitfalls research for: PDF-grounded RAG on an existing Claude Vision pipeline + body-recomposition goal tracking (solo Next.js/Prisma/Neon app)*
*Researched: 2026-07-01*
