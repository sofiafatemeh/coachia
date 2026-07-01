import { put } from '@vercel/blob'

/**
 * Upload a progress photo to Vercel Blob and return its public URL.
 * Requires BLOB_READ_WRITE_TOKEN (set automatically on Vercel once Blob is enabled).
 */
export async function uploadProgressPhoto(
  buffer: Buffer,
  opts: { angle: string; weekKey: string; contentType?: string }
): Promise<string> {
  const pathname = `progress/${opts.weekKey}/${opts.angle}.jpg`
  const { url } = await put(pathname, buffer, {
    access: 'public',
    contentType: opts.contentType ?? 'image/jpeg',
    addRandomSuffix: true,
  })
  return url
}
