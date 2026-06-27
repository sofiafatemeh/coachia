# Database Setup - Neon (Alternative à Vercel Postgres)

## 🔧 Setup via Neon (Recommandé pour commencer)

### Étape 1: Créer un compte Neon
1. Aller sur https://neon.tech
2. Sign up (FREE)
3. Créer un nouveau projet "coachia"

### Étape 2: Récupérer DATABASE_URL
1. Ouvrir le dashboard Neon
2. Aller dans le projet "coachia"
3. Copier le `Connection string` (PostgreSQL)
4. Format: `postgres://user:password@ep-xxx.region.aws.neon.tech/coachia?sslmode=require`

### Étape 3: Ajouter au .env
```bash
DATABASE_URL="postgres://user:password@ep-xxx.region.aws.neon.tech/coachia?sslmode=require"
```

### Étape 4: Installer Prisma et générer le client
```bash
npm install prisma @prisma/client
npx prisma generate
```

### Étape 5: Lancer la migration
```bash
npx prisma migrate dev --name init
```

### Étape 6: Vérifier les tables
```bash
npx prisma studio
```

---

## 📊 Neon - FREE TIER

- **Storage:** 0.5 GB
- **Compute:** 300 hours/mo
- **Features:**
  - ✅ Branching (dev/staging/production)
  - ✅ Auto-scaling
  - ✅ Serverless
  - ✅ Compatible PostgreSQL 14

---

## 🚀 Alternative: Vercel Postgres

Si tu veux utiliser Vercel Postgres (ton plan payant 20€):

1. Aller sur https://vercel.com/dashboard
2. Créer un nouveau projet "coachia"
3. Importer le repo GitHub: `sofiafatemeh/coachia`
4. Dans le dashboard → Storage → Create Database
5. Choisir "Postgres"
6. Copier le `DATABASE_URL` depuis les environment variables
7. Ajouter au .env local

---

## 🎯 Prochaine étape

Tu veux:
1. ✅ **Neon** (FREE, plus simple pour commencer)
2. 🌟 **Vercel Postgres** (ton plan payant 20€, intégration native)