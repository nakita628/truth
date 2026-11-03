import { execFile } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const appRoot = join(here, '..')
const monorepoRoot = join(appRoot, '..', '..')
const cliDir = join(monorepoRoot, 'packages', 'schema-truth', 'dist', 'cli')

type Generator = {
  readonly name: 'zod' | 'valibot' | 'effect' | 'typebox' | 'arktype'
  readonly cli: string
}

const generators: readonly Generator[] = [
  { name: 'zod', cli: join(cliDir, 'zod.js') },
  { name: 'valibot', cli: join(cliDir, 'valibot.js') },
  { name: 'effect', cli: join(cliDir, 'effect.js') },
  { name: 'typebox', cli: join(cliDir, 'typebox.js') },
  { name: 'arktype', cli: join(cliDir, 'arktype.js') },
]

const SKIP_FIXTURES = new Set<string>(['complex-references.json'])

async function fixtureFiles(): Promise<readonly string[]> {
  const dir = join(appRoot, 'schema')
  const dirents = await readdir(dir, { withFileTypes: true })
  return dirents
    .map((d) => d.name)
    .filter(
      (n) => /\.(yaml|json|tsp)$/.test(n) && !n.endsWith('.examples.json') && !SKIP_FIXTURES.has(n),
    )
}

async function generate(
  gen: Generator,
  file: string,
): Promise<{ readonly file: string; readonly gen: Generator['name'] }> {
  const filename = file.replace(/\.(yaml|json|tsp)$/, '')
  const output = join(appRoot, 'generated', gen.name, `${filename}.ts`)
  const { stderr } = await execFileAsync('node', [gen.cli, `schema/${file}`, '-o', output], {
    cwd: appRoot,
  })
  if (stderr && stderr.trim().length > 0) {
    process.stderr.write(`[${gen.name}] ${file}: ${stderr}`)
  }
  return { file, gen: gen.name }
}

export async function schemaToLibrary(): Promise<void> {
  const files = await fixtureFiles()
  await Promise.all(
    generators.map(async (gen) => {
      const outDir = join(appRoot, 'generated', gen.name)
      await rm(outDir, { recursive: true, force: true })
      await mkdir(outDir, { recursive: true })
    }),
  )
  const tasks = generators.flatMap((gen) => files.map((file) => generate(gen, file)))
  const results = await Promise.allSettled(tasks)
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (rejected.length > 0) {
    for (const r of rejected) {
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason)
      process.stderr.write(`[FAIL] ${reason}\n`)
    }
    process.stderr.write(`${rejected.length}/${tasks.length} generations failed\n`)
    process.exit(1)
  }
  process.stdout.write(`Generated ${tasks.length} files across ${generators.length} libraries\n`)
}

await schemaToLibrary()
