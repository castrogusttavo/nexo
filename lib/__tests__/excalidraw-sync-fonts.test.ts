import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { syncExcalidrawFonts } from '../excalidraw/sync-fonts'

let root: string
let packageDir: string
let targetDir: string

function fakePackage(version: string, files: Record<string, string>) {
  rmSync(packageDir, { recursive: true, force: true })
  mkdirSync(packageDir, { recursive: true })
  writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ name: '@excalidraw/excalidraw', version }),
  )
  for (const [file, content] of Object.entries(files)) {
    const full = path.join(packageDir, 'dist', 'prod', 'fonts', file)
    mkdirSync(path.dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'excalidraw-fonts-'))
  packageDir = path.join(root, 'pkg')
  targetDir = path.join(root, 'public', 'static', 'excalidraw')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('syncExcalidrawFonts', () => {
  it('copies the fonts under fonts/ on the first run', () => {
    fakePackage('0.18.1', { 'Virgil/Virgil-Regular.woff2': 'v1' })

    expect(syncExcalidrawFonts({ packageDir, targetDir })).toBe('copied')
    expect(
      readFileSync(path.join(targetDir, 'fonts/Virgil/Virgil-Regular.woff2'), 'utf8'),
    ).toBe('v1')
  })

  it('does nothing while the installed version is unchanged', () => {
    fakePackage('0.18.1', { 'Virgil/Virgil-Regular.woff2': 'v1' })
    syncExcalidrawFonts({ packageDir, targetDir })

    expect(syncExcalidrawFonts({ packageDir, targetDir })).toBe('up-to-date')
  })

  it('replaces the whole set when the package version changes', () => {
    fakePackage('0.18.1', { 'Excalifont/Excalifont-Regular-aaa.woff2': 'old' })
    syncExcalidrawFonts({ packageDir, targetDir })

    fakePackage('0.19.0', { 'Excalifont/Excalifont-Regular-bbb.woff2': 'new' })
    expect(syncExcalidrawFonts({ packageDir, targetDir })).toBe('copied')

    expect(existsSync(path.join(targetDir, 'fonts/Excalifont/Excalifont-Regular-aaa.woff2'))).toBe(false)
    expect(
      readFileSync(path.join(targetDir, 'fonts/Excalifont/Excalifont-Regular-bbb.woff2'), 'utf8'),
    ).toBe('new')
  })

  it('accepts a target with a trailing slash', () => {
    fakePackage('0.18.1', { 'Virgil/Virgil-Regular.woff2': 'v1' })

    expect(syncExcalidrawFonts({ packageDir, targetDir: `${targetDir}/` })).toBe('copied')
    expect(existsSync(path.join(targetDir, 'fonts/Virgil/Virgil-Regular.woff2'))).toBe(true)
  })

  it('fails loudly when the package no longer ships dist/prod/fonts', () => {
    fakePackage('1.0.0', {})

    expect(() => syncExcalidrawFonts({ packageDir, targetDir })).toThrow(
      /excalidraw fonts not found/,
    )
  })
})
