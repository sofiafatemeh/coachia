# 📍 REPRISE — état du projet

App **en ligne et fonctionnelle** sur Vercel (branche `main`).
Workflow actuel : **push direct sur `main`** (pas de PR), Vercel redéploie tout seul.

Depuis le 2026-07-01, le suivi de projet passe par **GSD** (`.planning/`) plutôt que ce fichier :

- `.planning/PROJECT.md` — contexte, objectifs, requirements validés/actifs, décisions
- `.planning/ROADMAP.md` — phases à venir (Goal & Progress Tracking UI → Book RAG Ingestion → Book RAG Intégration)
- `.planning/STATE.md` — position actuelle, mémoire courte du projet
- `.planning/codebase/` — cartographie du code (stack, architecture, conventions, points de vigilance)

## 🔑 Variables d'env (projet coach sur Vercel)
`APP_PASSWORD`, `AUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HEVY_API_KEY`,
`BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `COACH_EMAIL_TO`,
`JOURNAL_SANTE_API_URL=https://journal-sante-omega.vercel.app/api`.

## ▶️ Comment reprendre
```bash
cd /home/crypton/glmdev/coach
git checkout main && git pull origin main
```
Puis lance Claude : « /gsd-progress » ou « reprends le projet » — il lira `.planning/STATE.md` et te proposera la suite (actuellement : Phase 1, Goal & Progress Tracking UI).
