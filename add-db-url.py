#!/usr/bin/env python3
"""Script pour ajouter DATABASE_URL au .env"""
import os

print("📋 Ajout du DATABASE_URL au .env\n")

DATABASE_URL = input("Colle le DATABASE_URL depuis Neon ici: ").strip()

if not DATABASE_URL:
    print("❌ DATABASE_URL vide!")
    exit(1)

# Vérifier le format
if not DATABASE_URL.startswith("postgres://"):
    print("⚠️ DATABASE_URL doit commencer par 'postgres://'")

# Ajouter au .env
env_path = ".env"

try:
    with open(env_path, 'r') as f:
        existing = f.read()
    
    if "DATABASE_URL" in existing:
        print("⚠️ DATABASE_URL existe déjà dans .env")
        
        # Supprimer l'ancien
        lines = existing.split('\n')
        lines = [l for l in lines if not l.startswith('DATABASE_URL')]
        existing = '\n'.join(lines)
    
    with open(env_path, 'w') as f:
        f.write(existing + f'\nDATABASE_URL="{DATABASE_URL}"\n')
    
    print(f"✅ DATABASE_URL ajouté à {env_path}")
    
    # Afficher les 50 premiers + 10 derniers caractères
    print(f"   URL: {DATABASE_URL[:50]}...{DATABASE_URL[-10:]}")
    
    # 2. Lancer la migration Prisma
    print("\n🚀 Lancer migration Prisma maintenant? (o/n): ")
    choice = input().strip().lower()
    
    if choice == 'o':
        print("\n🚀 Lancement migration Prisma...")
        os.system("npx prisma migrate dev --name init")
    else:
        print("✅ Pour lancer la migration plus tard:")
        print("   npx prisma migrate dev --name init")
        
except Exception as e:
    print(f"❌ Erreur: {e}")