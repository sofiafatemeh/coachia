# Technology Stack

**Analysis Date:** 2026-07-01

## Languages

**Primary:**
- TypeScript 5.x - All application code (`app/`, `lib/`, `prisma/seed.ts`), strict mode enabled in `tsconfig.json`

**Secondary:**
- JavaScript (config only) - `postcss.config.mjs`, `eslint.config.mjs`

## Runtime

**Environment:**
- Node.js (Next.js 16 App Router, Node.js runtime explicitly selected for API routes that need it, e.g. `export const runtime = 'nodejs'` in `app/api/analysis/weekly/route.ts`)
- No `.nvmrc` / `engines` field present — no pinned Node version at the repo level; Vercel's default Node runtime applies in production

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (npm-managed, not yarn/pnpm)

## Frameworks

**Core:**
- Next.js 16.2.9 - App Router (`app/`), full-stack framework (pages + API routes). Note: this is a post-training version with breaking changes vs. the Next.js in Claude's training data — per `AGENTS.md`, consult `node_modules/next/dist/docs/` before writing Next-specific code.
- React 19.2.4 / react-dom 19.2.4 - UI layer
- Tailwind CSS v4 (`tailwindcss ^4`, `@tailwindcss/postcss ^4`) - styling, configured via PostCSS plugin in `postcss.config.mjs`

**Testing:**
- None detected — no Jest/Vitest/Playwright config or `*.test.*`/`*.spec.*` files found in the repo

**Build/Dev:**
- TypeScript 5.x compiler (`tsc` via `next build`, `noEmit: true` — type-checking only, Next/SWC handles transpilation)
- ESLint 9.x with `eslint-config-next` 16.2.9 (flat config, `eslint.config.mjs`)
- tsx 4.x - runs `prisma/seed.ts` directly (`npm run seed`)
- Prisma CLI 5.22.0 - schema management, migrations, client generation

## Key Dependencies

**Critical:**
- `@prisma/client` ^5.22.0 + `prisma` ^5.22.0 - ORM and query builder for PostgreSQL; schema at `prisma/schema.prisma`
- `@vercel/blob` ^2.5.0 - object storage for progress photos (and video, per `Video.url` field) — see `lib/blob.ts`
- `resend` ^6.16.0 - transactional email for weekly morpho-analysis advice — see `lib/email.ts`
- `sharp` ^0.35.2 - server-side image resize/compress before sending photos to Claude Vision — see `lib/morpho.ts` (`compressToBase64`)
- `@mediapipe/pose`, `@mediapipe/camera_utils`, `@mediapipe/drawing_utils` (pinned to specific build timestamps, e.g. `^0.3.1675466862`) - browser-only pose estimation for exercise-video analysis — see `lib/mediapipe.ts`

**Infrastructure:**
- No dedicated HTTP client library — all external API calls (Anthropic, Hevy, Journal Santé) use the native `fetch` API directly (`lib/claude.ts`, `lib/heavy.ts`, `lib/journal-sante.ts`)
- `node:crypto` (`createHmac`, `timingSafeEqual`) - HMAC session-token signing for single-user auth — `lib/auth.ts`

## Configuration

**Environment:**
- `.env` and `.env.local` present locally (not committed — contents not inspected here); production env vars configured in the Vercel project dashboard
- Key configs required (names only, see INTEGRATIONS.md for details): `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HEVY_API_KEY`, `JOURNAL_SANTE_API_URL`, `JOURNAL_SANTE_SECRET`, `RESEND_API_KEY`, `COACH_EMAIL_TO`, `COACH_EMAIL_FROM`, `APP_PASSWORD`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` (implicit — read automatically by `@vercel/blob`, not referenced via `process.env` in app code)

**Build:**
- `next.config.ts` - minimal, no custom Next config options set
- `tsconfig.json` - `@/*` path alias mapped to repo root, `strict: true`, target `ES2017`, `moduleResolution: bundler`
- `postcss.config.mjs` - Tailwind v4 PostCSS plugin only
- `eslint.config.mjs` - flat ESLint config extending `eslint-config-next`
- `vercel.json` - explicit `buildCommand`/`devCommand`/`installCommand`, `framework: nextjs`
- `package.json` `build` script runs `npx prisma migrate deploy && npx prisma generate && next build` — migrations are applied automatically on every Vercel deploy

## Platform Requirements

**Development:**
- Any OS with Node.js + npm
- PostgreSQL reachable via `DATABASE_URL` (Neon, per project context) — no local Docker Compose/DB setup detected in the repo
- No `.nvmrc`; developer must have a Next.js 16 / React 19–compatible Node version

**Production:**
- Deployment target: Vercel (per `vercel.json`, `framework: nextjs`), branch `main`, direct push (no PR/CI workflow files found — no `.github/workflows/`)
- Database: PostgreSQL via Prisma, `migrate deploy` runs as part of the build step (see above)
- Object storage: Vercel Blob (`BLOB_READ_WRITE_TOKEN` auto-provisioned on Vercel once Blob is enabled for the project)

---

*Stack analysis: 2026-07-01*
*Update after major dependency changes*
