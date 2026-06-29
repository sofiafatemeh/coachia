#!/bin/bash

echo "🔧 Setup Automatique Neon Database"
echo ""

# 1. Supprimer l'ancien .env
rm -f .env

# 2. Récupérer depuis Vercel (tous les environnements)
echo "📥 Récupération .env depuis Vercel (all envs)..."

# Essayer de récupérer pour chaque environment
for env in production preview development; do
    echo "   - Env: $env"
    vercel env pull .env --environment=$env 2>/dev/null
done

# 3. Chercher DATABASE_URL dans les fichiers générés
echo ""
echo "🔍 Recherche DATABASE_URL..."

if [ -f ".env" ]; then
    if grep -q "DATABASE_URL" .env; then
        echo "✅ DATABASE_URL trouvé dans .env"
        grep "DATABASE_URL" .env | head -1
    else
        echo "❌ DATABASE_URL PAS dans .env"
        echo ""
        echo "Contenu de .env (premières lignes):"
        head -20 .env
    fi
else
    echo "❌ .env pas créé"
fi

# 4. Lancer la migration
echo ""
echo "🚀 Lancement migration Prisma..."

npx prisma migrate dev --name init 2>&1

echo ""
echo "✅ Setup terminé!"