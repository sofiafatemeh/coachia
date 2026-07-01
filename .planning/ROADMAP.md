# Roadmap: Coach AI

## Overview

This milestone adds two independent capabilities on top of the already-shipped Coach AI app: a visual goal/progress-tracking UI over data that's already synced but currently unvisualized (Measurement, Workout, ExerciseSet, ProgressPhoto), and a PDF-ingested RAG layer that grounds the existing weekly morpho-analysis prompt in three reference training-methodology books (Delavier, Gundill, Lesueur). The goal UI ships first — zero new external dependencies, fully independent, highest immediately visible value. The RAG work follows in two phases: first the ingestion foundation (schema, embeddings client, offline ingestion script), then retrieval and prompt integration (wiring grounded advice into the existing weekly analysis with strict cost/latency guardrails).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Goal & Progress Tracking UI** - Users can set numeric goals and see smoothed trend/volume/photo progress toward them
- [ ] **Phase 2: Book RAG - Ingestion Foundation** - Reference books are ingested into structured, embedded, attributable chunks via an offline script
- [ ] **Phase 3: Book RAG - Retrieval & Prompt Integration** - Weekly morpho analysis advice is grounded in the ingested books, within strict token/time budgets

## Phase Details

### Phase 1: Goal & Progress Tracking UI
**Goal**: Users can define numeric goals and see clear, honest visual progress toward them using data already being synced (weight/body-fat trend, exercise volume/strength, progress photos).
**Depends on**: Nothing (first phase)
**Requirements**: GOAL-01, GOAL-02, GOAL-03, GOAL-04
**Success Criteria** (what must be TRUE):
  1. User can define a goal with target weight, target body-fat %, and an optional target date
  2. Dashboard shows a smoothed weight/body-fat trend line against the goal, not raw day-to-day noise
  3. User can view volume/strength progression per exercise, computed from existing Hevy-synced workout data
  4. User can view a chronological timeline of their progress photos
**Plans**: TBD
**UI hint**: yes

### Phase 2: Book RAG - Ingestion Foundation
**Goal**: The reference books (Delavier, Gundill, Lesueur) exist in the database as structured, embedded, attributable chunks, ready for retrieval — produced by a repeatable offline script, not a live API route.
**Depends on**: Nothing (independent of Phase 1; can run in parallel in principle, sequenced second)
**Requirements**: RAG-01
**Success Criteria** (what must be TRUE):
  1. Running the ingestion script turns the shared Google Drive PDFs into structured chunks (per exercise/muscle-group section, not arbitrary character splits) stored in the database
  2. Each stored chunk carries an embedding vector plus source attribution (book/author/section reference)
  3. The script can be re-run without duplicating or corrupting existing chunks
  4. No raw verbatim book text is exposed through any existing API route or page — chunks are only reachable by the retrieval layer built in Phase 3
**Plans**: TBD

### Phase 3: Book RAG - Retrieval & Prompt Integration
**Goal**: The weekly morpho analysis gives advice that is visibly grounded in the ingested books' methodology, paraphrased with light attribution, without risking the existing analysis route's timeout budget.
**Depends on**: Phase 2
**Requirements**: RAG-02, RAG-03
**Success Criteria** (what must be TRUE):
  1. Weekly morpho analysis recommendations reflect retrieved book content, paraphrased with lightweight author/book attribution — never verbatim quotes
  2. Retrieved context injected into the prompt stays within a fixed token budget regardless of corpus size
  3. Retrieval runs under a timeout wrapper so the weekly analysis route's total duration does not regress toward the Vercel time limit
  4. If retrieval fails, times out, or returns nothing, the weekly analysis still completes successfully using its existing (non-RAG) context
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Goal & Progress Tracking UI | 0/TBD | Not started | - |
| 2. Book RAG - Ingestion Foundation | 0/TBD | Not started | - |
| 3. Book RAG - Retrieval & Prompt Integration | 0/TBD | Not started | - |
</content>
