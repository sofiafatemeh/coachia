import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Call Journal Santé API
    const response = await fetch('http://localhost:3000/api/meals', {
      method: 'GET',
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch meals')
    }
    
    const meals = await response.json()
    return NextResponse.json(meals)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 })
  }
}