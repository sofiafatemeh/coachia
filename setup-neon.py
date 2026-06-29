#!/usr/bin/env python3
"""Script pour récupérer DATABASE_URL depuis Vercel et lancer migration Prisma"""
import subprocess
import os
import re

print("🔧 Setup Prisma + Neon Database\n")

# 1. Récupérer le .env depuis Vercel
print("📋 Étape 1: Récupérer .env depuis Vercel")
print("   Commande: vercel env pull .env\n")

try:
    result = subprocess.run(
        ["vercel", "env", "pull", ".env"],
        capture_output=True,
        text=True,
        timeout=60
    )
    
    if result.returncode == 0:
        print("✅ .env créé avec succès")
        
        # Vérifier que DATABASE_URL est dans .env
        try:
            with open(".env", "r") as f:
                content = f.read()
                if "DATABASE_URL" in content:
                    print("✅ DATABASE_URL présent dans .env")
                    url = content.split('DATABASE_URL=')[1].split('\n')[0]
                    print(f"   {url[:50]}...{url[-10:]}")
                    
                    # 2. Lancer la migration Prisma
                    print("\n🚀 Étape 2: Lancer migration Prisma")
                    
                    migrate_result = subprocess.run(
                        ["npx", "prisma", "migrate", "dev", "--name", "init"],
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    
                    print(migrate_result.stdout)
                    
                    if migrate_result.returncode == 0:
                        print("\n✅ MIGRATION RÉUSSIE!")
                        print("📊 Tables créées dans Neon Database")
                        print("\n📝 Tables créées:")
                        print("   - User")
                        print("   - Measurement")
                        print("   - Workout")
                        print("   - Exercise")
                        print("   - ExerciseSet")
                        print("   - Meal")
                        print("   - Video")
                        print("   - ProgressPhoto")
                        print("\n🎯 Prochaine étape: Redéployer sur Vercel")
                        print("   Commande: vercel --prod --yes")
                    else:
                        print(f"\n❌ Erreur migration:\n{migrate_result.stderr}")
                else:
                    print("❌ DATABASE_URL pas dans .env")
                    print(f"\nContenu du .env:\n{content}")
        except FileNotFoundError:
            print("❌ Fichier .env pas trouvé")
    else:
        print(f"❌ Erreur pull env:\n{result.stderr}")
        
except subprocess.TimeoutExpired:
    print("❌ Timeout")
except Exception as e:
    print(f"❌ Erreur: {e}")