import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, schemaToYup } from 'schema-truth'

const fixturesDir = join(import.meta.dirname, '..')

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'src' && d.name !== 'node_modules')
  .map((d) => d.name)

for (const name of fixtures) {
  const dir = join(fixturesDir, name)
  const inputPath = join(dir, 'input.json')
  const outputPath = join(dir, 'output.ts')

  const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
  const raw = schemaToYup(input)

  writeFileSync(outputPath, await Effect.runPromise(fmt(raw)))

  console.log(`generated: ${name}/output.ts`)
}
