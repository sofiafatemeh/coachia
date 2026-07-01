# Phase 1: Goal & Progress Tracking UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 1-Goal & Progress Tracking UI
**Areas discussed:** Placement, Goal model, Strength/volume chart scope, Trend visualization framing

---

## Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Nouvelle page dédiée /goals | Page à part avec sa propre carte sur l'accueil, comme /morpho ou /weekly — garde le dashboard actuel intact | ✓ |
| Intégré dans /dashboard existant | Ajoute les graphiques directement dans le dashboard actuel, à côté de l'énergie/séances | |

**User's choice:** Nouvelle page dédiée /goals (Recommandé)
**Notes:** Keeps the existing dashboard focused on daily energy/workout summary; goals get their own dedicated space, consistent with how `/morpho` and `/weekly` were added.

---

## Goal model

| Option | Description | Selected |
|--------|-------------|----------|
| Un seul objectif actif | Simple : poids cible / % masse grasse / date, modifiable à tout moment, pas d'historique de versions | ✓ |
| Historique des objectifs | Garde une trace de chaque objectif défini dans le temps | |

**User's choice:** Un seul objectif actif (Recommandé)
**Notes:** Simplicity preferred over goal-versioning history for v1.

---

## Strength/volume chart scope

| Option | Description | Selected |
|--------|-------------|----------|
| Top exercices les plus fréquents | Les 5-8 exercices les plus souvent pratiqués — évite de noyer la page | ✓ |
| Je choisis moi-même | Sélecteur pour piocher n'importe quel exercice de l'historique Hevy | |

**User's choice:** Top exercices les plus fréquents (Recommandé)
**Notes:** ~30 distinct exercise names exist in Hevy history; a full picker was judged unnecessary for v1.

---

## Trend visualization framing

| Option | Description | Selected |
|--------|-------------|----------|
| Courbe lissée + points bruts en fond | La tendance lissée est la ligne principale, les points de mesure bruts sont légers/secondaires | ✓ |
| Uniquement la tendance lissée | Pas de points bruts du tout, juste la courbe de tendance vs objectif | |

**User's choice:** Courbe lissée + points bruts en fond (Recommandé)
**Notes:** Directly addresses the research pitfall (raw daily weight noise is discouraging for a body-recomposition goal) while still keeping raw data visible for transparency.

---

## Claude's Discretion

- Exact smoothing method (rolling average vs. EMA)
- Tie-breaking for "top exercises by frequency"
- Empty-state visual treatment on `/goals` (follow `/morpho`'s existing empty-state pattern)
- Whether to draw a linear target-date line on the trend chart — default to NOT drawing one (text-only target date) per the research pitfall about rigid timelines creating false "behind schedule" framing

## Deferred Ideas

- GOAL-05..08 (v2 requirements): numeric summary card, PR badges, photo compare-slider, recomposition indicator — already tracked in REQUIREMENTS.md, not re-discussed.
- Goal history/versioning — considered during the Goal model discussion, deferred in favor of a single active goal.
