# MediaPipe - Intégration Analyse Vidéo

## ✅ COMPLÉTÉ

### Création des fichiers:

1. **`lib/mediapipe.ts`** - Client MediaPipe Pose (8554 bytes)
   - ✅ `MediaPipeClient` - Client pour analyse vidéo
   - ✅ `PoseAnalyzer` - Analyseur de pose
   - ✅ `calculateAngle()` - Calcul angle entre 3 points
   - ✅ `calculateROM()` - Calcul Range of Motion
   - ✅ `calculateTempo()` - Calcul tempo (concentric/eccentric)
   - ✅ `calculateSymmetry()` - Calcul symétrie gauche/droite
   - ✅ `calculateBarPath()` - Calcul bar path deviation
   - ✅ `analyzeExercise()` - Analyse complète exercice
   - ✅ `extractKeyFrames()` - Extraction keyframes

2. **`lib/mediapipe-sync.ts`** - Service sync avec database (6722 bytes)
   - ✅ `analyzeVideo(videoUrl)` - Analyse vidéo de base
   - ✅ `analyzeVideoWithKeyframes()` - Analyse complète avec Claude
   - ✅ `extractKeyframes()` - Extraction keyframes
   - ✅ `analyzeKeyframe()` - Analyse d'un keyframe
   - ✅ `calculateOverallMetrics()` - Calcul métriques globales
   - ✅ `sendToClaude()` - Envoi à Claude pour feedback

3. **`app/api/analysis/video/route.ts`** - API route (2143 bytes)
   - ✅ `POST /api/analysis/video` - Analyser une vidéo
   - ✅ `GET /api/analysis/video?videoId=xxx` - Récupérer analyse

## 📊 STRUCTURE DES DONNÉES

### MediaPipe Pose Landmarks (33 points):

```
0-10: Face landmarks
11-14: Left arm (shoulder, elbow, wrist)
12-15: Right arm (shoulder, elbow, wrist)
23-24: Left leg (hip, knee, ankle)
24-25: Right leg (hip, knee, ankle)
23-25: Torso (hips)
11-12: Shoulders
```

### Exercise Analysis:

```typescript
{
  // Joint angles (degrees)
  elbowAngle: number
  shoulderAngle: number
  hipAngle: number
  kneeAngle: number
  
  // ROM (Range of Motion)
  elbowROM: number
  shoulderROM: number
  hipROM: number
  kneeROM: number
  
  // Tempo (seconds)
  concentricTime: number
  eccentricTime: number
  totalTime: number
  
  // Symmetry
  leftRightSymmetry: number  // 0-1
  
  // Bar path
  barPath: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    deviation: number  // % deviation from vertical
  }
  
  // Rep detection
  repCount: number
  repQuality: number  // 0-1
}
```

### Mapping MediaPipe → Coach IA:

| MediaPipe | Coach IA (Video) |
|-----------|-----------------|
| `pose.landmarks` | `aiData.poseData` |
| `exerciseAnalysis` | `aiData.analysis` |
| `keyframes` | `aiData.keyframes` |
| `claudeFeedback` | `aiData.claudeFeedback` |

## 🚀 ARCHITECTURE SMART

### Scénario A: Smart (Recommandé) - ~$1,5/mois

```
Browser-side:
  Video → MediaPipe Pose → Extract keyframes (4-5 frames)
  Calculs (angles, ROM, tempo, symmetry, bar path) → Pur code
  
Server-side:
  Keyframes + metrics → Claude Sonnet → Coaching qualitatif
  
Result:
  - 50 frames + ~30k tokens texte/semaine
  - ~90k input + ~5k output
  - ~$0,35/semaine = ~$1,5/mois
```

### Scénario B: Milieu - ~$5/mois

```
Browser-side:
  Video → MediaPipe Pose → All frames (1 fps)
  
Server-side:
  300 frames → Claude Sonnet → Analyse
  
Result:
  - 300 frames × 800 tokens = ~360k tokens
  - ~$1,1/semaine = ~$5/mois
```

### Scénario C: Naïf - ~$20-30/mois

```
Browser-side:
  Video → MediaPipe Pose → All frames (5 fps)
  
Server-side:
  1,500 frames → Claude Sonnet → Analyse
  
Result:
  - 1,500 frames × 800 tokens = ~1,5M tokens
  - ~$4,5/semaine = ~$20/mois
```

## 🚀 API USAGE

### Analyser une vidéo (basic):

