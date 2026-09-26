// Prints the path of the esbuild binary that react-email resolves.
//
// The email preview needs ESBUILD_BINARY_PATH because two esbuild versions are
// installed on purpose: the repository overrides esbuild to >=0.28.1, while
// react-email's preview only works on 0.28.0 (see `trustPolicyExclude` in
// pnpm-workspace.yaml). Without the variable, the preview picks the wrong one.
//
// This used to be a literal path in package.json — `@esbuild+linux-x64@0.28.0`,
// pinned to one version and one platform, so it broke on the next bump and had
// never worked on macOS or ARM. Resolving it instead asks the same question the
// runtime would: which esbuild does react-email see, and which binary does that
// copy ship for this machine.

import { createRequire } from 'node:module'
import { dirname } from 'node:path'

const require = createRequire(import.meta.url)

function fail(message) {
  process.stderr.write(`resolve-esbuild-binary: ${message}\n`)
  process.exit(1)
}

let esbuildDir
try {
  // Its package.json is not exported, so resolve the entry point and start
  // the search from the directory that holds it.
  const reactEmail = require.resolve('react-email')
  esbuildDir = dirname(
    require.resolve('esbuild/package.json', { paths: [dirname(reactEmail)] }),
  )
} catch {
  fail('could not resolve the esbuild that react-email uses')
}

const { platform, arch } = process
const pkg = `@esbuild/${platform}-${arch}`
const binary = platform === 'win32' ? 'esbuild.exe' : 'bin/esbuild'

try {
  process.stdout.write(require.resolve(`${pkg}/${binary}`, { paths: [esbuildDir] }))
} catch {
  fail(`${pkg} is not installed next to ${esbuildDir}`)
}
