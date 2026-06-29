import { NextResponse } from 'next/server'
import { getHevyClient } from '@/lib/heavy'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const hevy = getHevyClient()
    const data = await hevy.getWorkouts({ page, pageSize, startDate, endDate })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching Hevy workouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workouts from Hevy' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const hevy = getHevyClient()

    // Sync workouts from Hevy to database
    const workouts = await hevy.getWorkouts()

    // TODO: Save workouts to Prisma database
    // await prisma.workout.createMany(...)

    return NextResponse.json({
      success: true,
      synced: workouts.workouts.length,
      message: `Synced ${workouts.workouts.length} workouts from Hevy`
    })
  } catch (error) {
    console.error('Error syncing Hevy workouts:', error)
    return NextResponse.json(
      { error: 'Failed to sync workouts from Hevy' },
      { status: 500 }
    )
  }
}