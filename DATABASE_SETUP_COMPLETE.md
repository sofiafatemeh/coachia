# 🗄️ Setup Database - Instructions

## 📋 Résumé

Database PostgreSQL configurée avec:
- ✅ **Prisma ORM** (schema complet)
- ✅ **8 tables** (User, Measurement, Workout, Exercise, Meal, Video, etc.)
- ✅ **API routes** (users, workouts, nutrition)
- ✅ **Prisma client** initialisé
- ✅ **Push sur GitHub** (commit 82aa6bb)

---

## 🏗️ Schema Database

### Tables créées:

| Table | Description |
|-------|-------------|
| **User** | Utilisateurs (email, name) |
| **Measurement** | Body composition (poids, graisse, muscle, BodyScore) |
| **Workout** | Entraînement (Hevy integration) |
| **Exercise** | Exercices (squats, bench press, etc.) |
| **ExerciseSet** | Séries (reps, poids, RPE, formScore) |
| **Meal** | Repas (Journal Santé - calories, macros) |
| **Video** | Vidéos (MediaPipe analysis - pose data, repCount) |
| **ProgressPhoto** | Photos progression (front, side, back) |

---

## 🚀 Options Database

### **Option 1: Vercel Postgres** (RECOMMANDÉ - FREE)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Connect to Vercel
vercel login

# 3. Create Postgres database
vercel postgres create

# 4. Copy DATABASE_URL from Vercel dashboard
# Ajouter au .env:
DATABASE_URL="postgres://user:pass@ep-xxx.region.aws.neon.tech/coachdb?sslmode=require"
```

**Vercel Postgres - FREE TIER:**
- ✅ 512 MB storage
- ✅ 60 hours compute/mo
- ✅ PostgreSQL 14
- ✅ Auto-backup

---

### **Option 2: Neon** (Alternative - FREE)

```bash
# 1. Sign up: https://neon.tech
# 2. Create project "coachia"
# 3. Copy DATABASE_URL
# 4. Ajouter au .env
```

**Neon - FREE TIER:**
- 0.5 GB storage
- 300 hours compute/mo
- Branching (dev/staging/production)

---

### **Option 3: Postgres Local** (Pour dev/test)

```bash
# 1. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 2. Create database
sudo -u postgres psql
CREATE USER coachuser WITH PASSWORD 'your-password';
CREATE DATABASE coachdb OWNER coachuser;
\q

# 3. Update .env
DATABASE_URL="postgresql://coachuser:***@localhost:5432/coachdb?schema=public"
```

---

## 🔧 Setup Instructions

### **Après avoir choisi l'option:**

1. **Ajouter DATABASE_URL au .env**
2. **Installer Prisma client** ✅ (déjà fait)
3. **Générer Prisma client** ✅ (déjà fait)
4. **Créer les tables**:
   ```bash
   npx prisma migrate dev --name init
   ```
5. **Vérifier les tables**:
   ```bash
   npx prisma studio
   ```

---

## 📊 API Routes Créées

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/users` | GET/POST | Créer/lister utilisateurs |
| `/api/workouts` | GET/POST | Créer/lister entraînement |
| `/api/nutrition/meals` | GET | Récupérer repas (Journal Santé) |

---

## 🎯 Prochaines étapes

1. **Choisir database** (Vercel Postgres recommandé)
2. **Configurer DATABASE_URL** dans .env
3. **Lancer migration** (`npx prisma migrate dev --name init`)
4. **Intégrer Journal Santé API** (déjà dispo sur serveur)
5. **Configurer Hevy API** (Pro requis)

---

## 📝 Fichiers modifiés/créés

```
glmdev/coach/
├── prisma/schema.prisma          ✅ Schema complet
├── lib/prisma.ts                 ✅ Prisma client
├── app/api/users/route.ts        ✅ API users
├── app/api/workouts/route.ts     ✅ API workouts
├── app/api/nutrition/meals/route.ts ✅ API nutrition
└── DATABASE_SETUP.md             ✅ Documentation
```

---

**Tu choisis quelle option database?** (Vercel Postgres recommandé) 🗄️