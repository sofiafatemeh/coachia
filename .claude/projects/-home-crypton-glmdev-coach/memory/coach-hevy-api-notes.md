---
name: coach-hevy-api-notes
description: Real Hevy public API v1 contract — endpoints, pagination, and object field names used by the Coach app's Hevy sync
metadata:
  type: reference
---

Hevy public API v1 (`https://api.hevyapp.com/v1`, auth header `api-key`). Verified against the OpenAPI spec at github.com/chrisdoc/hevy-mcp (`openapi-spec.json`). The original `lib/heavy.ts` was written against an imagined API — this is the real one, used by the rewrite (2026-07-01).

- All list endpoints return `{ page, page_count, <items> }`. Query params are `page` and `pageSize` (camelCase). **Max pageSize is 10** for `/workouts`, `/workouts/events`, `/body_measurements` (100 for `/exercise_templates`).
- **No date filter on `/workouts`.** To fetch by date, either walk all pages and filter by `end_time`, or use `GET /workouts/events?since=<ISO>` → `{page, page_count, events:[{type:"updated",workout} | {type:"deleted",id,deleted_at}]}`.
- Real endpoints: `/workouts`, `/workouts/{id}`, `/workouts/count`, `/workouts/events`, `/exercise_templates`(+`/{id}`), `/body_measurements`(+`/{date}`), `/routines`, `/routine_folders`, `/exercise_history/{templateId}`, `/user/info`. There is **no** `/bodyweight`, `/exercises`, or `/user`.
- **Workout**: `{ id, title, routine_id, description, start_time, end_time, updated_at, created_at, exercises[] }`. Duration must be computed (end−start); Hevy does not return calories.
- **Exercise** (in a workout): `{ index, title, notes, exercise_template_id, supersets_id, sets[] }`. The exercise name is `title` (no nested `exercise_template` object).
- **Set**: `{ index, type, weight_kg, reps, distance_meters, duration_seconds, rpe, custom_metric }`. It's `type` (not `set_type`); no `id`/`one_rm`/booleans.
- **BodyMeasurement** (`/body_measurements`): `{ date, weight_kg, lean_mass_kg, fat_percent, neck_cm, shoulder_cm, chest_cm, left/right_bicep_cm, left/right_forearm_cm, abdomen, waist, hips, left/right_thigh, left/right_calf }` — real weigh-ins + circumferences, valuable for the morpho analysis. See [[coach-product-vision]].

Requires a Hevy **Pro** account; API key from hevy.com/settings?developer, stored as `HEVY_API_KEY`.
