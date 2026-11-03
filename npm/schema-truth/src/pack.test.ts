import fs from 'node:fs'
import path from 'node:path'

import * as NodeServices from '@effect/platform-node/NodeServices'
import { Effect } from 'effect'
import { ChildProcess } from 'effect/process'
import { ChildProcessSpawner } from 'effect/process/ChildProcessSpawner'
import { describe, expect, it } from 'vite-plus/test'

import { readFile } from './file/index.js'
import { parseJson } from './json/index.js'

const packageDir = path.join(import.meta.dirname, '..')

type PackageScripts = {
  readonly prepack?: string
  readonly postpack?: string
}

function isRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null
}

function scriptsOf(value: unknown): PackageScripts | null {
  if (!isRecord(value) || !isRecord(value.scripts)) return null
  return value.scripts
}

function packedFilesOf(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value[0] === undefined || !isRecord(value[0])) {
    return []
  }
  const files = value[0].files
  if (!Array.isArray(files)) return []
  return files.flatMap((file: unknown) => {
    if (!isRecord(file) || typeof file.path !== 'string') return []
    return [file.path]
  })
}

function inspectPackage() {
  return Effect.gen(function* () {
    const raw = yield* readFile(path.join(packageDir, 'package.json'))
    if (raw === null) return yield* Effect.fail(new Error('package.json is missing'))
    const manifest = yield* parseJson(raw)
    const scripts = scriptsOf(manifest)
    if (scripts === null) {
      return yield* Effect.fail(new Error('package.json is missing a scripts object'))
    }
    const spawner = yield* ChildProcessSpawner
    const listing = yield* spawner.string(
      ChildProcess.make('npm', ['pack', '--dry-run', '--json'], { cwd: packageDir }),
    )
    const packed = yield* parseJson(listing)
    return {
      scripts,
      packedFiles: packedFilesOf(packed),
    }
  })
}

describe('package pack', () => {
  it('ships the package README without copying it from the repo root', async () => {
    const readme = path.join(packageDir, 'README.md')
    expect(fs.lstatSync(readme).isSymbolicLink()).toBe(false)
    expect(fs.statSync(readme).isFile()).toBe(true)
    const packed = await Effect.runPromise(
      inspectPackage().pipe(Effect.provide(NodeServices.layer)),
    )
    expect(packed.scripts.prepack).toBeUndefined()
    expect(packed.scripts.postpack).toBeUndefined()
    expect(packed.packedFiles.includes('README.md')).toBe(true)
  })
})
