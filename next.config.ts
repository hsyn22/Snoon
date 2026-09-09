import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Intraoral photographs are never served from /public — they go through an
  // authenticated route that re-checks authorisation per request. See CLAUDE.md.
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
