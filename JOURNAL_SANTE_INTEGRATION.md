# Journal Santé API - Intégration Nutrition

## ✅ COMPLÉTÉ

### Création des fichiers:

1. **`lib/journal-sante.ts`** - Client API complet
   - ✅ `getMeals()` - Récupérer tous les repas
   - ✅ `getMealById(id)` - Récupérer un repas par ID
   - ✅ `createMeal(meal)` - Créer un repas
   - ✅ `getMeasurements()` - Récupérer les mesures
   - ✅ `getActivities()` - Récupérer les activités
   - ✅ `getSupplements()` - Récupérer les compléments

2. **`lib/journal-sync.ts`** - Service de sync
   - ✅ `syncMeals({ days })` - Sync des repas
   - ✅ Détection automatique du type de repas (breakfast, lunch, dinner, snack)
   - ✅ Mise à jour ou création intelligente
   - ✅ Gestion des erreurs

3. **`app/api/nutrition/meals/route.ts`** - API route
   - ✅ `GET /api/nutrition/meals` - Lister les repas
   - ✅ `GET /api/nutrition/meals?sync=true` - Sync depuis Journal Santé
   - ✅ `POST /api/nutrition/meals` - Créer un repas

### Configuration:

**Variable d'environnement:**
```bash
JOURNAL_SANTE_API_URL=http://localhost:3000/api
```

**Usage:**

```typescript
// Sync depuis Journal Santé
GET /api/nutrition/meals?sync=true&days=30

// Lister les repas depuis database
GET /api/nutrition/meals?startDate=2024-01-01&endDate=2024-01-31

// Créer un repas
POST /api/nutrition/meals
{
  "name": "Poulet rôti",
  "type": "lunch",
  "time": "2024-01-15T12:00:00Z",
  "calories": 500,
  "protein": 40,
  "carbs": 30,
  "fats": 20,
  "fiber": 5
}
```

### Mapping Journal Santé → Coach IA:

| Journal Santé | Coach IA |
|---------------|----------|
| `eatenAt` | `time` |
| `label` | `name` |
| `calories` | `calories` |
| `protein` | `protein` |
| `carbs` | `carbs` |
| `fat` | `fats` |
| `fiber` | `fiber` |
| `id` | `journalId` |
| - | `type` (auto-detecté) |

### Données retournées:

```json
{
  "meals": [
    {
      "id": "clxxx",
      "userId": "system",
      "journalId": "journal-meal-id",
      "name": "Poulet rôti",
      "type": "lunch",
      "time": "2024-01-15T12:00:00Z",
      "calories": 500,
      "protein": 40,
      "carbs": 30,
      "fats": 20,
      "fiber": 5,
      "sugar": null,
      "createdAt": "2024-01-15T12:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Prochaine étape:

1. ✅ Hevy API - COMPLÉTÉ
2. ✅ Journal Santé API - COMPLÉTÉ
3. ⏳ BodyScore AI - Analyse morpho
4. ⏳ MediaPipe - Analyse vidéo
5. ⏳ Dashboard - Frontend

---

**Prochaine intégration: BodyScore AI?** 🚀