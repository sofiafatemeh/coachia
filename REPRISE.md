# 📍 REPRISE — état du projet (2026-07-01, mis à jour)

App **en ligne et fonctionnelle** sur Vercel (branche `main`).
Workflow actuel : **push direct sur `main`** (pas de PR), Vercel redéploie tout seul.

## ✅ Fait et déployé
- Modèle Claude corrigé (`claude-sonnet-4-6`) ; **toutes les analyses IA en français**.
- Dashboard affiche la **vraie pesée** (plus l'estimation IA).
- **Hevy** réécrit sur la vraie API v1 (séances + exercices + séries + mensurations), scope 30 jours.
- **Analyse hebdo** `/weekly` : 3 photos (face/profil/dos) → stockage Blob → analyse morpho (segments + 30 derniers entraînements + 30 j nutrition/énergie) → **conseils par email (Resend)**. Auto-sync Hevy + Journal Santé au lancement.
- **Analyse vidéo** `/video` : clip ~30 s → images clés → score d'exécution + corrections.
- **Journal Santé** = source de vérité poids/mensurations/nutrition : `/api/journal/sync` (report des valeurs précédentes, 30 j), `/api/journal/energy` (calories/macros + dépense estimée ; pas de repas stockés). Dashboard = vue énergie.
- Défauts profil : taille **174**, âge auto (né le **28/04/1981**).
- Mono-utilisateur : `/api/me` (system user) ; dashboard + mesures corrigés (fin des données fictives) ; sélecteur d'utilisateur retiré.
- **Thème rouge/noir/or** : header noir + accent or, boutons rouges, bordures or clair, tout le texte en noir/gris foncé lisible (tokens centralisés `--ink`, `--ink-soft`, `--crimson`, `--gold` dans `app/globals.css`) sur les 8 pages (accueil, login, dashboard, weekly, video, photos, measurements, workouts). Vérifié visuellement via Playwright headless en local.

## 🔑 Variables d'env (projet coach sur Vercel)
`APP_PASSWORD`, `AUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HEVY_API_KEY`,
`BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `COACH_EMAIL_TO`,
`JOURNAL_SANTE_API_URL=https://journal-sante-omega.vercel.app/api`.

## ⏭️ À FAIRE (reprendre ici)
1. ~~Thème visuel~~ → **fait** (voir ci-dessus), déployé sur `main`.
2. **Réorganiser avec GSD** pour un git propre.

## ▶️ Comment reprendre
```bash
cd /home/crypton/glmdev/coach
git checkout main && git pull origin main
```
Puis lance Claude : « reprends d'après REPRISE.md — on attaque la réorganisation GSD ».
