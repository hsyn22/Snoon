import Link from 'next/link'
import { common } from '@/lib/copy'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">{common.notFoundTitle}</h1>
      <p className="mt-2 text-foreground-muted">{common.notFoundBody}</p>
      <Link href="/" className="mt-6 text-sm font-medium text-accent underline">
        {common.backHome}
      </Link>
    </main>
  )
}
