#!/bin/bash

# Prisma migrate deploy pour Vercel
npx prisma migrate deploy
npx prisma generate

# Build Next.js
npm run build