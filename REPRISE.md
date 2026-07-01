# 📍 REPRISE — état du projet (2026-07-01)

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

## 🔑 Variables d'env (projet coach sur Vercel)
`APP_PASSWORD`, `AUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `HEVY_API_KEY`,
`BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `COACH_EMAIL_TO`,
`JOURNAL_SANTE_API_URL=https://journal-sante-omega.vercel.app/api`.

## ⏭️ À FAIRE (reprendre ici)
1. **Thème visuel** (pas commencé) : **tout le texte en noir** (le gris `text-zinc-400/500/600` est illisible par endroits) + rendu plus joli/coloré, **dominante rouge / noir / or**.
   → Plan : thème centralisé dans `app/globals.css` (forcer le texte foncé, boutons `bg-zinc-900` → rouge, accents or, header noir) + petites retouches par page (`/`, `/dashboard`, `/weekly`, `/video`, `/photos`, `/measurements`, `/workouts`, `/login`).
2. **Réorganiser avec GSD** pour un git propre.

## ▶️ Comment reprendre
```bash
cd /home/crypton/glmdev/coach
git checkout main && git pull origin main
```
Puis lance Claude : « reprends d'après REPRISE.md — on attaque le thème rouge/noir/or et le texte en noir ».
