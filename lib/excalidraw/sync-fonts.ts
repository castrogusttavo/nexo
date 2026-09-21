import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

// Build-time helper (called from next.config.ts, never shipped to a bundle).
//
// Copies node_modules/@excalidraw/excalidraw/dist/prod/fonts into public/ so
// the fonts are served from this origin. The copy is keyed on the installed
// package version: a bump of @excalidraw/excalidraw re-copies on the next
// `next dev`/`next build`, so the served set cannot drift from the code that
// requests it (font file names carry content hashes that change between
// releases). The output is gitignored — the package is the source of truth.

const STAMP_FILE = '.excalidraw-version'

export type SyncResult = 'copied' | 'up-to-date'

export interface SyncExcalidrawFontsOptions {
  /** The installed package's root (the directory holding its package.json). */
  packageDir: string
  /** Directory that will contain `fonts/`, e.g. `<repo>/public/static/excalidraw`. */
  targetDir: string
}

function readVersion(packageDir: string): string {
  const pkg = JSON.parse(
    readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
  ) as { name: string; version: string }
  return `${pkg.name}@${pkg.version}`
}

function readStamp(targetDir: string): string | null {
  const stamp = path.join(targetDir, STAMP_FILE)
  return existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : null
}

export function syncExcalidrawFonts({
  packageDir,
  targetDir: rawTargetDir,
}: SyncExcalidrawFontsOptions): SyncResult {
  // Drop any trailing slash, or the staging dir below would land inside it.
  const targetDir = path.resolve(rawTargetDir)
  const version = readVersion(packageDir)
  if (readStamp(targetDir) === version) return 'up-to-date'

  const source = path.join(packageDir, 'dist', 'prod', 'fonts')
  if (!existsSync(source)) {
    throw new Error(
      `excalidraw fonts not found at ${source}: did the package layout change in ${version}?`,
    )
  }

  // Copy into a sibling temp dir and swap it in, so a concurrent reader (next
  // build loads its config in more than one process) never sees a half-copied
  // tree, and a stale font from the previous version never survives.
  const staging = `${targetDir}.tmp-${process.pid}`
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  cpSync(source, path.join(staging, 'fonts'), { recursive: true })
  writeFileSync(path.join(staging, STAMP_FILE), `${version}\n`)

  rmSync(targetDir, { recursive: true, force: true })
  try {
    renameSync(staging, targetDir)
  } catch (error) {
    // Another process swapped its own copy in first; keep it if it is current.
    rmSync(staging, { recursive: true, force: true })
    if (readStamp(targetDir) !== version) throw error
  }
  return 'copied'
}
