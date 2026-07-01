---
name: coach-product-vision
description: Target product vision for the Coach fitness app — weekly 3-photo morpho analysis, Hevy-driven advice, email delivery, future video form analysis
metadata:
  type: project
---

Owner's vision for the Coach app (stated 2026-07-01), to build toward autonomously:

- **Weekly cadence:** the user uploads **3 photos every week** — face, profil (side), dos (back). These map to `ProgressPhoto.angle` = front/side/back (model already exists).
- **Morpho-anatomical analysis + advice** derived from each weekly set, based on TWO inputs:
  1. **Segment lengths** measured from the photos (limb/torso proportions).
  2. **The exercises coming from the Hevy app** (sets/reps/weights per exercise).
  The output is concrete advice to **adapt the exercises** to the user's morphology.
- **Advice delivery:** by **email** (or another channel) — not just on-screen.
- **Progression + body recomposition** are estimated from the weekly photos over time. The user **does not care about exact percentages** (bodyFat %, etc.) — they know it's never exact. Favor qualitative/relative trends over precise numbers.
- **Future:** upload **30-second training videos** analyzed for **execution/form quality** (the `Video` model + MediaPipe fields already exist as stubs).

Known bug flagged by owner: **the values coming in from Hevy are wrong.** Root cause found — `lib/heavy.ts` targets a non-real Hevy API (bad endpoints/params, exercises never stored). See git history / [[coach-hevy-api-notes]].

Related context: AI photo weight estimates must NOT count as real weigh-ins (fixed 2026-07-01). The old "Journal Santé" weight-import idea is superseded — progression now comes from the weekly photos, not an external weight feed.
