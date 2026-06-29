import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET measurements for user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const measurements = await prisma.measurement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(measurements)
  } catch (error) {
    console.error('Error fetching measurements:', error)
    return NextResponse.json({ error: 'Failed to fetch measurements' }, { status: 500 })
  }
}

// POST create measurement
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, weight, bodyFat, muscleMass, bmi, bodyScoreId, bodyScoreData } = body

    const measurement = await prisma.measurement.create({
      data: {
        userId,
        weight,
        bodyFat: bodyFat || null,
        muscleMass: muscleMass || null,
        bmi: bmi || null,
        bodyScoreId: bodyScoreId || null,
        bodyScoreData: bodyScoreData || null
      }
    })

    return NextResponse.json(measurement, { status: 201 })
  } catch (error) {
    console.error('Error creating measurement:', error)
    return NextResponse.json({ error: 'Failed to create measurement' }, { status: 500 })
  }
}