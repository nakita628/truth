import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, parseSchemaFile, schemaToArktype } from 'schema-truth'
import type { GenerateOptions } from 'schema-truth'
import { describe, expect, it } from 'vite-plus/test'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']
const READONLY_FIXTURES = ['readonly']
/** Fixtures generated as an OpenAPI parameter, with the options its Parameter Object implies. */
const PARAM_FIXTURES: { readonly [name: string]: GenerateOptions } = {
  'wire-query': { paramIn: 'query' },
  'param-form-no-explode': { paramIn: 'query', explode: false },
  'param-deep-object': { paramIn: 'query', style: 'deepObject' },
  'param-json-content': { paramIn: 'query', contentType: 'application/json' },
  'param-header-array': { paramIn: 'header' },
}

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      d.name !== 'src' &&
      d.name !== 'node_modules' &&
      !SPLIT_FIXTURES.includes(d.name) &&
      !READONLY_FIXTURES.includes(d.name),
  )
  .map((d) => d.name)

describe('schemaToArktype fixtures', () => {
  it.each(fixtures)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    expect(await Effect.runPromise(fmt(schemaToArktype(input, PARAM_FIXTURES[name])))).toBe(expected)
  })
})

describe('schemaToArktype readonly fixtures', () => {
  it.each(READONLY_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    expect(await Effect.runPromise(fmt(schemaToArktype(input, { readonly: true })))).toBe(expected)
  })
})

describe('schemaToArktype split fixtures (parseSchemaFile + schemaToArktype)', () => {
  it.each(SPLIT_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const inputPath = join(dir, 'input.json')
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    const schema = await Effect.runPromise(parseSchemaFile(inputPath))
    expect(await Effect.runPromise(fmt(schemaToArktype(schema)))).toBe(expected)
  })
})
