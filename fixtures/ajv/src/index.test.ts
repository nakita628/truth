import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, schemaToAjv } from 'schema-truth'
import { describe, expect, it } from 'vite-plus/test'

const fixturesDir = join(import.meta.dirname, '..')

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'src' && d.name !== 'node_modules')
  .map((d) => d.name)

describe('schemaToAjv fixtures', () => {
  it.each(fixtures)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    expect(await Effect.runPromise(fmt(schemaToAjv(input)))).toBe(expected)
  })
})
