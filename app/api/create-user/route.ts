import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    console.log('[API] Creating default user...')

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: 'system@example.com' },
    })

    if (!user) {
      console.log('[API] Creating user...')
      user = await prisma.user.create({
        data: {
          email: 'system@example.com',
          name: 'System User',
          password: 'dummy', // Will be replaced with proper auth
        },
      })
      console.log('[API] User created:', user.id)
    } else {
      console.log('[API] User exists:', user.id)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}