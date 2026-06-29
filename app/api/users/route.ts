import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        measurements: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        workouts: {
          orderBy: { completedAt: 'desc' },
          take: 5
        },
        meals: {
          orderBy: { time: 'desc' },
          take: 5
        }
      }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST create user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name } = body

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}