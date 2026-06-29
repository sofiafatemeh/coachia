#!/usr/bin/env python3
"""Script pour mettre à jour le schema Prisma avec migration safe"""
import subprocess
import os
import re

print("🔧 MISE À JOUR PRISMA SCHEMA - SAFE MIGRATION\n")

os.chdir("/home/crypton/glmdev/coach")

# 1. Ajouter les champs manquants à ExerciseSet
print("📝 Étape 1: Ajouter champs ExerciseSet")

schema_path = "prisma/schema.prisma"

with open(schema_path, 'r') as f:
    content = f.read()

# Vérifier si les champs sont déjà présents
exercise_set_section = content.split('model ExerciseSet {')[1].split('}')[0]

missing_fields = []

# Liste des champs requis
required_fields = {
    'workoutId': 'workoutId   String\n  workout     Workout @relation(fields: [workoutId], references: [id], onDelete: Cascade)',
    'setType': 'setType     String   @default("normal")  // normal, warmup, drop, failure',
    'oneRm': 'oneRm       Float?   // Estimated 1RM',
    'isToFailure': 'isToFailure Boolean  @default(false)',
    'isWarmup': 'isWarmup   Boolean  @default(false)',
    'isDropSet': 'isDropSet Boolean  @default(false)',
    'setIndex': 'setIndex   Int      @default(0)  // Order within exercise',
    'supersetIds': 'supersetIds Int[]    @default([])  // Superset group IDs'
}

for field_name, field_def in required_fields.items():
    if field_name not in exercise_set_section:
        missing_fields.append((field_name, field_def))

if not missing_fields:
    print("✅ Tous les champs sont déjà présents")
else:
    print(f"⚠️ Champs manquants: {len(missing_fields)}")
    for field_name, _ in missing_fields:
        print(f"   - {field_name}")

    # Mettre à jour le schema
    print("\n📝 Mise à jour du schema...")
    
    new_content = content
    
    # Ajouter les champs après 'createdAt'
    for field_name, field_def in missing_fields:
        # Trouver la ligne 'createdAt' et ajouter après
        pattern = r'(createdAt\s+DateTime\s+@default\(now\(\))'
        replacement = f'\\1\n  {field_def}'
        new_content = re.sub(pattern, replacement, new_content, count=1)
    
    with open(schema_path, 'w') as f:
        f.write(new_content)
    
    print("✅ Schema mis à jour")

# 2. Lancer la migration
print("\n🚀 Étape 2: Lancer migration Prisma")

try:
    result = subprocess.run(
        ["npx", "prisma", "migrate", "dev", "--name", "add_hevy_fields"],
        capture_output=True,
        text=True,
        timeout=60
    )
    
    print(result.stdout)
    
    if result.returncode == 0:
        print("\n✅ MIGRATION RÉUSSIE!")
        print("📊 Champs ajoutés à ExerciseSet:")
        for field_name, _ in missing_fields:
            print(f"   - {field_name}")
    else:
        print(f"\n❌ Erreur migration:\n{result.stderr}")
        
except subprocess.TimeoutExpired:
    print("❌ Timeout")
except Exception as e:
    print(f"❌ Erreur: {e}")

print("\n🎯 Prochaine étape: Commit et push")
print("   git add . && git commit -m 'Add Hevy fields to ExerciseSet' && git push")