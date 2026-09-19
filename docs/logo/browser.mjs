/**
 * One place that knows how to open a browser.
 *
 * The sandbox ships Chromium at a fixed path that will not match whatever build
 * the installed `playwright` package expects, so the executable is named rather
 * than resolved. `CHROME_PATH` overrides it on a machine where it lives
 * somewhere else.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean)

export async function launch() {
  const executablePath = CANDIDATES.find((p) => fs.existsSync(p))
  return chromium.launch(executablePath ? { executablePath } : {})
}
