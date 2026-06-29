#!/bin/bash

echo "🔍 CHECKING PRISMA SCHEMA vs DATABASE"
echo ""

cd /home/crypton/glmdev/coach

echo "📋 Comparaison schema vs database:"
echo ""

# Vérifier si la database a des tables
echo "Checking database tables..."
npx prisma db pull --print 2>&1 | grep "model\{" | sed 's/model //' | sed 's/ {//'

echo ""
echo "🔍 Checking current schema:"
echo ""
grep "^model " prisma/schema.prisma | sed 's/model //'

echo ""
echo "✅ Check terminé!"