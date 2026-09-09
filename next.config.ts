import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Intraoral photographs are never served from /public — they go through an
  // authenticated route that re-checks authorisation per request. See CLAUDE.md.
  images: {
    remotePatterns: [],
  },
}

// Payload wraps the config to register its admin bundle and server externals.
export default withPayload(nextConfig)
