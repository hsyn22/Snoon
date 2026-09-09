/* eslint-disable */
/**
 * Payload's admin owns its own <html> element, its own styling and its own
 * direction, which is why it lives in a route group with a separate root layout
 * rather than under the Arabic RTL shell the rest of the site uses.
 *
 * This file follows Payload's required scaffold. Keep edits minimal.
 */
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import config from '@payload-config'
import { importMap } from './admin/importMap'
import '@payloadcms/next/css'

type Args = { children: React.ReactNode }

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

export default function Layout({ children }: Args) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}
