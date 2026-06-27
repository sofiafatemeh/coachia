# Setup Database pour AI Coach

## Options:

### 1. **Vercel Postgres** (Recommandé - FREE TIER)
```bash
# Install Vercel CLI
npm i -g vercel

# Connect to Vercel
vercel login

# Create Postgres database
vercel postgres create

# Copy DATABASE_URL from Vercel dashboard
```

**Vercel Postgres - FREE TIER:**
- 512 MB storage
- 60 hours compute/mo
- PostgreSQL 14
- Auto-backup

### 2. **Postgres Local** (Pour dev/test)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE USER coachuser WITH PASSWORD 'your-password';
CREATE DATABASE coachdb OWNER coachuser;
\q

# Update .env
DATABASE_URL="postgresql://coachuser:your-password@localhost:5432/coachdb?schema=public"
```

### 3. **Neon** (Alternative - FREE TIER)
```bash
# Sign up: https://neon.tech
# Create project
# Copy DATABASE_URL
```

---

## Recommandation: **Vercel Postgres**

**Pourquoi:**
- ✅ Free tier suffisant
- ✅ Auto-backup
- ✅ Vercel integration native
- ✅ Scaling facile

**Coût:**
- Free: 512 MB, 60h compute/mo
- Pro: $20/mo (8 GB, 500h compute)

---

## Schema Database

### Tables créées:

1. **User** - Utilisateurs
2. **Measurement** - Body composition (poids, graisse, muscle)
3. **Workout** - Entraînement (Hevy integration)
4. **Exercise** - Exercices (squats, bench press, etc.)
5. **ExerciseSet** - Série (reps, poids)
6. **Meal** - Repas (Journal Santé)
7. **Video** - Vidéos (MediaPipe analysis)
8. **ProgressPhoto** - Photos progression

---

## Prochaines étapes:

1. **Choisir l'option database** (Vercel Postgres recommandé)
2. **Installer Prisma client** ✅
3. **Créer les tables** (prisma migrate)
4. **Intégrer Journal Santé API**