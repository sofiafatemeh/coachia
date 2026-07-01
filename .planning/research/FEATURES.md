# Feature Research

**Domain:** Personal body-recomposition / strength progress tracking + reference-methodology-grounded AI coaching (extension to an existing solo fitness coaching app)
**Researched:** 2026-07-01
**Confidence:** MEDIUM-HIGH (feature landscape for tracker #1 is well-established and corroborated across multiple products; RAG grounding patterns for #2 are HIGH confidence on the technique, MEDIUM on "what's proportionate for a 1-book-corpus solo app" since that's a judgment call, not an industry standard)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any serious body-recomp / strength progress tracker. Missing these makes the new tracking UI feel like a toy compared to the training/nutrition data the app already has.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Weight/body-fat trend line vs. numeric target | Every serious recomp tool (MacroFactor, Renaissance Periodization, RP Diet Coach) shows a smoothed trend line against a goal, not raw noisy daily weigh-ins | LOW | Data already exists (`Measurement` from Hevy/Journal Santé sync). Needs: (a) a `Goal` model (target weight, target body-fat %, target date), (b) a trend-smoothing calc (7-14 day moving average, not raw points — raw scale weight is too noisy to read as "progress"). |
| Strength/volume progression charts (per exercise & aggregate) | Strong, Hevy, StrengthLog, LiftTrack all offer this as core, non-optional UI (volume, best set weight, est. 1RM over time) | LOW-MEDIUM | `Workout`/`Exercise`/`ExerciseSet` already synced from Hevy — this is a pure read/aggregate + chart feature, no new data collection needed. Highest ROI item: data already exists but isn't visualized at all today. |
| Progress-photo timeline / before-after comparison | Every recomp-tracking app (GainFrame, Body Tracker, Progress App, ZOZOFIT) treats a chronological photo strip or side-by-side slider as baseline | LOW-MEDIUM | `ProgressPhoto` rows already exist (weekly morpho uploads) but are only shown as "latest analysis," never as a timeline. Needs a gallery/timeline view + a "compare any two dates" picker. |
| Numeric goal-progress summary ("X kg to go", % to target) | MacroFactor's "Goal Progress" screen (waterfall chart per week toward goal) is the reference pattern; users expect a single at-a-glance number, not just a raw chart | LOW | Simple derived UI once a `Goal` model exists: `(start - current) / (start - target)`. |
| Personal-record (PR) tracking per exercise | Standard in Strong/Hevy — best weight, best est. 1RM, best volume-in-a-session, with date achieved | LOW | Derivable from existing `ExerciseSet` data; no schema change needed, just a query + badge in UI. |

### Differentiators (Competitive Advantage)

Features that go beyond a generic tracker because they combine data sources this app already uniquely has (AI morpho scoring, exercise notes, weekly photo+training+nutrition correlation).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI morpho-score trend overlay (segment scores over time, from existing `MorphoAnalysis`) | Most trackers (even GainFrame) show AI-derived scores per session but rarely trend them alongside numeric weight/volume data on the same timeline — this app already generates a weekly AI score per body segment, so plotting *that* trend is close to free | LOW-MEDIUM | `MorphoAnalysis` rows already store `segments`/`summary` per week — needs structuring the score into a comparable numeric field (may require a small schema/prompt tweak so Claude returns a consistent 0-100 score per segment instead of only free text) if not already numeric. |
| "Recomposition indicator" (dual-axis: body weight ~flat/slightly down + waist/measurement down + strength volume up) | Pure weight-loss framing hides recomposition progress (the user's actual goal is fat loss *and* clean muscle gain simultaneously, not just weight down) — a dedicated combined indicator is more honest feedback than a single weight trend line, and is rare even in premium trackers | MEDIUM | Requires correlating three already-synced series (weight, a chosen circumference measurement, training volume) into one "on track for recomp" heuristic + explanation text. This is the single most differentiating and most requested-in-spirit feature (matches user's actual goal better than any off-the-shelf tracker). |
| Milestone photo pinning / auto-flagging ("visible change" markers) | GainFrame-style correlation of photo + workout data; letting the user (or the AI, based on morpho score deltas) flag "this week showed visible progress" turns the photo timeline into a narrative, not just a bucket of images | MEDIUM | Can start as a manual pin/star on a `ProgressPhoto`; an AI-suggested "biggest visible change since last milestone" is a v2 nice-to-have layered on top, using existing morpho diff data. |
| Reference-methodology-grounded advice with traceable attribution (Delavier/Gundill/Lesueur) | No mainstream consumer fitness app grounds AI advice in a named, citable training methodology — this is the actual novel value proposition of feature #2, differentiating "coach who read the books" from "generic LLM fitness chatbot" | MEDIUM-HIGH | See RAG section below. Table-stakes-adjacent because it's explicitly requested, but implementation is nontrivial — treat the retrieval-and-attribution mechanism itself as the differentiator, not just "the AI mentions a book title." |
| Cross-author synthesis (biomechanics selection + programming philosophy + specific variant cues, combined per recommendation) | Delavier (morphology-based exercise selection/biomechanics), Gundill (programming/physiology), and Lesueur (movement-specific coaching cues) cover different angles — synthesizing across all three per recommendation (rather than picking one source per query) is a differentiator over a single-book RAG | MEDIUM | Depends on retrieval returning multiple sources per query and the prompt explicitly asking Claude to reconcile/attribute across them, not just concatenate. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Social sharing / leaderboards / friends / community feed | "Standard" in mainstream fitness apps (Strava-style) | Explicitly out of scope per PROJECT.md — solo/single-user app, no multi-tenancy planned; building any social surface implies user accounts, privacy controls, moderation — pure waste for a personal tool | None needed; if ever revisited, gate behind the (currently unplanned) monetization/multi-user decision |
| Generic gamification (streaks, badges, XP, levels) | Common engagement pattern in consumer fitness apps | This is a serious, self-motivated single user already tracking real data — synthetic gamification adds noise without informing training/nutrition decisions and contradicts the "premium personal coach" tone (a real coach doesn't hand out badges) | Milestone photo pinning + PR tracking already provide genuine, data-backed "wins" without artificial reward loops |
| Dedicated vector-database service (Pinecone/Weaviate/Qdrant) for the reference-book RAG | "Proper" RAG stacks in tutorials/blog posts default to a managed vector DB | Massive overkill for a corpus of 3 books (a few hundred pages, likely low thousands of chunks) queried by exactly one user — adds a new paid service, new env vars/secrets, and an extra external dependency for a workload `pgvector` on the already-provisioned Neon Postgres handles trivially at this scale | Use the `pgvector` extension already available on Neon (same DB as everything else) — a single `embedding vector(1536)` column + cosine-similarity query is sufficient; see STACK research |
| Full RAG orchestration framework (LangChain/LlamaIndex) with agentic multi-step retrieval | Default recommendation in most RAG how-to content | Adds a large dependency surface and abstraction overhead for what is, at this scale, "embed query → top-k cosine search → paste into existing prompt-context-builder pattern" — the codebase already has this exact pattern (`buildHevyContext`, `buildNutritionContext` in `lib/morpho.ts`), just needs a `buildMethodologyContext()` sibling function | Plain SQL similarity query + a new pure function following the existing prompt-context-builder convention; no new framework |
| Fine-tuning a model on the book content | "Most grounded" approach in theory | Expensive, slow to iterate, and — critically — requires feeding full copyrighted book text into a training pipeline, which is a much larger copyright-republishing risk than ephemeral RAG retrieval used only inside a single user's private prompts | RAG retrieval at query time; never persist full-book text in any committed artifact, keep the ingested corpus in the private DB only (already the plan per PROJECT.md constraints) |
| Verbatim-quote citation UI (showing exact excerpted book paragraphs in the app) | "Real" citation systems (academic RAG, legal RAG) show exact source text for verifiability | PROJECT.md explicitly forbids republishing book content verbatim anywhere in the app or committed docs (copyright) — a citation UI that displays raw excerpts would violate this constraint even if only visible to the single owning user, and increases exposure if the DB or screenshots are ever shared | Attribution by paraphrase/tag only: e.g. "Recommandation basée sur la sélection d'exercices par morphologie (méthode Delavier)" with book + concept name, never a quoted passage |
| Full page-accurate footnote/citation system (page numbers, hyperlinked references) | Standard in academic/enterprise RAG products | Disproportionate engineering for a single reader who already owns the physical books — page-perfect traceability adds real complexity (needs page-aware PDF parsing, not just text chunking) for marginal benefit over a coarser "book + chapter/topic" tag | Chunk-level metadata (book title + chapter/section heading extracted during ingestion) is enough for traceability; skip page-number precision |
| Real-time conversational AI coach chat (multi-turn chat thread with memory) | Natural extension once RAG exists — "why not just chat with the coach" | Large scope increase (conversation state, turn-taking UX, session memory) unrelated to the two requested features; the existing pattern (structured weekly/on-demand analyses with rich context) already outperforms open-ended chat for grounded, actionable advice | Keep RAG retrieval scoped to the existing structured analysis flows (morpho weekly, exercise notes, video form) — inject methodology context into those established prompts rather than building a new chat surface |

## Feature Dependencies

```
Goal model (target weight/body-fat/date)
    └──requires──> none new (independent, new Prisma model)

Weight/body-fat trend vs target chart
    └──requires──> Goal model
    └──requires──> existing Measurement data (already synced)

Strength/volume progression charts
    └──requires──> existing Workout/Exercise/ExerciseSet data (already synced, no new dependency)

Progress-photo timeline / compare view
    └──requires──> existing ProgressPhoto data (already stored weekly)

Recomposition indicator (dual/triple-axis)
    └──requires──> Weight/body-fat trend
    └──requires──> Strength/volume progression charts
    └──requires──> a chosen circumference measurement series (already synced from Hevy body measurements)

Milestone photo pinning
    └──requires──> Progress-photo timeline
    └──enhances──> AI morpho-score trend overlay (an AI-suggested milestone needs the score-delta data)

AI morpho-score trend overlay
    └──requires──> MorphoAnalysis numeric/structured score field
                       └──requires──> small prompt/schema tweak so Claude returns comparable per-segment scores (currently mostly free text)

Reference-methodology RAG ingestion (PDF → chunks → embeddings)
    └──requires──> pgvector extension enabled on Neon
    └──requires──> Google Drive PDFs accessible (link shared, restricted) — external precondition, not a code dependency

Methodology-grounded advice injection (buildMethodologyContext)
    └──requires──> Reference-methodology RAG ingestion
    └──enhances──> existing weekly morpho analysis prompt (lib/morpho.ts)
    └──enhances──> existing exercise-notes-informed video/photo analysis prompts

Cross-author synthesis
    └──requires──> Methodology-grounded advice injection
    └──requires──> retrieval returning >1 source per query (top-k >= 2-3, spanning authors)

Citation/attribution tags in UI
    └──requires──> Methodology-grounded advice injection
    └──conflicts──> Verbatim-quote citation UI (deliberately not building the conflicting anti-feature)
```

### Dependency Notes

- **Trend chart requires Goal model:** there is currently no place in the schema to store "10-15kg to lose" or a target body-fat % — this is the one required new persistence entity for feature #1; everything else (measurements, workouts, photos) already exists and only needs new read/aggregate/visualization code.
- **Recomposition indicator requires both trend chart and strength chart:** it's explicitly a synthesis of the other two — sequence it after both are built, not in parallel, since it visually/logically depends on their output shapes.
- **AI morpho-score trend requires a schema/prompt tweak first:** today `MorphoAnalysis.segments` is closer to free-form text; before it can be charted as a trend it needs a stable numeric shape (e.g. a `score` per segment key), which is a small but necessary prerequisite, not just a UI task.
- **Methodology-grounded advice enhances, not replaces, existing prompts:** the existing prompt-context-builder pattern (`buildHevyContext`, `buildNutritionContext`) is the template to follow for a new `buildMethodologyContext()` — this keeps the RAG feature additive to `lib/morpho.ts` rather than a parallel new pipeline.
- **Citation tags conflict with verbatim-quote UI:** these are mutually exclusive design choices for the same problem (traceability) — pick attribution-by-paraphrase given the copyright constraint in PROJECT.md, and do not also build a raw-excerpt viewer "just in case."

## MVP Definition

### Launch With (v1)

Minimum viable product for each of the two requested features.

**Goal/progress tracking UI:**
- [ ] `Goal` model (target weight, target body-fat %, optional target date, created/updated timestamps) — essential, nothing else in this feature works without it
- [ ] Weight/body-fat trend line (smoothed) plotted against target — essential, this is the core ask ("visual suivi vs objectif")
- [ ] Strength/volume progression chart per exercise (using existing Hevy data) — essential, explicitly requested ("progression en volume et en force")
- [ ] Progress-photo timeline (simple chronological gallery, no compare-slider yet) — essential for "définition musculaire/abdos visibles" since that goal is inherently visual, not numeric

**Reference-methodology-grounded AI:**
- [ ] PDF ingestion pipeline (Drive link → text extraction → chunking → embeddings → pgvector storage) — essential, nothing else works without ingested content
- [ ] `buildMethodologyContext()` retrieval function injected into the existing weekly morpho analysis prompt — essential, this is the actual "grounded advice" deliverable
- [ ] Lightweight attribution tag on AI advice referencing which book/author informed a recommendation — essential per the "traceable, not generic" requirement; without it the feature is indistinguishable from status quo

### Add After Validation (v1.x)

Features to add once the core v1 lands and the user has lived with it for a few weeks.

- [ ] Photo compare-slider / side-by-side (any two dates) — add once the timeline gallery proves useful and the user wants to compare specific weeks
- [ ] Numeric "X kg to go" / % progress summary card — add once the trend chart is validated as the right shape; this is a thin derived layer on top
- [ ] PR (personal record) badges per exercise — add once volume charts are in use and PRs become a natural next question
- [ ] Methodology context extended to exercise-notes/video-form-analysis prompts (not just weekly morpho) — add once the weekly-analysis integration is proven useful and worth the extra prompt-size/latency cost everywhere else

### Future Consideration (v2+)

Features to defer until the above is used for a while and clearly working.

- [ ] Recomposition indicator (combined weight+measurement+volume heuristic) — defer until the three underlying trend series are individually validated; combining them prematurely risks a confusing or misleading composite metric
- [ ] AI morpho-score trend overlay — defer until/unless the morpho scoring is reshaped into a stable numeric structure; don't force a schema change just to chart something that's currently qualitative
- [ ] Milestone photo pinning (manual or AI-suggested) — nice narrative layer, not needed to validate the core goal-tracking value
- [ ] Cross-author synthesis in RAG (explicitly reconciling Delavier/Gundill/Lesueur per recommendation) — start with "top-k relevant chunks regardless of author," see if synthesis quality is already good enough before adding explicit multi-author reconciliation logic to the prompt

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `Goal` model | HIGH | LOW | P1 |
| Weight/body-fat trend vs target | HIGH | LOW | P1 |
| Strength/volume progression charts | HIGH | LOW-MEDIUM | P1 |
| Progress-photo timeline | HIGH | LOW-MEDIUM | P1 |
| PDF ingestion + pgvector embeddings | HIGH | MEDIUM | P1 |
| Methodology-grounded advice injection + attribution | HIGH | MEDIUM | P1 |
| Numeric goal-progress summary | MEDIUM | LOW | P2 |
| PR tracking/badges | MEDIUM | LOW | P2 |
| Photo compare-slider | MEDIUM | LOW-MEDIUM | P2 |
| Methodology context in video/exercise-note prompts | MEDIUM | LOW (reuses P1 retrieval) | P2 |
| Recomposition indicator | HIGH (matches user's actual stated goal best) | MEDIUM | P2 |
| AI morpho-score trend overlay | MEDIUM | MEDIUM (needs prompt/schema change first) | P3 |
| Milestone photo pinning | LOW-MEDIUM | MEDIUM | P3 |
| Cross-author synthesis in RAG | MEDIUM | MEDIUM-HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add once P1 is validated in real use
- P3: Nice to have, revisit in a future milestone

## Competitor Feature Analysis

| Feature | Strong / Hevy | MacroFactor | GainFrame | Our Approach |
|---------|--------------|--------------|-----------|--------------|
| Volume/1RM progression charts | Core, polished full-screen graphs | Not their focus (nutrition-first) | Basic | Match this bar exactly — it's pure visualization of data already synced from Hevy, no reason to be behind the source app itself |
| Weight trend vs. goal | Not their focus | Best-in-class (smoothed trend + waterfall goal-progress chart) | Basic | Adopt MacroFactor's smoothing pattern (trend weight, not raw) — directly applicable, already have the raw data via Journal Santé sync |
| AI photo scoring correlated with training data | None | None | Yes (their core differentiator) | Already partially built (`MorphoAnalysis` + Hevy context) — the gap vs. GainFrame is visualization (trend over time), not data collection |
| Reference-methodology-grounded advice | None | None | None | Genuinely novel among consumer apps surveyed — no mainstream competitor cites a named training methodology corpus; this is the app's real differentiator, worth the implementation cost |

## Sources

- [Strong — Workout Tracker & Gym Log](https://www.strong.app/) — volume/1RM progression charts, PR tracking (MEDIUM confidence, WebSearch-derived product description, consistent across multiple independent listings)
- [Hevy — Workout Tracker Gym Log](https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350) — full-screen volume/weight/rep progression graphs (MEDIUM confidence; also the app already integrated in this project, so pattern directly observable)
- [StrengthLog](https://www.strengthlog.com/) and [LiftTrack](https://apps.apple.com/us/app/lifttrack-strength-training/id6736655105) — corroborate volume/1RM charting as category-standard, not a single vendor's idiosyncrasy (MEDIUM confidence)
- [GainFrame — body recomposition tracking blog](https://gainframe.app/blog/track-body-recomposition-photos/index.html) — AI photo scoring correlated with Hevy workout data on the same timeline (MEDIUM confidence, closest direct competitor pattern to this app's existing morpho feature)
- [MacroFactor — Goal Progress feature](https://macrofactorapp.com/goal-features/) and [Weight Trend](https://help.macrofactorapp.com/en/articles/21-weight-trend) (MEDIUM-HIGH confidence, official product help docs) — smoothed trend weight + waterfall-style weekly goal-progress chart is the strongest reference pattern for feature #1's target-vs-actual visualization
- [ZOZOFIT](https://zozofit.com/), [Progress — Body Measurements & BMI Tracker](https://theprogressapp.com/), [Body Tracker: Progress Photos](https://play.google.com/store/apps/details?id=com.thumbstonelabs.bodytransformation) — corroborate photo-timeline/side-by-side comparison as category-standard for visual milestone tracking (MEDIUM confidence)
- [IBM Research — What is RAG?](https://research.ibm.com/blog/retrieval-augmented-generation-RAG) and [AWS — Grounding and RAG](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-serverless/grounding-and-rag.html) (HIGH confidence, official vendor documentation) — standard retrieve-then-generate pattern for grounding LLM output in a curated corpus, directly applicable to the reference-book requirement
- [Neon Docs — pgvector extension](https://neon.com/docs/extensions/pgvector) (HIGH confidence, official docs) — pgvector is a first-class extension on the same Neon Postgres this project already uses, no new infra/service required for a corpus this small
- [Neon — pgrag and DeepSeek](https://neon.com/blog/pgrag-and-deepseek) (MEDIUM-HIGH confidence, official Neon blog) — confirms PDF-to-text + embedding generation can be done inside the existing Postgres-centric stack without adopting a separate RAG framework
- Existing codebase (`.planning/codebase/ARCHITECTURE.md`) — the `buildHevyContext`/`buildNutritionContext` prompt-context-builder pattern in `lib/morpho.ts` is the internal precedent this research recommends extending for `buildMethodologyContext()`, rather than introducing a new architectural pattern

---
*Feature research for: Personal body-recomposition/strength progress tracking UI + reference-methodology-grounded AI coaching (Coach AI milestone extension)*
*Researched: 2026-07-01*