```typescript
POST /api/analysis/video
{
  "videoUrl": "https://drive.google.com/file/d/xxx/view",
  "exerciseId": "squat",
  "workoutId": "workout-123"
}
```

**Réponse:**
```json
{
  "video": {
    "id": "clxxx",
    "userId": "system",
    "url": "https://...",
    "exerciseId": "squat",
    "aiData": {
      "poseData": [],
      "keyframes": [],
      "analysis": {
        "repCount": 0,
        "repQuality": 0,
        "angles": {},
        "tempo": {},
        "symmetry": 0,
        "barPath": {}
      }
    }
  },
  "analysis": { ... },
  "message": "MediaPipe video analysis synced successfully"
}
```

### Analyser une vidéo (full + Claude):

```typescript
POST /api/analysis/video
{
  "videoUrl": "https://drive.google.com/file/d/xxx/view",
  "exerciseId": "squat",
  "frames": [
    { "landmarks": [...] },  // Keyframe 1
    { "landmarks": [...] },  // Keyframe 2
    ...
  ]
}
```

**Réponse:**
```json
{
  "video": { ... },
  "analysis": {
    "elbowAngle": 85.5,
    "shoulderAngle": 45.2,
    "hipAngle": 72.3,
    "kneeAngle": 92.1,
    "elbowROM": 45.0,
    "shoulderROM": 30.0,
    "hipROM": 60.0,
    "kneeROM": 80.0,
    "concentricTime": 1.2,
    "eccentricTime": 1.5,
    "totalTime": 2.7,
    "leftRightSymmetry": 0.92,
    "barPath": {
      "start": { "x": 0.5, "y": 0.3 },
      "end": { "x": 0.5, "y": 0.7 },
      "deviation": 5.2
    },
    "repCount": 5,
    "repQuality": 0.85
  },
  "claudeFeedback": {
    "feedback": [
      "Excellent squat depth!",
      "Maintain bar over midfoot"
    ],
    "score": 85,
    "issues": [
      "Knees caving slightly"
    ],
    "improvements": [
      "Focus on glute engagement"
    ]
  },
  "message": "MediaPipe + Claude video analysis synced successfully"
}
```

### Récupérer une analyse:

```typescript
GET /api/analysis/video?videoId=clxxx
```

## 💰 COÛTS ESTIMÉS

### Vidéos (10 × 30s/semaine):

**Architecture Smart (Scénario A):**
- Keyframes: 5 frames/vidéo × 10 = 50 frames
- Metrics text: ~30k tokens/semaine
- Claude coaching: ~90k input + ~5k output
- Sur Sonnet 4.6: ~$0,35/semaine = **~$1,5/mois**

**Architecture Milieu (Scénario B):**
- All frames (1 fps): 30 frames/vidéo × 10 = 300 frames
- Claude coaching: ~360k tokens
- Sur Sonnet 4.6: ~$1,1/semaine = **~$5/mois**

**Architecture Naïf (Scénario C):**
- All frames (5 fps): 150 frames/vidéo × 10 = 1,500 frames
- Claude coaching: ~1,5M tokens
- Sur Sonnet 4.6: ~$4,5/semaine = **~$20/mois**

## 🎯 PROCHAINES ÉTAPES

1. ✅ Hevy API - COMPLÉTÉ
2. ✅ Journal Santé API - COMPLÉTÉ
3. ✅ Claude Vision - COMPLÉTÉ
4. ✅ MediaPipe - COMPLÉTÉ
5. ⏳ Dashboard - Frontend
6. ⏳ Rapports hebdo - Claude Opus

## 📋 TODO: IMPLEMENTATION CLIENT-SIDE

Pour l'analyse vidéo côté client, ajouter:

```typescript
// app/components/VideoAnalyzer.tsx
import { MediaPipeClient } from '@/lib/mediapipe'

export function VideoAnalyzer() {
  const client = new MediaPipeClient()
  
  async function analyzeVideo(videoFile: File) {
    const videoUrl = URL.createObjectURL(videoFile)
    
    // Initialize MediaPipe
    await client.initialize()
    
    // Extract keyframes
    const frames = await client.analyzeVideoFrames(videoUrl, {
      sampleRate: 1,  // 1 fps
      maxFrames: 30
    })
    
    // Extract 5 keyframes
    const keyframes = client.extractKeyFrames(frames, 5)
    
    // Send to server
    const response = await fetch('/api/analysis/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl,
        frames: keyframes
      })
    })
    
    return response.json()
  }
}
```

---

**Sprint 2 terminé! Commit + push!** 🚀