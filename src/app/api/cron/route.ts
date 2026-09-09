import { NextResponse } from 'next/server'
import { runScheduledJobs } from '@/lib/cases/scheduled'
import { isAuthorisedCronRequest } from '@/lib/cron-auth'

/**
 * The scheduled-job endpoint.
 *
 * Deliberately a plain HTTP route rather than anything host-specific, so the
 * same code is driven by a Vercel cron, a Dokploy cron calling curl, or a
 * systemd timer. Where سنون ends up hosted is still open; the job should not
 * have an opinion about it.
 *
 * It changes case state — releasing claims, expiring cases — so it is not
 * public. `CRON_SECRET` must match, compared in constant time. Without the
 * secret set the route refuses to run at all rather than defaulting to open.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handle(request: Request): Promise<Response> {
  if (!isAuthorisedCronRequest(request.headers, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const report = await runScheduledJobs()
    // Logged so a scheduler's own history shows what happened, not just that it
    // returned 200.
    console.info('Scheduled jobs ran:', JSON.stringify(report))
    return NextResponse.json({ ok: true, ...report })
  } catch (error) {
    console.error(
      'Scheduled jobs failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
    // 500 so the scheduler records a failure and retries on its next tick.
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
