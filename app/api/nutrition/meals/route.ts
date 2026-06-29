import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all meals
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')

    const meals = await prisma.meal.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(date ? {
          time: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
          }
        } : {})
      },
      orderBy: { time: 'asc' }
    })

    return NextResponse.json(meals)
  } catch (error) {
    console.error('Error fetching meals:', error)
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 })
  }
}

// POST create meal
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, name, type, time, calories, protein, carbs, fats, fiber, sugar } = body

    const meal = await prisma.meal.create({
      data: {
        userId,
        name,
        type,
        time: new Date(time),
        calories,
        protein,
        carbs,
        fats,
        fiber: fiber || null,
        sugar: sugar || null
      }
    })

    return NextResponse.json(meal, { status: 201 })
  } catch (error) {
    console.error('Error creating meal:', error)
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
  }
}