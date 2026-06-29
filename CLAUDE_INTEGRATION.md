# Claude Vision - Intégration Analyse Photos

## ✅ COMPLÉTÉ

### Création des fichiers:

1. **`lib/claude.ts`** - Client Claude API (6851 bytes)
   - ✅ `analyzePhoto(request)` - Analyser une photo avec Claude Vision
   - ✅ `analyzeProgress(photos)` - Analyser la progression entre photos
   - ✅ Support multiples modèles (Sonnet, Haiku, Opus)
   - ✅ JSON structuré (body composition, muscle scores, recommendations)

2. **`lib/claude-sync.ts`** - Service sync avec database (4567 bytes)
   - ✅ `analyzePhoto(photoUrl)` - Sync Claude analysis dans database
   - ✅ `getLatestAnalysis(userId)` - Dernière analyse
   - ✅ `getAnalysesHistory(userId, days)` - Historique
   - ✅ `calculateProgress(userId, days)` - Calculer progression
   - ✅ `detectAngle(url)` - Détection automatique de l'angle (front/side/back)

3. **`app/api/analysis/photos/route.ts`** - API route (2346 bytes)
   - ✅ `POST /api/analysis/photos` - Analyser une photo
   - ✅ `GET /api/analysis/photos?action=history` - Historique
   - ✅ `GET /api/analysis/photos?action=progress` - Progression
   - ✅ `GET /api/analysis/photos?action=compare` - Comparer photos

## 🔗 CLAUDE API KEY

**Prix:** 
- Sonnet 4.6: $3/1M input + $15/1M output
- Haiku 4.5: $1/5M input + $5/1M output
- Opus 4.8: $5/1M input + $25/1M output

**Étapes:**
1. Aller sur https://console.anthropic.com/
2. Sign up / Login
3. Choisir plan (Pay as you go - $0 pour commencer)
4. Récupérer l'API key dans Settings → API Keys
5. Ajouter sur Vercel:
   ```
   Name: ANTHROPIC_API_KEY
   Value: ***ta clé API***
   Environments: Production, Preview, Development
   ```

## 📊 STRUCTURE DES DONNÉES

### Claude Vision Analysis:

```typescript
{
  // Body composition
  bodyFat: number        // %
  muscleMass: number     // kg
  bmi: number
  weight: number         // kg

  // Muscle groups (0-10)
  chestScore: number
  backScore: number
  legsScore: number
  armsScore: number
  shouldersScore: number
  coreScore: number

  // Analysis
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]

  // Overall
  overallScore: number   // 0-100
  confidence: number     // 0-1
}
```

### Mapping Claude → Coach IA:

| Claude | Coach IA (Measurement) |
|--------|------------------------|
| `weight` | `weight` |
| `bodyFat` | `bodyFat` |
| `muscleMass` | `muscleMass` |
| `bmi` | `bmi` |
| `muscleScores` | `claudeData.muscleScores` |
| `strengths` | `claudeData.strengths` |
| `weaknesses` | `claudeData.weaknesses` |
| `recommendations` | `claudeData.recommendations` |
| `overallScore` | `claudeData.overallScore` |

## 🚀 API USAGE

### Analyser une photo:

```typescript
POST /api/analysis/photos
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
    "claudeData": {
      "muscleScores": {
        "chest": 7.5,
        "back": 8.0,
        "legs": 7.0,
        "arms": 7.5,
        "shoulders": 8.5,
        "core": 6.5
      },
      "strengths": ["Good upper body development"],
      "weaknesses": ["Legs need improvement"],
      "recommendations": ["Focus on squats"],
      "overallScore": 75,
      "confidence": 0.85,
      "imageUrl": "https://..."
    }
  },
  "analysis": { ... },
  "message": "Claude Vision analysis synced successfully"
}
```

### Historique:

```typescript
GET /api/analysis/photos?action=history&days=30
```

**Réponse:**
```json
{
  "measurements": [ ... ],
  "total": 5,
  "message": "Found 5 Claude analyses"
}
```

### Progression:

```typescript
GET /api/analysis/photos?action=progress&days=30
```

**Réponse:**
```json
{
  "progress": {
    "weightChange": -2.3,
    "bodyFatChange": -0.5,
    "muscleMassChange": +1.2,
    "overallScoreChange": +5,
    "daysElapsed": 30
  },
  "latest": { ... },
  "oldest": { ... },
  "measurements": [ ... ],
  "message": "Progress calculated over 30 days"
}
```

### Comparer photos:

```typescript
GET /api/analysis/photos?action=compare&photos=url1,url2&days=30
```

**Réponse:**
```json
{
  "overallScore": 75,
  "progress": {
    "weightChange": -2.3,
    "bodyFatChange": -0.5,
    "muscleMassChange": +1.2
  },
  "recommendations": [
    "Excellent weight loss progress! Continue current approach."
  ],
  "strengths": [ ... ],
  "weaknesses": [ ... ]
}
```

## 💰 COÛTS ESTIMÉS

### Photos (3-4/semaine):

**Analyse:**
- 4 photos × ~1,600 tokens + prompt ≈ 7,500 tokens input, ~800 output
- Sur Sonnet 4.6: ~$0,15/mois

**Progression:**
- Comparaison mensuelle: ~2,000 tokens
- Sur Sonnet 4.6: ~$0,03/mois

**Total Sprint 1:** **~$0,18/mois**

## 🎯 PROCHAINES ÉTAPES

1. ✅ Hevy API - COMPLÉTÉ
2. ✅ Journal Santé API - COMPLÉTÉ
3. ✅ Claude Vision - COMPLÉTÉ
4. ⏳ MediaPipe - Analyse vidéo
5. ⏳ Dashboard - Frontend

---

**Sprint 1 terminé! On continue avec MediaPipe?** 🚀