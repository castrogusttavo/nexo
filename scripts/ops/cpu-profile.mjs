// Samples the CPU of the Node process that has its inspector open on
// 127.0.0.1:9229 and prints where the time went. Runs *inside* the app
// container (copied there by the server-ops `host-bench` mode), so it needs
// nothing but Node's own WebSocket and fetch.
//
//   node cpu-profile.mjs [seconds] [out.cpuprofile]
const seconds = Number(process.argv[2] || 45)
const out = process.argv[3] || '/tmp/app.cpuprofile'

// Loopback-only CDP inspector inside the container, never leaves the host.
// nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
const targets = await (await fetch('http://127.0.0.1:9229/json')).json()
const ws = new WebSocket(targets[0].webSocketDebuggerUrl)
let nextId = 0
const waiting = new Map()
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId
    waiting.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params }))
  })
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  waiting.get(message.id)?.(message.result)
}
await new Promise((resolve) => {
  ws.onopen = resolve
})

await send('Profiler.enable')
await send('Profiler.setSamplingInterval', { interval: 1000 })
await send('Profiler.start')
await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
const { profile } = await send('Profiler.stop')
ws.close()

const { writeFileSync } = await import('node:fs')
writeFileSync(out, JSON.stringify(profile))

const nodes = new Map(profile.nodes.map((n) => [n.id, n]))
const selfMicros = new Map()
profile.samples.forEach((id, i) => {
  selfMicros.set(id, (selfMicros.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0))
})

const byFunction = new Map()
const byFile = new Map()
let busy = 0
let total = 0
for (const [id, micros] of selfMicros) {
  const { callFrame } = nodes.get(id)
  total += micros
  if (callFrame.functionName === '(idle)') continue
  busy += micros
  const file = callFrame.url
    .replace(/^file:\/\//, '')
    .replace(/^.*\/node_modules\/\.pnpm\//, 'pkg:')
    .replace(/^\/app\//, '')
  const fn = `${callFrame.functionName || '(anonymous)'} ${file || '(native)'}:${callFrame.lineNumber + 1}`
  byFunction.set(fn, (byFunction.get(fn) ?? 0) + micros)
  const key = file || callFrame.functionName || '(native)'
  byFile.set(key, (byFile.get(key) ?? 0) + micros)
}

const pct = (micros) => `${((100 * micros) / busy).toFixed(1).padStart(5)}%`
const ms = (micros) => `${Math.round(micros / 1000)}ms`.padStart(8)
const top = (map, n) => [...map].sort((a, b) => b[1] - a[1]).slice(0, n)

console.log(
  `profile: ${seconds}s wall, ${ms(total)} sampled, ${ms(busy)} busy (${((100 * busy) / total).toFixed(1)}% of the time the loop was not idle)`,
)
console.log('\n== where the busy time goes, by file (self time)')
for (const [name, micros] of top(byFile, 30)) {
  console.log(`${pct(micros)} ${ms(micros)}  ${name.slice(0, 140)}`)
}
console.log('\n== top functions (self time)')
for (const [name, micros] of top(byFunction, 40)) {
  console.log(`${pct(micros)} ${ms(micros)}  ${name.slice(0, 160)}`)
}
