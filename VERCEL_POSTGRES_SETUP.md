# 🚀 Setup Vercel Postgres - Guide Complet

## 📋 ÉTAPES

### 1. Connecter ton compte Vercel

**Sur ton ordinateur:**

```bash
vercel login
```

*Utilise ton compte: `salsalocastrasbourg-8902`*

---

### 2. Créer le projet Vercel

**Via interface web:**

1. **Aller sur:** https://vercel.com/dashboard
2. **Cliquer sur:** "Add New..." → "Project"
3. **Importer le repo:** `sofiafatemeh/coachia`
4. **Framework Preset:** Next.js (automatiquement détecté)
5. **Root Directory:** `./` (laisser par défaut)
6. **Build Command:** `npm run build` (automatique)
7. **Output Directory:** `.next` (automatique)
8. **Cliquer sur:** "Deploy"

---

### 3. Créer la Database Postgres

**Après le déploiement initial:**

1. **Sur le dashboard Vercel du projet coachia:**
2. **Cliquer sur:** "Storage" (dans le menu gauche)
3. **Cliquer sur:** "Create Database"
4. **Sélectionner:** "Postgres"
5. **Region:** Frankfort (eu-central-1) - proche de toi
6. **Cliquer sur:** "Create"

---

### 4. Récupérer le DATABASE_URL

**Dans le dashboard Vercel → Storage:**

1. **Cliquer sur:** ta nouvelle database Postgres
2. **Aller dans:** "Settings" → "General"
3. **Copier le:** `DATABASE_URL`

Format attendu:
```
postgres://user:***@ep-xxx.region.aws.neon.tech/coachdb?sslmode=require
```

---

### 5. Ajouter DATABASE_URL au projet

**Sur ton VPS:**

```bash
cd /home/crypton/glmdev/coach

# Éditer .env
nano .env
```

**Ajouter:**
```env
DATABASE_URL="postgres://user:***@ep-xxx.region.aws.neon.tech/coachdb?sslmode=require"
```

**Sauvegarder:** `Ctrl + X` → `Y` → `Enter`

---

### 6. Installer Prisma (si pas déjà fait)

```bash
cd /home/crypton/glmdev/coach
npm install prisma @prisma/client
```

---

### 7. Générer le client Prisma

```bash
npx prisma generate
```

---

### 8. Lancer la migration

```bash
npx prisma migrate dev --name init
```

**Résultat attendu:**
```
✔ Generated Prisma Client
✔ Generated Prisma Client (5.2ms)

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240627_timestamp_init/
    └─ migration.sql

Your database is now in sync with your schema.

Running generate... (use --skip-generate to skip the generation step)
```

---

### 9. Vérifier les tables

**Option A - Via Prisma Studio:**

```bash
npx prisma studio
```

*Ouvre un navigateur sur http://localhost:5555*

**Option B - Via CLI:**

```bash
npx prisma db push
```

---

### 10. Redéployer sur Vercel

**Via CLI:**

```bash
cd /home/crypton/glmdev/coach
vercel --prod
```

---

## ✅ Vérification

### Tester l'API:

```bash
# Vérifier les utilisateurs
curl https://coachia.vercel.app/api/users

# Créer un utilisateur
curl -X POST https://coachia.vercel.app/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

---

## 📊 Plan Vercel (20€/moi)

Avec ton plan payant:
- ✅ **512 MB storage** pour Postgres
- ✅ **60 hours compute** par mois
- ✅ **Auto-backup**
- ✅ **Bandwidth illimité**

---

## 🎯 Prochaines étapes

Une fois la database configurée:

1. ✅ Intégrer Journal Santé API
2. ⏳ Configurer Hevy API (Pro requis)
3. ⏳ Setup BodyScore AI
4. ⏳ Créer le dashboard

---

## 📝 Résumé

| Étape | Action | Status |
|-------|--------|--------|
| 1 | Connecter Vercel | ⏳ À faire sur ton PC |
| 2 | Créer projet coachia | ⏳ À faire sur ton PC |
| 3 | Créer Postgres DB | ⏳ À faire sur ton PC |
| 4 | Récupérer DATABASE_URL | ⏳ À faire sur ton PC |
| 5 | Ajouter au .env | ⏳ À faire sur VPS |
| 6 | Installer Prisma | ✅ Déjà fait |
| 7 | Générer client | ⏳ À faire sur VPS |
| 8 | Lancer migration | ⏳ À faire sur VPS |
| 9 | Vérifier tables | ⏳ À faire sur VPS |
| 10 | Redéployer Vercel | ⏳ À faire sur VPS |

---

## 🆘 Problèmes fréquents

### **"prisma: command not found"**
```bash
npm install -g prisma
```

### **"DATABASE_URL not found"**
Vérifie que .env existe et contient la variable

### **"Connection timeout"**
- Vérifie le firewall
- Vérifie que la database est bien créée sur Vercel

---

**Prêt à commencer? Dis-moi quand tu as créé la database sur Vercel!** 🚀