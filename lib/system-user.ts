import prisma from '@/lib/prisma'

const SYSTEM_USER_EMAIL = 'system@example.com'

/**
 * Returns the id of the shared "system" user, creating it if needed.
 * `upsert` makes this safe against concurrent requests (no duplicate-key race).
 *
 * NOTE: this is a single-user placeholder until real authentication is added.
 * Every sync/analysis currently writes under this one account.
 */
export async function getOrCreateSystemUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: { email: SYSTEM_USER_EMAIL, name: 'System User' },
  })
  return user.id
}
