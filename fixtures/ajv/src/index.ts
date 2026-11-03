import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, schemaToAjv } from 'schema-truth'

const fixturesDir = join(import.meta.dirname, '..')

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'src' && d.name !== 'node_modules')
  .map((d) => d.name)

for (const name of fixtures) {
  const dir = join(fixturesDir, name)
  const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
  writeFileSync(join(dir, 'output.ts'), await Effect.runPromise(fmt(schemaToAjv(input))))

  console.log(`generated: ${name}/output.ts`)
}
