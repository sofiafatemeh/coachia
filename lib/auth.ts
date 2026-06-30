import { createHmac, timingSafeEqual } from 'node:crypto'

// Single-user authentication: one shared password (APP_PASSWORD) gates the whole
// app. A successful login sets a signed, httpOnly session cookie that the proxy
// (proxy.ts) verifies on every request. Signing key is AUTH_SECRET.

export const SESSION_COOKIE = 'coachia_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is not set')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

/** Compare two strings in constant time, returning false on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Build a `<expiryEpochSeconds>.<hmac>` session token. */
export function createSessionToken(now: number = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_TTL_SECONDS
  const payload = String(exp)
  return `${payload}.${sign(payload)}`
}

/** Verify signature + expiry of a session token. Fails closed on any error. */
export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false

  const dot = token.lastIndexOf('.')
  if (dot <= 0) return false

  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  let expected: string
  try {
    expected = sign(payload)
  } catch {
    return false // AUTH_SECRET missing -> deny
  }

  if (!safeEqual(signature, expected)) return false

  const exp = Number(payload)
  if (!Number.isFinite(exp)) return false
  return exp * 1000 > Date.now()
}

/** Constant-time check of a submitted password against APP_PASSWORD. */
export function checkPassword(input: string | undefined | null): boolean {
  const expected = process.env.APP_PASSWORD
  if (!expected || !input) return false
  return safeEqual(input, expected)
}

/** Whether the auth env vars are configured. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.AUTH_SECRET)
}
