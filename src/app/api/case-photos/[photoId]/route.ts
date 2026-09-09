import { headers as nextHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { canViewCasePhoto, getPhotoMediaId, type PhotoViewer } from '@/db/queries/case-photos'
import { auth } from '@/lib/auth'

/**
 * Serving an intraoral photograph.
 *
 * There is no public URL for these and nothing is served from `/public`. Every
 * request re-answers "who is asking?" — a session that was valid a minute ago
 * proves nothing now, and a student suspended since then must stop seeing
 * photographs immediately.
 *
 * Three kinds of viewer are allowed, per the access table in CLAUDE.md: an
 * admin, a verified student, and the patient holding the tracking token for
 * their own case. A patient passes their token as a query parameter because they
 * have no session — it is the same credential their tracking page runs on.
 */
export const dynamic = 'force-dynamic'

async function identifyViewer(request: Request): Promise<PhotoViewer | null> {
  const requestHeaders = await nextHeaders()

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  if (user && user.collection === 'admins') return { kind: 'ADMIN' }

  const session = await auth.api.getSession({ headers: requestHeaders })
  if (session) return { kind: 'STUDENT', authUserId: session.user.id }

  const trackingToken = new URL(request.url).searchParams.get('t')
  if (trackingToken) return { kind: 'PATIENT', trackingToken }

  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
): Promise<Response> {
  const { photoId } = await params

  const viewer = await identifyViewer(request)
  // 404 rather than 401: whether a given photo id exists is itself something
  // only an allowed viewer should learn.
  if (!viewer) return NextResponse.json({ ok: false }, { status: 404 })

  if (!(await canViewCasePhoto(photoId, viewer))) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const mediaId = await getPhotoMediaId(photoId)
  if (!mediaId) return NextResponse.json({ ok: false }, { status: 404 })

  try {
    const payload = await getPayload({ config })
    // overrideAccess: Payload's own rule limits reads to admins, and this route
    // has just done its own, broader check on the caller's behalf.
    const media = await payload.findByID({
      collection: 'case-photos',
      id: mediaId,
      overrideAccess: true,
    })

    const filename = media?.filename
    if (!filename) return NextResponse.json({ ok: false }, { status: 404 })

    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const file = await readFile(join(process.cwd(), 'uploads/case-photos', filename))

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'content-type': 'image/webp',
        // Cached by the browser that fetched it, never by a shared cache: the
        // next person down the wire is not necessarily allowed to see this.
        'cache-control': 'private, max-age=300',
        'content-disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
}
