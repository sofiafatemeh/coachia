import { NextResponse } from 'next/server'
import { getJournalClient } from '@/lib/journal-sante'
import { getJournalSyncService } from '@/lib/journal-sync'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    // Check if we want to sync from Journal Santé
    const sync = searchParams.get('sync') === 'true'

    if (sync) {
      // Sync from Journal Santé
      const syncService = getJournalSyncService()
      const result = await syncService.syncMeals({ days })
      return NextResponse.json(result)
    }

    // Query database
    const where: any = {}

    if (startDate) {
      where.time = { ...where.time, gte: new Date(startDate) }
    }

    if (endDate) {
      where.time = { ...where.time, lte: new Date(endDate) }
    }

    const meals = await prisma.meal.findMany({
      where,
      orderBy: { time: 'desc' },
      take: days > 0 ? days * 5 : 50 // Approx 5 meals per day
    })

    return NextResponse.json({ meals, total: meals.length })
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Create meal
    const meal = await prisma.meal.create({
      data: {
        userId: 'system', // TODO: Get from auth
        name: body.name,
        type: body.type || 'snack',
        time: new Date(body.time || Date.now()),
        calories: body.calories,
        protein: body.protein,
        carbs: body.carbs,
        fats: body.fats,
        fiber: body.fiber,
        sugar: body.sugar,
        journalId: body.journalId
      }
    })

    return NextResponse.json({ meal }, { status: 201 })
  } catch (error) {
    console.error('Error creating meal:', error)
    return NextResponse.json(
      { error: 'Failed to create meal' },
      { status: 500 }
    )
  }
}