# Requirements: Coach AI

**Defined:** 2026-07-01
**Core Value:** Accélérer la perte de masse grasse et la prise de masse musculaire propre via des conseils adaptés à la morphologie réelle et à l'équipement disponible.

Le travail déjà livré (sync Hevy, Journal Santé, dashboard, analyses IA photo/morpho/vidéo, thème visuel, notes d'exécution) est documenté comme **Validated** dans `PROJECT.md` — ces requirements ci-dessous couvrent uniquement le prochain lot de travail (ce milestone).

## v1 Requirements

### Goal (suivi d'objectifs chiffrés)

- [ ] **GOAL-01**: L'utilisateur peut définir des objectifs chiffrés (poids cible, % masse grasse cible, date cible optionnelle)
- [ ] **GOAL-02**: Le dashboard affiche une tendance lissée poids/masse grasse vs objectif (pas le bruit brut jour par jour)
- [ ] **GOAL-03**: L'utilisateur peut voir la progression de volume/force par exercice (basé sur les données Hevy déjà synchronisées)
- [ ] **GOAL-04**: L'utilisateur peut voir une chronologie de ses photos de progression

### RAG (base de connaissance IA ancrée dans les livres de référence)

- [ ] **RAG-01**: Le système peut ingérer les PDF (Delavier/Gundill/Lesueur) en chunks structurés + embeddings, via un script hors-ligne
- [ ] **RAG-02**: Les conseils de l'analyse morpho hebdo s'appuient sur le contenu pertinent récupéré, avec attribution légère (paraphrase, jamais de citation verbatim)
- [ ] **RAG-03**: La récupération respecte un budget de tokens et un timeout, pour ne pas faire dépasser aux routes d'analyse existantes leur limite de temps (déjà proches du plafond Vercel)

## v2 Requirements

### Goal

- **GOAL-05**: Carte résumé "encore X kg" / % de progression
- **GOAL-06**: Badges de records personnels (PR) par exercice
- **GOAL-07**: Slider de comparaison photo entre deux dates
- **GOAL-08**: Indicateur de recomposition composite (poids + mensurations + force), au-delà des tendances individuelles

### RAG

- **RAG-04**: Contexte méthodologique étendu à l'analyse vidéo et aux notes d'exécution
- **RAG-05**: Synthèse cross-auteurs (réconciliation explicite entre Delavier/Gundill/Lesueur si des conseils divergent)

### Autre

- **MORPHO-01**: Overlay de tendance du score morpho IA dans le temps (nécessite de rendre le score `MorphoAnalysis` numérique en premier)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Monétisation / multi-utilisateur | Piste future conditionnée aux résultats personnels, pas un objectif v1 |
| Fonctionnalités sociales / leaderboard / gamification | Hors sujet pour une app mono-utilisateur |
| Service de base vectorielle dédié (Pinecone, etc.) | Surdimensionné pour un corpus de 3 livres — pgvector (Neon) ou `Float[]` suffisent |
| Framework RAG (LangChain/LlamaIndex) | Surdimensionné pour ce volume — récupération faite à la main |
| Fine-tuning de modèle sur le contenu des livres | Coût/complexité disproportionnés, RAG suffit |
| UI de citation verbatim des livres | Risque de droits d'auteur — paraphrase uniquement |
| Chat conversationnel temps réel | Hors du core value actuel (analyses ponctuelles, pas de chat) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GOAL-01 | Phase 1 | Pending |
| GOAL-02 | Phase 1 | Pending |
| GOAL-03 | Phase 1 | Pending |
| GOAL-04 | Phase 1 | Pending |
| RAG-01 | Phase 2 | Pending |
| RAG-02 | Phase 3 | Pending |
| RAG-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-01*
*Last updated: 2026-07-01 after initial definition*
