# Stack Research

**Domain:** Adding (a) a goal-progress dashboard UI and (b) lightweight PDF-based RAG to an existing single-user Next.js 16 / Prisma / Neon Postgres / Vercel / Claude app
**Researched:** 2026-07-01
**Confidence:** HIGH (charting, pgvector-on-Neon, PDF text extraction) / MEDIUM (embedding model choice, exact contextualized-embeddings pricing tier limits)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Recharts | ^3.9.1 | Charting library for the goal-tracking dashboard (progress bars/gauges, volume & strength trend lines) | Declared peer deps (`react ^19.0.0`, `react-dom ^19.0.0`, `react-is ^19.0.0`) match the app's pinned React 19.2.4 exactly — no `--legacy-peer-deps` override needed. It's the de facto standard React charting library and is the engine behind shadcn/ui's official chart components, so there is a huge corpus of current, copy-pasteable patterns (area/bar/line/radial) to adapt to the app's existing red/black/gold Tailwind v4 theme. Confidence: HIGH (verified via `npm view` against the live registry). |
| Neon `pgvector` extension | 0.8.0 (current on Neon) | Vector storage + similarity search for the reference-book RAG, inside the *existing* Neon Postgres database | Neon ships pgvector on every plan at no extra cost, enabled per-database with a single `CREATE EXTENSION IF NOT EXISTS vector;`. 0.8.0 adds HNSW index build/insert performance improvements and iterative index scans (fixes the classic "vector search + WHERE filter" over-filtering problem) — plenty for a personal-scale corpus (a handful of books → low tens of thousands of chunks at most). This is the single most important decision for phase 2: it means **no new infrastructure service** is needed for RAG. Confidence: HIGH (Neon docs). |
| Voyage AI `voyage-context-3` (or `voyage-context-4`) | contextualized-embeddings API, `2026-06` | Text embedding model for book chunks + queries | Anthropic does not ship its own embedding model and officially recommends Voyage AI as its embeddings partner (Voyage is now part of MongoDB but operates as an independent API). The **contextualized chunk embeddings** endpoint (`POST /v1/contextualizedembeddings`) is purpose-built for exactly this use case: it embeds each chunk *with awareness of its parent document/chapter*, which measurably improves retrieval accuracy over naively embedding isolated chunks — without hand-rolled "prepend a summary to each chunk" tricks. `voyage-context-4` (released 2026-06-29, i.e. two days before this research) is cheaper ($0.12/1M tokens vs $0.18/1M for `-context-3`) and benchmarks higher, but is extremely new; `voyage-context-3` (GA since mid-2025) is the safer default if you want a track record. Confidence: MEDIUM — model capability/pricing confirmed via Voyage's own docs/blog, but `-context-4` has no independent third-party validation yet at time of research. |
| unpdf | ^1.6.2 | PDF → text extraction during (offline) book ingestion | Pure-JS wrapper around a serverless-optimized build of Mozilla's PDF.js. Critically, `extractText`/`getDocumentProxy` have **no native dependency** (the only native dep, `@napi-rs/canvas`, is used solely by the optional `renderPageAsImage` helper, which this project doesn't need). This avoids the classic "works on my machine, breaks on Vercel's Lambda" native-binding mismatch that plagues `pdf-parse`. Confidence: HIGH (verified README + `npm view` dependency tree). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@prisma/client` / `prisma` | ^5.22.0 (keep existing pin) | Reads/writes for the new `Goal` and `ReferenceChunk` models | **Do not bump Prisma** for this milestone. Native `vector` column support is only landing in Prisma's *next* major line (their own blog explicitly frames pgvector-in-schema as a Prisma-Postgres-specific, in-progress feature) — upgrading a production app's ORM major version to get a feature you can already get with `Unsupported("vector(1024)")` + `$queryRaw` is scope creep the project constraints explicitly warn against. |
| (no new client SDK — raw `fetch`) | n/a | Calling the Voyage AI embeddings API | The codebase's established convention (`lib/claude.ts`, `lib/heavy.ts`, `lib/journal-sante.ts`) is a hand-rolled `fetch` wrapper per external API, not an SDK. An official `voyageai` npm SDK exists (v0.4.0) but pulling it in breaks that convention for a one-endpoint integration; a `lib/voyage.ts` mirroring `ClaudeClient`'s shape (constructor takes `VOYAGE_API_KEY`, private `request()` helper) is ~40 lines and keeps the codebase style consistent. |
| Custom chunker (no library) | n/a | Splitting extracted book text into chunks before embedding | For a handful of French technical books, a ~30-line paragraph-aware splitter (split on blank lines / headings, merge until a word-count budget, keep page numbers from `unpdf`'s per-page extraction) is sufficient. Do not add LangChain/LlamaIndex text splitters just for this (see "What NOT to Use"). |
| tsx | ^4.x (already a devDependency) | Running the one-off ingestion script | The project already runs `prisma/seed.ts` via `tsx` (`npm run seed`). Add a sibling script, e.g. `scripts/ingest-books.ts`, run the same way — no new tooling needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Neon SQL Editor / `psql` | One-time `CREATE EXTENSION IF NOT EXISTS vector;` + HNSW index creation | Run once per database (pgvector is enabled per-database, not per-project — if there's a separate preview/branch DB, enable it there too). Can also be scripted into a Prisma migration's `migration.sql` so it's versioned like every other schema change. |
| `tsx scripts/ingest-books.ts` (local script, not a Vercel route) | PDF ingestion pipeline: extract → chunk → embed → insert | Deliberately **not** an API route. Ingesting 2-4 books happens rarely (once, plus maybe once per newly acquired book) — running it from a developer machine against `DATABASE_URL` (same pattern as the existing seed script) sidesteps Vercel's function-duration limits entirely instead of fighting them. |

## Installation

```bash
# Core — goal-tracking dashboard
npm install recharts@^3.9.1

