#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const PROJECT_ROOT = process.cwd()
const TSCONFIG_PATH = resolve(PROJECT_ROOT, 'tsconfig.json')

const FORMAT_OPTIONS = {
    indentSize: 2,
    tabSize: 2,
    convertTabsToSpaces: true,
    newLineCharacter: '\n',
    insertSpaceAfterCommaDelimiter: true,
    insertSpaceAfterKeywordsInControlFlowStatements: true,
    insertSpaceBeforeAndAfterBinaryOperators: true,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
}

const PREFERENCES = {
    importModuleSpecifierPreference: 'shortest',
    importModuleSpecifierEnding: 'minimal',
    quotePreference: 'single',
    includeCompletionsForModuleExports: true,
}

let serviceState = null

function buildService() {
    const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile)
    if (configFile.error) {
        const msg = ts.flattenDiagnosticMessageText(
            configFile.error.messageText,
            '\n',
        )
        throw new Error(`failed to read tsconfig: ${msg}`)
    }
    const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        PROJECT_ROOT,
    )

    const projectFiles = new Set(parsed.fileNames.map((f) => resolve(f)))
    const fileVersions = new Map()

    const host = {
        getScriptFileNames: () => Array.from(projectFiles),
        getScriptVersion: (fileName) =>
            String(fileVersions.get(resolve(fileName)) ?? 0),
        getScriptSnapshot: (fileName) => {
            if (!existsSync(fileName)) return undefined
            try {
                return ts.ScriptSnapshot.fromString(readFileSync(fileName, 'utf8'))
            } catch {
                return undefined
            }
        },
        getCurrentDirectory: () => PROJECT_ROOT,
        getCompilationSettings: () => parsed.options,
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
    }

    const service = ts.createLanguageService(host, ts.createDocumentRegistry())
    return { service, projectFiles, fileVersions }
}

function getService() {
    if (!serviceState) serviceState = buildService()
    return serviceState
}

function bumpVersion(absPath) {
    const { projectFiles, fileVersions } = getService()
    const v = fileVersions.get(absPath) ?? 0
    fileVersions.set(absPath, v + 1)
    if (!projectFiles.has(absPath)) projectFiles.add(absPath)
}

export function markFileDirty(filePath) {
    bumpVersion(resolve(filePath))
}

function applyFileChanges(absPath, changes) {
    if (!changes?.length) return 0
    const fileChanges = changes.find((c) => resolve(c.fileName) === absPath)
    if (!fileChanges?.textChanges?.length) return 0

    let source = readFileSync(absPath, 'utf8')
    const sorted = [...fileChanges.textChanges].sort(
        (a, b) => b.span.start - a.span.start,
    )
    for (const ch of sorted) {
        source =
            source.slice(0, ch.span.start) +
            ch.newText +
            source.slice(ch.span.start + ch.span.length)
    }
    writeFileSync(absPath, source, 'utf8')
    return fileChanges.textChanges.length
}

export function fixImports(filePath) {
    const absPath = resolve(filePath)
    if (!existsSync(absPath)) return { changed: false, reason: 'missing' }
    if (!/\.(ts|tsx|mts|cts)$/.test(absPath)) {
        return { changed: false, reason: 'skip' }
    }

    bumpVersion(absPath)
    const { service } = getService()
    let totalCount = 0

    try {
        const combined = service.getCombinedCodeFix(
            { type: 'file', fileName: absPath },
            'fixMissingImport',
            FORMAT_OPTIONS,
            PREFERENCES,
        )
        const applied = applyFileChanges(absPath, combined?.changes)
        if (applied > 0) {
            totalCount += applied
            bumpVersion(absPath)
        }
    } catch (e) {
        return { changed: false, reason: 'error', error: e?.message ?? String(e) }
    }

    try {
        const removeChanges = service.organizeImports(
            {
                type: 'file',
                fileName: absPath,
                mode: ts.OrganizeImportsMode.RemoveUnused,
            },
            FORMAT_OPTIONS,
            PREFERENCES,
        )
        const applied = applyFileChanges(absPath, removeChanges)
        if (applied > 0) {
            totalCount += applied
            bumpVersion(absPath)
        }
    } catch (e) {
        /* ignore — file may be mid-edit; missing-import pass already ran */
    }

    return totalCount > 0
        ? { changed: true, count: totalCount }
        : { changed: false, reason: 'no-fix' }
}

