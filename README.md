# Coach IA - AI Fitness Coach

**Un coach IA complet pour l'analyse d'entraînement, la nutrition et la progression physique**

---

## 🎯 APERÇU

Coach IA est une application Next.js 16 qui utilise l'IA pour analyser:
- ✅ **Entraînements** (Hevy API)
- ✅ **Nutrition** (Journal Santé API)
- ✅ **Photos progression** (Claude Vision)
- ✅ **Vidéos exercices** (MediaPipe + Claude)

**Architecture Smart:** Calculs locaux + IA sur les données clés → Coût minimal ~$2/mois

---

## 🏗️ ARCHITECTURE

### Backend

```
Next.js 16 + TypeScript + Tailwind v4
├── Neon PostgreSQL (Database)
├── Prisma ORM
├── Claude Vision (Anthropic API)
├── Hevy API (Workouts)
├── Journal Santé API (Nutrition)
└── MediaPipe Pose (Video analysis)
```

### Frontend

```
Next.js App Router
├── Pages API (REST)
├── Pages UI (Dashboard, Upload, Analytics)
└── Components (Charts, Progress, Forms)
```

### Database Schema (8 tables)

```
User - Profil utilisateur
├── Measurement - Mesures corporelles
│   ├── Hevy API - Workouts
│   ├── Claude Vision - Photos
│   └── MediaPipe - Vidéos
│
├── Workout - Entraînement
│   ├── Exercise - Exercice
│   └── ExerciseSet - Série
│
├── Meal - Repas nutrition
├── Video - Analyse vidéo
└── ProgressPhoto - Photos progression
```

---

## 🚀 SETUP LOCAL

### 1. Clone le repo

```bash
git clone https://github.com/sofiafatemeh/coachia.git
cd coachia
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Database
DATABASE_URL=postgres://user:***@ep-xxx.aws.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx

# Hevy API
HEVY_API_KEY=***

# Journal Santé API
JOURNAL_SANTE_API_URL=http://localhost:3000/api

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=***
```

### 4. Setup database

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Run dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## 📊 API ROUTES

### Health

```
GET /api/health
```

### Users

```
GET /api/users              - Liste users
GET /api/users/[id]         - User by ID
POST /api/users             - Créer user
PUT /api/users/[id]         - Update user
DELETE /api/users/[id]      - Delete user
```

### Workouts (Hevy)

```
GET /api/workouts           - Liste workouts
GET /api/workouts/[id]      - Workout by ID
POST /api/workouts          - Créer workout
GET /api/hevy/workouts      - Sync depuis Hevy
```

### Nutrition (Journal Santé)

```
GET /api/nutrition/meals                    - Liste repas
GET /api/nutrition/meals?sync=true         - Sync depuis Journal Santé
POST /api/nutrition/meals                   - Créer repas
```

### Analysis - Photos (Claude Vision)

```
POST /api/analysis/photos                   - Analyser photo
GET /api/analysis/photos                    - Dernière analyse
GET /api/analysis/photos?action=history    - Historique
GET /api/analysis/photos?action=progress   - Progression
GET /api/analysis/photos?action=compare    - Comparer photos
```

### Analysis - Video (MediaPipe)

```
POST /api/analysis/video                    - Analyser vidéo
GET /api/analysis/video?videoId=xxx         - Récupérer analyse
```

---

## 💰 COÛTS ESTIMÉS

### Scénario Smart (Recommandé)

| Composant | Coût/mois |
|-----------|-----------|
| **Hevy API** | GRATUIT (Pro requis) |
| **Journal Santé API** | GRATUIT |
| **Claude Vision** | ~$0,15 |
| **MediaPipe + Claude** | ~$1,5 |
| **Rapports hebdo** | ~$0,3 |
| **TOTAL** | **~$2/mois** |

### Scénario Naïf

| Composant | Coût/mois |
|-----------|-----------|
| **Hevy API** | GRATUIT |
| **Journal Santé API** | GRATUIT |
| **Claude Vision** | ~$0,15 |
| **MediaPipe + Claude** | ~$20 |
| **Rapports hebdo** | ~$0,3 |
| **TOTAL** | **~$21/mois** |

---

## 🎯 SPRINTS

### ✅ Sprint 1: Photos + Tendance (Complété)

- [x] Claude Vision integration
- [x] Photo analysis API
- [x] Progress tracking
- [x] Comparison tool

**Coût:** ~$0,18/mois

### ✅ Sprint 2: Pose + Smart Analysis (Complété)

- [x] MediaPipe integration
- [x] Video analysis API
- [x] Keyframes extraction
- [x] Claude coaching on keyframes

**Coût:** ~$1,5/mois

### ⏳ Sprint 3: Full Dashboard (À faire)

- [ ] UI/UX complet
- [ ] Charts + Analytics
- [ ] Upload components
- [ ] Progress visualization

### ⏳ Sprint 4: Reports (À faire)

- [ ] Weekly reports (Claude Opus)
- [ ] Monthly reports
- [ ] Email notifications
- [ ] Export PDF

---

## 🔧 DÉVELOPPEMENT

### Project structure

```
glmdev/coach/
├── app/
│   ├── api/
│   │   ├── users/route.ts
│   │   ├── workouts/route.ts
│   │   ├── nutrition/meals/route.ts
│   │   ├── analysis/photos/route.ts
│   │   └── analysis/video/route.ts
│   └── page.tsx
├── lib/
│   ├── prisma.ts
│   ├── claude.ts
│   ├── claude-sync.ts
│   ├── mediapipe.ts
│   ├── mediapipe-sync.ts
│   ├── heavy.ts
│   ├── hevy-sync.ts
│   ├── journal-sante.ts
│   └── journal-sync.ts
├── prisma/
│   └── schema.prisma
├── .env
├── package.json
└── tsconfig.json
```

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
npm start
```

---

## 📚 DOCUMENTATION

- [Hevy API Integration](./HEVY_INTEGRATION.md)
- [Journal Santé API Integration](./JOURNAL_SANTE_INTEGRATION.md)
- [Claude Vision Integration](./CLAUDE_INTEGRATION.md)
- [MediaPipe Integration](./MEDIAPIPE_INTEGRATION.md)

---

## 🚀 DÉPLOIEMENT

### Vercel

```bash
npm i -g vercel
vercel
```

### Environment variables sur Vercel

Ajouter dans https://vercel.com/salsalocastrasbourg/coach/settings/environment-variables:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `HEVY_API_KEY`
- `JOURNAL_SANTE_API_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

---

## 🤝 CONTRIBUTION

Pull requests welcome!

1. Fork le repo
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir Pull Request

---

## 📄 LICENCE

MIT License

---

## 👤 AUTEUR

Crypton (Sofia Fatemeh) - https://github.com/sofiafatemeh

---

## 🙏 CRÉDITS

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Claude (Anthropic)](https://www.anthropic.com/)
- [MediaPipe](https://google.github.io/mediapipe/)
- [Hevy API](https://hevyapp.com/)
- [Neon PostgreSQL](https://neon.tech/)

---

**URL du projet:** https://coachia-salsalocastrasbourg.vercel.app/

**GitHub:** https://github.com/sofiafatemeh/coachia

---

**Rapporte bugs ou suggestions:** https://github.com/sofiafatemeh/coachia/issues

---

**✅ Prêt à démarrer?** Suivez les instructions de setup local! 🚀