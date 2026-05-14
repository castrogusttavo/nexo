const { spawn } = require("node:child_process")
const readline = require("node:readline")

const banner = `
\x1b[36m
  ███╗   ██╗███████╗██╗  ██╗ ██████╗
  ████╗  ██║██╔════╝╚██╗██╔╝██╔═══██╗
  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║
  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║
  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝
  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝
\x1b[0m
`

const options = [
  {
    label: "Full Stack",
    hint: "(Docker + Prisma + Next.js)",
    commands: [
      { cmd: "pnpm", args: ["docker:start"] },
      { cmd: "pnpm", args: ["prisma:migrate:dev"] },
      { cmd: "pnpm", args: ["prisma:studio"], background: true },
      { cmd: "node", args: ["scripts/fix-imports.mjs", "--watch"], background: true },
      { cmd: "pnpm", args: ["exec", "next", "dev", "--turbopack"] },
    ],
  },
  {
    label: "Backend",
    hint: "(Docker + Prisma)",
    commands: [
      { cmd: "pnpm", args: ["docker:start"] },
      { cmd: "pnpm", args: ["prisma:migrate:dev"] },
    ],
  },
  {
    label: "Frontend",
    hint: "(Next.js)",
    commands: [
      { cmd: "node", args: ["scripts/fix-imports.mjs", "--watch"], background: true },
      { cmd: "pnpm", args: ["exec", "next", "dev", "--turbopack"] },
    ],
  },
]

let selected = 0

function render() {
  // Move cursor up to overwrite previous menu (3 options + question line + blank line)
  const lines = options.length + 2
  process.stdout.write(`\x1b[${lines}A\x1b[J`)
  drawMenu()
}

function drawMenu() {
  console.log(`\x1b[1m  What do you want to run?\x1b[0m\n`)
  for (let i = 0; i < options.length; i++) {
    const { label, hint } = options[i]
    if (i === selected) {
      console.log(`  \x1b[36m❯ ${label}\x1b[0m  \x1b[90m${hint}\x1b[0m`)
    } else {
      console.log(`    \x1b[90m${label}  ${hint}\x1b[0m`)
    }
  }
}

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

function withSpinner(label, fn) {
  let frame = 0
  const interval = setInterval(() => {
    const spinner = spinnerFrames[frame % spinnerFrames.length]
    process.stdout.write(`\r\x1b[K  \x1b[36m${spinner}\x1b[0m \x1b[90m${label}\x1b[0m`)
    frame++
  }, 80)

  return fn().then(
    (result) => {
      clearInterval(interval)
      process.stdout.write(`\r\x1b[K  \x1b[32m✔\x1b[0m \x1b[90m${label}\x1b[0m\n`)
      return result
    },
    (error) => {
      clearInterval(interval)
      process.stdout.write(`\r\x1b[K  \x1b[31m✖\x1b[0m \x1b[90m${label}\x1b[0m\n`)
      throw error
    },
  )
}

function runSilent(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "ignore",
      windowsHide: true,
    })
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`Exit code ${code}`))
      else resolve()
    })
  })
}

const backgroundChildren = []

function cleanup() {
  for (const child of backgroundChildren) {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], {
        stdio: "ignore",
        windowsHide: true,
      })
    } catch {}
  }
}

function stopDockerAndExit(code = 0) {
  console.log("\n\x1b[90m  Stopping Docker containers...\x1b[0m")
  const stop = spawn("pnpm", ["docker:stop"], {
    stdio: "inherit",
    windowsHide: true,
  })
  stop.on("close", () => process.exit(code))
  stop.on("error", () => process.exit(code))
}

process.on("exit", cleanup)
process.on("SIGINT", () => stopDockerAndExit(0))
process.on("SIGTERM", () => stopDockerAndExit(0))

function runCommands(entry) {
  const { commands } = entry

  const sequential = commands.filter((c) => !c.background)
  const background = commands.filter((c) => c.background)

  for (const { cmd, args } of background) {
    const child = spawn(cmd, args, {
      stdio: "ignore",
      windowsHide: true,
    })
    backgroundChildren.push(child)
  }

  let chain = Promise.resolve()

  for (let i = 0; i < sequential.length; i++) {
    const { cmd, args } = sequential[i]
    const label = `${cmd} ${args.join(" ")}`
    const isLast = i === sequential.length - 1

    chain = chain.then(() => {
      if (isLast) {
        console.log(`  \x1b[32m▸\x1b[0m \x1b[90m${label}\x1b[0m\n`)
        const child = spawn(cmd, args, {
          stdio: "inherit",
          windowsHide: true,
        })
        child.on("close", (code) => process.exit(code ?? 0))
        return
      }
      return withSpinner(label, () => runSilent(cmd, args))
    })
  }

  chain.catch((error) => {
    console.error(`\n\x1b[31m  ${error.message}\x1b[0m`)
    process.exit(1)
  })
}

function start() {
  console.log(banner)
  drawMenu()

  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }

  process.stdin.on("keypress", (_, key) => {
    if (!key) return

    if (key.name === "up" || key.name === "k") {
      selected = (selected - 1 + options.length) % options.length
      render()
    } else if (key.name === "down" || key.name === "j") {
      selected = (selected + 1) % options.length
      render()
    } else if (key.name === "return") {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }
      process.stdin.removeAllListeners("keypress")

      const entry = options[selected]
      console.log(`\n\x1b[32m  ✔ ${entry.label}\x1b[0m\n`)
      console.log(`\x1b[90m  ─────────────────────────────────────\x1b[0m\n`)

      runCommands(entry)
    } else if (key.name === "c" && key.ctrl) {
      console.log("\n")
      process.exit(0)
    }
  })
}

start()
