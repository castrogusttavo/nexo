// Runs `next dev` / `next start` and swaps Next's startup banner for the Nexo
// logo and the address the app answers on. Only the banner lines are dropped:
// warnings, compile output and errors pass through untouched.
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { stripVTControlCharacters, styleText } from 'node:util'

const LOGO = `
          -+#################++-
          .#####################
         -+#####################
         -+#####################
          -+####################
.++++++++.  ---------+##########
#########+.          .+#########
#########+.          .+#########
#########+.          .+#########
#########+.          -+#########
##########+---------- .++++++++.
####################+.
#####################+-
#####################+-
#####################+-
.++#################+-`

const MODE_LABEL = { dev: 'dev mode', start: 'prod mode' }

// What Next prints between boot and "Ready" (app-info-log.js, start-server.js)
const BOOT_LINE =
  /^(▲ Next\.js|- (Local|Network|Debugger port|Environments|Cache Components|Partial Prefetching|Experiments)|\s+[✓⨯·?] \S|✓ Starting\.\.\.|✓ Running next\.config|✓ Ready in|\s*$)/

const [mode, ...args] = process.argv.slice(2)
if (!(mode in MODE_LABEL)) {
  console.error('usage: next-banner.mjs <dev|start> [next args]')
  process.exit(1)
}

const child = spawn('next', [mode, ...args], {
  stdio: ['inherit', 'pipe', 'inherit'],
  // Next drops its colours once stdout is a pipe
  env: { ...process.env, ...(process.stdout.isTTY && { FORCE_COLOR: '1' }) },
})

const urls = {}
let booting = true
let ready = false

function printBanner() {
  const host = (url) => url.replace(/^https?:\/\//, '')
  const lines = [
    styleText('cyan', LOGO),
    '',
    `  ${styleText('bold', MODE_LABEL[mode])}`,
    `  app on: ${host(urls.local ?? 'localhost:3000')}`,
  ]
  if (urls.network) lines.push(`  network: ${host(urls.network)}`)
  process.stdout.write(`${lines.join('\n')}\n\n`)
}

createInterface({ input: child.stdout }).on('line', (line) => {
  if (!booting) return process.stdout.write(`${line}\n`)

  const plain = stripVTControlCharacters(line).trimEnd()
  const url = plain.match(/^- (Local|Network):\s+(\S+)/)
  if (url) urls[url[1].toLowerCase()] = url[2]

  if (BOOT_LINE.test(plain)) {
    if (!ready && plain.startsWith('✓ Ready in')) {
      ready = true
      printBanner()
    }
    return
  }

  // First real line: the boot is over, from here on everything is Next's
  if (!ready) printBanner()
  booting = false
  process.stdout.write(`${line}\n`)
})

// Ctrl+C already reaches Next through the process group; stay alive until it
// has shut down so its exit code is the one pnpm sees
process.on('SIGINT', () => {})
process.on('SIGTERM', () => child.kill('SIGTERM'))
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
