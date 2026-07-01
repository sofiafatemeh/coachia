# Phase 1: Goal & Progress Tracking UI - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can define numeric goals (target weight, target body-fat %, optional target date) and see clear, honest visual progress toward them: a smoothed weight/body-fat trend vs. target, strength/volume progression per exercise, and a chronological progress-photo timeline — all computed from data already synced (Measurement, Workout/ExerciseSet, ProgressPhoto). No new external dependency, no new API key. Everything here is visualization + one new `Goal` model over existing data.

</domain>

<decisions>
## Implementation Decisions

### Placement
- **D-01:** New dedicated page `/goals`, not merged into `/dashboard`. Gets its own card on the home page grid, matching the existing pattern (`/morpho`, `/weekly`, etc.). Dashboard stays untouched.

### Goal model
- **D-02:** Single active goal at a time — no version history. `Goal` stores target weight, target body-fat %, optional target date. Editable/replaceable at any time (no need to preserve prior goal versions).

### Strength/volume charts
- **D-03:** Show the top 5-8 most frequent exercises (by session count, same aggregation logic already used in `buildHevyContext()` in `lib/morpho.ts`), not a full exercise picker. Avoids drowning the page — this app's Hevy history has ~30 distinct exercise names.

### Trend visualization
- **D-04:** Smoothed trend line is the primary visual; raw daily measurement points are shown lightly/secondary in the background (not hidden entirely, not primary). Directly addresses the research pitfall (PITFALLS.md) that raw daily weight noise is discouraging for a recomposition goal — smoothing must be the default reading, not an opt-in toggle.

### Claude's Discretion
- Exact smoothing method (e.g. 7-day rolling average vs. exponential moving average) — implementation detail, not discussed with user.
- Whether "top exercises by frequency" resolves ties by most-recent-session or alphabetically — edge case, low stakes.
- Visual treatment of "no goal set yet" empty state on `/goals` — should offer a clear CTA to create one, follow existing empty-state patterns (see `/morpho`'s empty state).
- Whether target date (if set) is shown as a fixed line/marker or omitted from the chart entirely — per PITFALLS.md, a rigid date-based target line risks "behind schedule" framing; default to NOT drawing a linear target-date line on the trend chart, just displaying the target date as text alongside the goal (not a note requiring further user input, but flagged here for the planner to apply consistently with D-04's philosophy).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — GOAL-01 through GOAL-04 (v1, this phase); GOAL-05..08 (v2, deferred)
- `.planning/ROADMAP.md` §Phase 1 — goal/success criteria for this phase
- `.planning/PROJECT.md` — Core Value, Constraints (solo/mono-user, push-direct-to-main)

### Research (this milestone)
- `.planning/research/SUMMARY.md` — executive summary, phase rationale
- `.planning/research/STACK.md` — Recharts ^3.9.1 recommended for charting (peer-dep verified against pinned React 19.2.4)
- `.planning/research/FEATURES.md` — table-stakes vs. differentiator feature breakdown for progress trackers
- `.planning/research/ARCHITECTURE.md` — compute-on-read pattern for `Goal` progress (mirrors `buildHevyContext()`'s recompute-don't-cache convention)
- `.planning/research/PITFALLS.md` — pitfall 5 (raw-weight noise, weight/fat-loss conflation, rigid linear timelines) — directly shapes D-04 and the target-date discretion note above

### Codebase conventions
- `.planning/codebase/CONVENTIONS.md` — naming, error-handling, and lint-debt conventions to follow for new files
- `.planning/codebase/STRUCTURE.md` — where new files should live
- `.planning/codebase/ARCHITECTURE.md` — existing component boundaries (`app/api/**/route.ts` → `lib/*.ts` → Prisma → Postgres)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/dashboard/page.tsx` — existing pattern for fetching `Measurement`/`Workout` data client-side via `useEffect` + `fetch()`; the new `/goals` page should follow the same shape (client component, no shared data-fetching library).
- `lib/morpho.ts`'s `buildHevyContext()` — existing aggregation logic for "best working set per exercise, sorted by frequency" is the exact pattern to reuse/adapt for D-03's top-exercises selection, just surfaced as a chart instead of prompt text.
- Theme tokens in `app/globals.css` (`--ink`, `--ink-soft`, `--crimson`, `--gold`, `--onyx`, etc.) and the established header pattern (`bg-onyx border-b-2 border-gold`) — new page must match.
- `app/morpho/page.tsx` — closest existing reference for a "read-only summary page fetching from a new GET endpoint" pattern (empty-state handling, themed cards) to model `/goals` after.

### Established Patterns
- Every API route wraps in `try/catch`, logs via `console.error('[API] ...')`, returns `NextResponse.json`. New `app/api/goals/**` routes must follow this.
- No shared `types/` directory — page components redeclare their own local interfaces for API response shapes. Follow this for `/goals`' local types rather than introducing a shared types module.
- Compute-on-read, never cache: `Goal` row should store ONLY the target definition (weight, body-fat %, target date) — current/percent-complete must be computed at request time from `Measurement`/`Workout`/`ExerciseSet`, never stored.

### Integration Points
- New Prisma model `Goal` (single row per system user, or a `findFirst` "most recent" pattern matching D-02's single-active-goal decision) — added to `prisma/schema.prisma` alongside existing models.
- New route(s) under `app/api/goals/` (GET current goal + computed progress, POST/PUT to set/update goal).
- New page `app/goals/page.tsx`.
- Home page (`app/page.tsx`) gets one more card in the grid linking to `/goals`, following the exact pattern already used for the `/morpho` card added in a prior session.

</code_context>

<specifics>
## Specific Ideas

No specific visual mockups or exact wording requested — user deferred to recommended defaults on all four discussed gray areas (placement, goal model, exercise chart scope, trend framing). Match the existing red/black/gold theme and page conventions already established across the app.

</specifics>

<deferred>
## Deferred Ideas

- GOAL-05..08 (v2): numeric "X kg to go" summary card, PR badges, photo compare-slider, recomposition indicator (composite weight+measurements+strength signal) — already tracked in REQUIREMENTS.md v2 section, not re-discussed here.
- Multi-goal history / goal versioning — considered during D-02 discussion, explicitly deferred in favor of single-active-goal simplicity. Could resurface later if the user wants to look back at how targets evolved over time.

### Reviewed Todos (not folded)
None — no pending todos existed at discussion time.

</deferred>

---

*Phase: 1-Goal & Progress Tracking UI*
*Context gathered: 2026-07-01*