# Core — RAG ingestion + retrieval
npm install unpdf@^1.6.2
# No embeddings SDK — lib/voyage.ts wraps fetch directly (see rationale above)

# Dev-only — nothing new; reuse existing tsx for the ingestion script
```

No changes needed to `prisma`/`@prisma/client` versions.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Recharts | Tremor (Raw/Blocks) | If you want prebuilt, opinionated dashboard *blocks* (KPI cards, full page layouts) rather than composable chart primitives. Tremor was acquired by Vercel in early 2026 and is improving, but as of this research still has open Tailwind v4 styling-conflict reports (utility classes not applying after a v4 upgrade) — riskier for an app already deep in hand-rolled Tailwind v4 theming. Revisit once Tailwind v4 support is explicitly marked stable in Tremor's changelog. |
| Recharts | visx (Airbnb) | If you need fully custom/novel visualizations (e.g. an unusual anatomical body-map gauge) where Recharts' chart-type abstractions get in the way. Much lower-level (you build the SVG yourself), more code for standard gauges/line charts — not worth it for "progress vs target" bars and trend lines. |
| Neon `pgvector` (in existing DB) | Pinecone / Weaviate / Qdrant Cloud / Turbopuffer | Only if the corpus were expected to grow into the millions of chunks with heavy concurrent query load — none of which applies to "3-4 personal reference books." Adding a separate vector DB service here would be pure infrastructure overhead: another API key, another network hop, another bill, another thing that can be down, for a workload Postgres handles trivially at this scale. |
| `voyage-context-3`/`-4` (contextualized) | `voyage-4` / `voyage-4-lite` (standard, non-contextualized embeddings) | If ingestion pipeline simplicity trumps retrieval quality, or if chunk-level context doesn't matter for your content (e.g. short independent FAQ entries rather than book chapters where a chunk like "3 séries de 8-12 répétitions" is meaningless without knowing which exercise/chapter it's from). For Delavier/Gundill/Lesueur-style books, contextualized embeddings are worth the (small) extra complexity. |
| unpdf | `pdf-parse` (2.x) | Avoid for this project — see "What NOT to Use." Only reach for `pdf-parse` if you specifically need its table/structured-data extraction and are willing to accept the native-dependency risk. |
| Raw `fetch` wrapper for Voyage | Official `voyageai` npm SDK (v0.4.0) | If you expect to use many more Voyage endpoints/features (reranking, multimodal embeddings) where hand-rolling would mean reimplementing significant SDK logic. For a single embeddings call, the SDK is unnecessary weight and breaks the codebase's established "no SDK, raw fetch" convention. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Sending full book PDFs to Claude via its native PDF/document support on every morpho or exercise-form analysis call | Claude's PDF support processes each page as *both* text and image — official guidance is ~1,500-3,000 text tokens per page *before* image tokens, and Delavier/Gundill-style books are hundreds of pages with heavy illustrations (image-heavy = more tokens, not fewer). Doing this per-request would blow the project's explicit cost/latency constraint and re-send (large chunks of) copyrighted book content on every single API call. | The RAG approach: embed once (offline script), retrieve only the top 3-5 relevant chunks (a few hundred words total) per request, inject as a compact French-language context block — same pattern already used for `buildHevyContext`/`buildNutritionContext` in `lib/morpho.ts`. |
| A dedicated vector database service (Pinecone, Weaviate Cloud, Qdrant Cloud, etc.) | Adds a new paid service, a new API key/secret to manage, a new network dependency in the request path, and operational surface area — for a corpus that will realistically be a few thousand to low tens-of-thousands of chunks. This directly contradicts the "no heavy new infra unless clearly necessary" requirement, and it is not necessary at this scale. | pgvector extension on the existing Neon Postgres database (see Core Technologies). |
| A background job runner / queue (Inngest, BullMQ + Redis, Vercel Queue/Workflows, etc.) for PDF ingestion | Ingestion of 2-4 books is a rare, one-off (or occasional) operation, not a recurring or user-triggered workload that needs durability/retries infrastructure. Standing up a queue system for "run this a handful of times total" is disproportionate infra for the job, and it's the kind of infra the milestone context explicitly says to avoid unless clearly necessary. | A local Node script run with `tsx` (same pattern as the existing `prisma/seed.ts`), executed by the developer against the production `DATABASE_URL` when a new book needs to be ingested. If re-ingestion via the UI is ever wanted later, it can be a manually-triggered admin route with `maxDuration` tuned per book — not a queue. |
| `pdf-parse` 2.x | Version 2's `dependencies` (not `peerDependencies`) hard-require `@napi-rs/canvas`, a native (prebuilt-binary) module, even though the project only needs plain text extraction. Native modules are a recurring source of "works locally, breaks on Vercel" platform-mismatch bugs, and this dependency is entirely unnecessary for the text-only use case here. | `unpdf`, which is pure JS for text extraction and only pulls in `@napi-rs/canvas` for an image-rendering helper this project won't call. |
| LangChain / LlamaIndex (`RecursiveCharacterTextSplitter`, document loaders, etc.) just for PDF chunking | These frameworks pull in large dependency trees (LLM provider abstractions, vector-store integrations, agent tooling) for a need that is, in this project, "split some French book text into ~300-500 word chunks." The codebase has zero framework-style dependencies today (everything is hand-rolled `fetch` + `lib/` modules) — introducing one of these frameworks purely for a text splitter is a disproportionate dependency for the value gained. | A small custom chunking function (paragraph-aware, word-count budget, retains page numbers from `unpdf`'s per-page extraction) — see Supporting Libraries. |
| Upgrading Prisma to a version with native `vector` type support | Prisma's native pgvector column type is being built out incrementally and, per Prisma's own communications, is closely tied to *Prisma Postgres* (their own hosted DB product) rather than "any Postgres with the extension installed" — and it would mean a major-version ORM bump in a live production app for a feature that already has a clean workaround. | `Unsupported("vector(1024)")` in `schema.prisma` for the column definition (so migrations still create the real column with the real Postgres type) + `$queryRaw`/`$executeRaw` for all reads/writes/similarity queries against that column, exactly as Prisma's own docs recommend for extension types it doesn't natively model yet. |

## Stack Patterns by Variant

**If the books turn out to be very large (400+ pages, dense) such that a single contextualized-embeddings request would exceed Voyage's 120K-token / 16K-chunk per-request limits:**
- Group chunks by chapter (or by every N pages) as separate "documents" within the `inputs` array of the same `POST /v1/contextualizedembeddings` call, or issue one call per chapter.
- Because contextualization only applies *within* a document group, this is not just a batching workaround — chaptering is usually the *semantically correct* unit anyway (a "chest exercises" chapter and a "nutrition" chapter shouldn't share context).

**If retrieval quality from `voyage-context-3`/`-4` ever proves insufficient (e.g. queries in French return poor matches against French book text):**
- Voyage's models are explicitly multilingual and benchmarked on multilingual retrieval; this is unlikely to be the failure mode. More likely causes are chunk size/boundaries or query formulation — tune those first before switching models.

**If a future milestone wants full multi-book, multi-thousand-page scale (well beyond "3-4 personal reference books"):**
- Revisit the "no dedicated vector DB" recommendation — pgvector on Neon remains fine into the low millions of vectors with HNSW, but at that point a managed vector service starts making more operational sense. Not a concern for this milestone.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `recharts@3.9.1` | `react@19.2.4`, `react-dom@19.2.4` (already pinned in the app) | Confirmed via the published package's `peerDependencies` (`react/react-dom/react-is: ^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0`) — no `--legacy-peer-deps` flag needed, unlike Recharts 2.x-era React 19 reports. |
| `unpdf@1.6.2` | Next.js 16 API routes with `export const runtime = 'nodejs'` | Text extraction works without native deps, but still needs the Node.js runtime (not `edge`) because of how it shells out to Node APIs internally for buffer handling — consistent with how this app already forces `runtime = 'nodejs'` on its Claude-vision routes. Not relevant for the ingestion script itself (that runs in plain Node via `tsx`, not inside a Vercel function at all). |
| pgvector `0.8.0` (Neon) | Postgres versions Neon currently supports | HNSW index creation works without a training/build step (unlike IVFFlat), so the index can be created immediately after the extension, even before any rows exist — convenient for a migration file. |
| `Unsupported("vector(1024)")` (Prisma 5.22) | Any Prisma 5.x/6.x version, no preview flag required | `Unsupported` is a stable (non-preview) schema feature; the column is created with the literal SQL type on `migrate dev`/`migrate deploy`, but is invisible to Prisma Client's typed query API — all access must go through `$queryRaw`/`$executeRaw`, exactly like the raw-SQL patterns already implied by this project's "thin `lib/` service" convention. |

## Sources

- Neon Docs — pgvector extension: https://neon.com/docs/extensions/pgvector (HIGH — official, verified "no add-on/paid tier", per-database enablement, current version)
- Neon Blog — pgvector 0.8.0 / HNSW iterative index scans: search-verified via Neon changelog + `thenile.dev` pgvector 0.8.0 announcement (MEDIUM-HIGH — corroborated across two independent sources)
- Prisma Docs / Blog — Postgres extensions & `Unsupported` types, ORM 6.13 pgvector-for-Prisma-Postgres post: https://www.prisma.io/docs/postgres/database/postgres-extensions, https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres (HIGH for `Unsupported` mechanism being stable; MEDIUM for scope of native vector support being Prisma-Postgres-specific — inferred from blog framing, not exhaustively cross-checked against Prisma's roadmap docs)
- Anthropic/Claude Platform Docs — PDF support: https://platform.claude.com/docs/en/build-with-claude/pdf-support (HIGH — official, current, includes explicit per-page token cost guidance used to justify the RAG-over-raw-PDF recommendation)
- Anthropic — embeddings guidance (no first-party embedding model, Voyage AI as recommended partner): corroborated via `claude-cookbooks` (`anthropics/claude-cookbooks/third_party/VoyageAI`) and multiple 2026 third-party comparison articles (MEDIUM — no single canonical current Anthropic docs page was successfully fetched for this specific claim, but it is consistent across all sources checked)
- Voyage AI Blog — `voyage-context-4` announcement (2026-06-29): https://blog.voyageai.com/2026/06/29/voyage-context-4/ (MEDIUM — official vendor source, but two days old at research time, no independent benchmarking found yet)
- Voyage AI Docs — contextualized chunk embeddings API reference: https://docs.voyageai.com/reference/contextualized-embeddings-api (HIGH — official API reference, request/response shape and limits confirmed directly)
- Voyage AI Docs — standard embeddings models/pricing: https://docs.voyageai.com/docs/embeddings (HIGH — official, current model lineup as of research date)
- npm registry (`npm view`) — live version/peer-dependency checks for `recharts`, `unpdf`, `pdf-parse`, `prisma`, `voyageai` (HIGH — verified directly against the registry at research time, not training data)
- unpdf README (via unpkg) + GitHub (`unjs/unpdf`): confirms no native dependency for text extraction (HIGH)
- shadcn/ui charts docs: https://ui.shadcn.com/docs/components/radix/chart (MEDIUM — corroborates Recharts v3 as the current standard pairing with Tailwind-based dashboards, used as supporting evidence rather than a primary decision driver)
- Vercel Docs — Functions duration/Fluid compute: https://vercel.com/docs/functions/configuring-functions/duration, https://vercel.com/docs/fluid-compute (HIGH — confirms generous duration ceilings exist if ever needed, reinforcing that ingestion doesn't need to be forced into a Vercel function at all)

---
*Stack research for: Coach AI — goal-tracking dashboard + reference-book RAG milestone*
*Researched: 2026-07-01*
