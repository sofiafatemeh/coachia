import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  checkPassword,
  isAuthConfigured,
} from '@/lib/auth'

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: 'Authentification non configurée (définir APP_PASSWORD et AUTH_SECRET)' },
      { status: 500 }
    )
  }

  let password: string | undefined
  try {
    const body = await request.json()
    password = body?.password
  } catch {
    // no/invalid body -> treated as wrong password below
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return response
}