async function runWatch({ verbose = false } = {}) {
    const { watch } = await import('chokidar')

    const SOURCE_EXT = /\.(ts|tsx|mts|cts)$/
    const SKIP_DIR =
        /(^|[\/\\])(\.git|\.next|\.turbo|node_modules|dist|coverage|build|out)([\/\\]|$)/

    const SELF_WRITE_GUARD_MS = 800
    const DEBOUNCE_MS = 50

    const guarded = new Map()
    const debounce = new Map()

    const watcher = watch(PROJECT_ROOT, {
        ignored: (path, stats) => {
            if (SKIP_DIR.test(path)) return true
            if (stats?.isFile()) return !SOURCE_EXT.test(path)
            return false
        },
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    })

    function rel(abs) {
        return abs.startsWith(PROJECT_ROOT)
            ? abs.slice(PROJECT_ROOT.length + 1)
            : abs
    }

    function handleSave(abs, eventName) {
        markFileDirty(abs)

        const guardTs = guarded.get(abs)
        if (guardTs && Date.now() - guardTs < SELF_WRITE_GUARD_MS) {
            if (verbose) console.log(`[fix-imports] ${eventName} ${rel(abs)} (guarded, skip)`)
            return
        }
        if (guardTs) guarded.delete(abs)

        const existing = debounce.get(abs)
        if (existing) clearTimeout(existing)
        debounce.set(
            abs,
            setTimeout(() => {
                debounce.delete(abs)
                const result = fixImports(abs)
                if (result.changed) {
                    guarded.set(abs, Date.now())
                    console.log(`[fix-imports] ${rel(abs)} (+${result.count})`)
                } else if (result.reason === 'error') {
                    console.error(`[fix-imports] ${rel(abs)}: ${result.error}`)
                } else if (verbose) {
                    console.log(`[fix-imports] ${rel(abs)} (${result.reason})`)
                }
            }, DEBOUNCE_MS),
        )
    }

    watcher.on('change', (path) => {
        if (verbose) console.log(`[fix-imports] event=change ${rel(path)}`)
        handleSave(path, 'change')
    })

    watcher.on('add', (path) => {
        if (verbose) console.log(`[fix-imports] event=add ${rel(path)}`)
        handleSave(path, 'add')
    })

    watcher.on('unlink', (path) => {
        if (verbose) console.log(`[fix-imports] event=unlink ${rel(path)}`)
        const { projectFiles } = getService()
        projectFiles.delete(path)
    })

    watcher.on('error', (err) => {
        console.error('[fix-imports] watcher error:', err?.message ?? err)
    })

    await new Promise((res) => watcher.on('ready', res))
    const watched = watcher.getWatched()
    const fileCount = Object.values(watched).reduce((n, l) => n + l.length, 0)
    console.log(
        `[fix-imports] watching ${fileCount} files under ${PROJECT_ROOT}${verbose ? ' (verbose)' : ''}`,
    )
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
    const args = process.argv.slice(2)
    const verbose = args.includes('--verbose') || args.includes('-v')
    const watchMode = args.includes('--watch') || args.includes('-w')
    const arg = args.find((a) => !a.startsWith('-'))

    if (watchMode) {
        runWatch({ verbose }).catch((e) => {
            console.error('[fix-imports] fatal:', e)
            process.exit(1)
        })
    } else if (arg) {
        const result = fixImports(arg)
        if (result.changed) {
            console.log(`[fix-imports] ${arg} (+${result.count})`)
        } else if (result.reason === 'error') {
            console.error(`[fix-imports] ${arg}: ${result.error}`)
            process.exit(1)
        } else {
            console.log(`[fix-imports] ${arg} (no changes)`)
        }
    } else {
        console.error(
            'Usage:\n  node scripts/fix-imports.mjs <file>\n  node scripts/fix-imports.mjs --watch',
        )
        process.exit(1)
    }
}
