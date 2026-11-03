import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, parseSchemaFile, schemaToTypebox } from 'schema-truth'
import { describe, expect, it } from 'vite-plus/test'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']
const READONLY_FIXTURES = ['readonly']
const REF_FIXTURES: { readonly [name: string]: string } = {
  ref: 'Pet',
  'ref-cyclic': 'Node',
  'ref-codec': 'Name',
}

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      d.name !== 'src' &&
      d.name !== 'node_modules' &&
      !SPLIT_FIXTURES.includes(d.name) &&
      !READONLY_FIXTURES.includes(d.name) &&
      !(d.name in REF_FIXTURES),
  )
  .map((d) => d.name)

describe('schemaToTypebox fixtures', () => {
  it.each(fixtures)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    expect(await Effect.runPromise(fmt(schemaToTypebox(input)))).toBe(expected)
  })
})

describe('schemaToTypebox readonly fixtures', () => {
  it.each(READONLY_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    expect(await Effect.runPromise(fmt(schemaToTypebox(input, { readonly: true })))).toBe(expected)
  })
})

describe('schemaToTypebox ref fixtures', () => {
  it.each(Object.keys(REF_FIXTURES))('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    expect(await Effect.runPromise(fmt(schemaToTypebox(input, { ref: REF_FIXTURES[name] })))).toBe(
      expected,
    )
  })
})

describe('schemaToTypebox split fixtures (parseSchemaFile + schemaToTypebox)', () => {
  it.each(SPLIT_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const inputPath = join(dir, 'input.json')
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    const schema = await Effect.runPromise(parseSchemaFile(inputPath))
    expect(await Effect.runPromise(fmt(schemaToTypebox(schema)))).toBe(expected)
  })
})
