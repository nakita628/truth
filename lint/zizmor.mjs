#!/usr/bin/env node
// Audits every workflow under .github with zizmor, at the version CI runs, so `pnpm lint` fails
// locally on exactly what fails in CI. zizmor is a Rust tool published on PyPI with no npm build,
// so it runs through uvx, or pipx where uv is absent (the GitHub runners have pipx). Neither
// installed is a failure, not a skip: a check that passes because it did not run is how a
// workflow finding reaches a pull request.
//
// With GH_TOKEN set (CI passes the job's read-only token) zizmor also runs its online audits,
// which look up known-vulnerable and impostor action commits; without one it runs offline.
import { spawnSync } from 'node:child_process'

// Tracked by Renovate (the customManagers entry in renovate.json reads this line).
const ZIZMOR_VERSION = '1.32.0'

const ARGS = ['--persona', 'pedantic', '.']

const RUNNERS = [
  ['uvx', [`zizmor==${ZIZMOR_VERSION}`, ...ARGS]],
  ['pipx', ['run', `zizmor==${ZIZMOR_VERSION}`, ...ARGS]],
]

function isInstalled(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0
}

const runner = RUNNERS.find(([command]) => isInstalled(command))
if (runner === undefined) {
  console.error(
    `zizmor: neither uvx nor pipx is installed. Install uv (https://docs.astral.sh/uv/) and run \`pnpm lint\` again; zizmor ${ZIZMOR_VERSION} is fetched on first use.`,
  )
  process.exit(1)
}

const [command, args] = runner
const result = spawnSync(command, args, { stdio: 'inherit' })
process.exit(result.status ?? 1)
