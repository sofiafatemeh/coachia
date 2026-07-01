# Coach AI

## What This Is

Une application de coaching fitness personnel, mono-utilisateur, qui combine les données d'entraînement réelles (Hevy), l'analyse morpho-anatomique par IA (photos + vidéo) et le suivi nutrition/énergie (Journal Santé) pour délivrer un accompagnement personnalisé de très haut niveau — l'équivalent d'un coach personnel premium (plusieurs milliers d'euros/an), mais calibré sur la morphologie et l'équipement réels de l'utilisateur.

## Core Value

Accélérer la perte de masse grasse et la prise de masse musculaire propre de l'utilisateur via des conseils d'entraînement et de nutrition adaptés à sa morphologie réelle et aux machines dont il dispose — pas des conseils génériques.

## Requirements

### Validated

- ✓ Sync Hevy (séances, exercices, séries, mensurations corporelles) — 30 derniers jours — existant
- ✓ Sync Journal Santé (poids, mensurations, nutrition) — existant
- ✓ Dashboard énergie (calories/macros quotidiens + dépense estimée) — existant
- ✓ Analyse photo IA (physique, score, points forts/faibles, recommandations) — existant
- ✓ Analyse morpho hebdomadaire (3 photos face/profil/dos → segments + conseils d'adaptation d'exercices + progression) avec envoi par email — existant
- ✓ Analyse vidéo d'exécution d'exercice (score de forme + corrections) — existant
- ✓ Authentification mono-utilisateur (mot de passe partagé, system user) — existant
- ✓ Page `/morpho` — résumé visuel de la dernière analyse morpho persistée — existant
- ✓ Notes d'exécution par exercice (ExerciseNote) — précisions (charge bilatérale, variantes unilatérales, tempo délibéré) injectées dans les prompts IA pour affiner l'analyse morpho/vidéo — existant
- ✓ Thème visuel rouge/noir/or, texte lisible sur toutes les pages — existant

### Active

- [ ] Suivi visuel des objectifs chiffrés : perte de masse grasse restante (10-15 kg), définition musculaire/abdos visibles, prise de masse propre, progression en volume et en force — nouvelle UI de suivi (jauge/graphique de progression vs objectif), pas seulement un contexte texte pour l'IA
- [ ] Base de connaissance IA ancrée dans la littérature de référence : ouvrages de Frédéric Delavier, Michael Gundill et Pierre Lesueur (morphologie appliquée à la musculation) — à ingérer depuis des PDF partagés via Google Drive (lien "avec le lien", non public), pour que les conseils IA s'appuient sur ces méthodologies plutôt que sur la seule connaissance générique de Claude

### Out of Scope

- Monétisation / ouverture multi-utilisateur — piste future envisagée seulement si les résultats personnels + le retour d'expérience s'avèrent concluants ; pas un objectif v1, ne pas concevoir l'architecture autour de ça pour l'instant
- Réécriture ou nouvelle planification du travail déjà livré (sync Hevy, analyses IA, dashboard, thème, notes d'exécution) — ce travail est documenté rétroactivement comme terminé, pas remis en chantier

## Context

- Projet solo, déployé en production sur Vercel (branche `main`, push direct, pas de PR, `prisma migrate deploy` au build).
- Stack : Next.js 16 (App Router), Prisma + PostgreSQL (Neon), Tailwind v4, Anthropic Claude API, Hevy API, Resend (email), Vercel Blob (photos/vidéos).
- Base de code cartographiée dans `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS) — voir CONCERNS.md pour la dette technique connue (~23 erreurs ESLint non bloquantes, DB de prod partagée en local, endpoints d'analyse photo dupliqués, pas de tests automatisés).
- L'utilisateur possède les livres de Delavier/Gundill/Lesueur et prépare un dossier Google Drive à partager (lien restreint, pas d'indexation publique — droits d'auteur).
- Objectifs personnels concrets qui doivent guider les priorités : encore 10-15 kg de masse grasse à perdre, définition musculaire/abdos visibles, prise de masse propre, progression mesurable en volume et en force à l'entraînement.
- Historique de session conservé dans `REPRISE.md` à la racine du repo (à retirer/adapter maintenant que `.planning/` prend ce rôle).

## Constraints

- **Solo/mono-utilisateur** : un seul mot de passe partagé, un seul "system user" en base — ne pas construire de multi-tenancy tant que la monétisation n'est pas activement décidée.
- **Déploiement** : push direct sur `main`, pas de CI/PR — toute nouvelle phase doit rester compatible avec ce workflow sans l'alourdir.
- **Droits d'auteur** : le contenu des livres de référence ne doit jamais être republié tel quel dans l'app ou dans des documents commités — seulement synthétisé/appliqué dans les prompts IA.
- **Coût/latence IA** : les analyses (photo, morpho hebdo, vidéo) appellent Claude avec des images — attention à ne pas faire exploser les coûts/temps de réponse en ajoutant du contenu de référence volumineux à chaque appel.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Documenter rétroactivement le travail existant comme phases "terminées" plutôt que de tout re-planifier | Le code est déjà en prod et testé ; l'objectif est un historique GSD propre, pas une re-livraison | ✓ Good |
| Le suivi des objectifs chiffrés devient une vraie phase UI, pas juste un contexte texte pour l'IA | L'utilisateur veut un visuel de progression concret vers ses objectifs personnels | — Pending |
| L'intégration des livres de référence est planifiée comme prochaine phase concrète (pas juste une vision) | Les PDF sont prêts, seulement en attente du lien de partage | — Pending |
| Monétisation explicitement hors scope v1 | Dépend des résultats personnels futurs, ne doit pas influencer l'architecture actuelle | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-01 after initialization*
