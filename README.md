# AI Coach - Architecture & Planning

## 🎯 Objectif

IA Coach complet avec:
- ✅ Analyse morpho (BodyScore AI ou custom)
- ✅ Suivi entraînement (Hevy API)
- ✅ Analyse vidéo (MediaPipe)
- ✅ Données nutrition (Journal Santé API)

---

## 📂 Sources de Données

| Source | API | Status |
|--------|-----|--------|
| **Hevy** | api.hevyapp.com | Pro requis |
| **Journal Santé** | `/home/crypton/codex-dev/journal-sante/app/api/` | ✅ Disponible |
| **Google Drive** | OAuth2 API | À configurer |

---

## 🏗️ Architecture

```
Frontend (Next.js)
  └─ Dashboard (Morpho, Training, Nutrition, Video)

Backend (API Routes)
  ├─ /api/hevy/* → Hevy data
  ├─ /api/nutrition/* → Journal Santé
  ├─ /api/morpho/* → BodyScore API
  └─ /api/video/* → MediaPipe analysis

Database (PostgreSQL)
  ├─ User data
  ├─ Training logs
  ├─ Nutrition logs
  └─ Progress photos

AI Services
  ├─ BodyScore (morpho)
  ├─ MediaPipe (video)
  └─ Custom ML (patterns)
```

---

## 📅 Planning

### Phase 1: Setup (Week 1-2)
- [ ] Init Next.js + Tailwind
- [ ] PostgreSQL + Prisma
- [ ] Auth (NextAuth)

### Phase 2: Data Integration (Week 3-4)
- [ ] Hevy API integration
- [ ] Journal Santé API
- [ ] Google Drive sync

### Phase 3: Morphology (Week 5-6)
- [ ] BodyScore API integration
- [ ] Photo upload
- [ ] Progress tracking

### Phase 4: Video (Week 7-9)
- [ ] MediaPipe setup
- [ ] Pose detection
- [ ] Rep counting + form feedback

### Phase 5: AI Coach (Week 10-11)
- [ ] Pattern analysis
- [ ] Recommendations
- [ ] Reports

### Phase 6: Testing (Week 12)
- [ ] Beta test
- [ ] Optimization

---

## 📚 Stack Technique

- **Frontend:** Next.js 16 + Tailwind v4 + shadcn/ui
- **Backend:** Next.js API Routes + PostgreSQL + Prisma
- **AI:** MediaPipe + OpenCV + PyTorch
- **Auth:** NextAuth (Google OAuth)
- **Deploy:** Vercel

---

## 💰 Budget

| Service | Coût/mo |
|---------|---------|
| Vercel | $0-20 |
| Hevy Pro | $10 |
| BodyScore | $9.99 |
| **Total** | **$20-40/mo** |

---

## 🔧 Next Steps

1. ✅ Dossier créé: `/home/crypton/glmdev/coach/`
2. ✅ Next.js initialisé
3. ⏳ Setup database
4. ⏳ Intégrer Journal Santé API