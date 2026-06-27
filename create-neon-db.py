#!/usr/bin/env python3
"""Script pour créer un projet Neon via API"""
import requests
import json
import os
import subprocess

# Configuration
NEON_API_URL = "https://console.neon.tech/api/v2/projects"
NEON_API_KEY = os.environ.get("NEON_API_KEY", "")

if not NEON_API_KEY:
    print("❌ NEON_API_KEY non trouvé dans les variables d'environnement")
    print("🔑 Pour obtenir une API key:")
    print("   1. Aller sur https://console.neon.tech/auth/tokens")
    print("   2. Créer un nouveau token")
    print("   3. Copier le token")
    print("   4. Exporter: export NEON_API_KEY='ton-token'")
    exit(1)

# Créer le projet Neon
headers = {
    "Authorization": f"Bearer {NEON_API_KEY}",
    "Content-Type": "application/json"
}

data = {
    "name": "coachia",
    "region": "aws-eu-central-1"
}

print("🚀 Création du projet Neon 'coachia'...")
try:
    response = requests.post(NEON_API_URL, headers=headers, json=data)
    response.raise_for_status()
    project = response.json()
    
    print("✅ Projet créé avec succès!")
    print(f"   ID: {project['id']}")
    print(f"   Name: {project['name']}")
    
    # Récupérer la connection string
    if project.get('connection_uris'):
        for uri in project['connection_uris']:
            if uri.get('connection_parameters'):
                conn_params = uri['connection_parameters']
                database_url = f"postgres://{conn_params['user']}:{conn_params['password']}@{conn_params['host']}:{conn_params['port']}/{conn_params['database']}?sslmode=require"
                
                print(f"\n🔑 DATABASE_URL:")
                print(database_url)
                
                # Sauvegarder dans un fichier
                with open('/home/crypton/glmdev/coach/.env.neon', 'w') as f:
                    f.write(f'DATABASE_URL="{database_url}"\n')
                
                print("\n✅ DATABASE_URL sauvegardé dans .env.neon")
                print("📝 Pour utiliser: cp .env.neon .env")
    
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        print("❌ API key invalide")
    elif e.response.status_code == 429:
        print("❌ Trop de requêtes (rate limit)")
    else:
        print(f"❌ Erreur: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Erreur: {e}")
    exit(1)