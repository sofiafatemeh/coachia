# BodyScore AI - Intégration Analyse Morpho

## 🔗 PRENDRE L'ABONNEMENT

**URL:** https://bodyscoreai.com/

**Prix:** $12.99/mois (3 jours d'essai gratuit)

**Étapes:**
1. Aller sur https://bodyscoreai.com/
2. Sign up / Login
3. Choisir plan (Basic $12.99/mois)
4. Récupérer l'API key dans Settings → API Keys
5. Ajouter sur Vercel:
   ```
   Name: BODYSCORE_API_KEY
   Value: ***ta clé API***
   Environments: Production, Preview, Development
   ```

---

## ✅ COMPLÉTÉ

### Création des fichiers:

1. **`lib/bodyscore.ts`** - Client API BodyScore
   - ✅ `analyzePhoto(request)` - Analyser une photo
   - ✅ `getAnalysisById(id)` - Récupérer une analyse
   - ✅ `listAnalyses(options)` - Lister les analyses
   - ✅ `deleteAnalysis(id)` - Supprimer une analyse

2. **`lib/bodyscore-sync.ts`** - Service sync
   - ✅ `syncAnalysis(photoUrl, options)` - Sync une analyse
   - ✅ `getLatestAnalysis(userId)` - Dernière analyse
   - ✅ `getAnalysesHistory(userId, days)` - Historique
   - ✅ `calculateProgress(userId, days)` - Calculer progression

3. **`app/api/body-score/analysis/route.ts`** - API route
   - ✅ `POST /api/body-score/analysis` - Analyser une photo
   - ✅ `GET /api/body-score/analysis?action=history` - Historique
   - ✅ `GET /api/body-score/analysis?action=progress` - Progression
   - ✅ `GET /api/body-score/analysis` - Dernière analyse

## 🔗 PRENDRE L'ABONNEMENT

**URL:** https://bodyscore.ai/

**Prix:** $9.99/mois

**Étapes:**
1. Aller sur https://bodyscore.ai/
2. Sign up / Login
3. Choisir plan (Basic $9.99/mois)
4. Récupérer l'API key dans Settings → API Keys
5. Ajouter sur Vercel:
   ```
   Name: BODYSCORE_API_KEY
   Value: ***ta clé API***
   Environments: Production, Preview, Development
   ```

## 📊 STRUCTURE DES DONNÉES

### BodyScore Analysis:

```typescript
{
  id: string
  userId: string
  imageUrl: string

  // Body composition
  bodyFat: number        // %
  muscleMass: number     // kg
  bmi: number
  weight: number         // kg

  // Body metrics
  waist: number?         // cm
  chest: number?         // cm
  hips: number?          // cm
  thighs: number?        // cm

  // Confidence scores
  bodyFatConfidence: number    // 0-1
  muscleMassConfidence: number // 0-1

  // Raw data
  poseData?: any
  segmentation?: any

  createdAt: string
}
```

### Mapping BodyScore → Coach IA:

| BodyScore | Coach IA (Measurement) |
|-----------|------------------------|
| `weight` | `weight` |
| `bodyFat` | `bodyFat` |
| `muscleMass` | `muscleMass` |
| `bmi` | `bmi` |
| `id` | `bodyScoreId` |
| `poseData` | `bodyScoreData.poseData` |
| `segmentation` | `bodyScoreData.segmentation` |
| `imageUrl` | `bodyScoreData.imageUrl` |

## 🚀 API USAGE

### Analyser une photo:

```typescript
POST /api/body-score/analysis
{
  "imageUrl": "https://drive.google.com/file/d/xxx/view",
  "height": 180,      // cm (optionnel)
  "gender": "male",   // optionnel
  "age": 30           // optionnel
}
```

**Réponse:**
```json
{
  "measurement": {
    "id": "clxxx",
    "userId": "system",
    "weight": 75.5,
    "bodyFat": 15.2,
    "muscleMass": 35.0,
    "bmi": 23.3,
    "bodyScoreId": "body-score-xxx",
    "bodyScoreData": { ... }
  },
  "analysis": { ... },
  "message": "BodyScore analysis synced successfully"
}
```

### Historique:

```typescript
GET /api/body-score/analysis?action=history&days=30
```

**Réponse:**
```json
{
  "measurements": [ ... ],
  "total": 5,
  "message": "Found 5 BodyScore analyses"
}
```

### Progression:

```typescript
GET /api/body-score/analysis?action=progress&days=30
```

**Réponse:**
```json
{
  "progress": {
    "weightChange": -2.3,
    "bodyFatChange": -0.5,
    "muscleMassChange": +1.2,
    "bmiChange": -0.7,
    "daysElapsed": 30
  },
  "latest": { ... },
  "oldest": { ... },
  "measurements": [ ... ],
  "message": "Progress calculated over 30 days"
}
```

## 🎯 PROCHAINES ÉTAPES

1. ✅ Hevy API - COMPLÉTÉ
2. ✅ Journal Santé API - COMPLÉTÉ
3. ✅ BodyScore AI - COMPLÉTÉ
4. ⏳ MediaPipe - Analyse vidéo
5. ⏳ Dashboard - Frontend

---

**Prochaine intégration: MediaPipe?** 🚀