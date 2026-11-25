import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, parseSchemaFile, schemaToTypebox } from 'schema-truth'
import type { TypeboxGenerateOptions } from 'schema-truth'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']
const READONLY_FIXTURES = ['readonly']
const REF_FIXTURES: { readonly [name: string]: string } = {
  ref: 'Pet',
  'ref-cyclic': 'Node',
  'ref-codec': 'Name',
}
/** Fixtures generated as an OpenAPI parameter, with the options its Parameter Object implies. */
const PARAM_FIXTURES: { readonly [name: string]: TypeboxGenerateOptions } = {
  'wire-boolean': { paramIn: 'query' },
  'wire-number': { paramIn: 'query' },
}

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'src' && d.name !== 'node_modules')
  .map((d) => d.name)

for (const name of fixtures) {
  const dir = join(fixturesDir, name)
  const inputPath = join(dir, 'input.json')
  const outputPath = join(dir, 'output.ts')

  let raw: string
  if (SPLIT_FIXTURES.includes(name)) {
    raw = schemaToTypebox(await Effect.runPromise(parseSchemaFile(inputPath)))
  } else if (READONLY_FIXTURES.includes(name)) {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
    raw = schemaToTypebox(input, { readonly: true })
  } else if (name in REF_FIXTURES) {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
    raw = schemaToTypebox(input, { ref: REF_FIXTURES[name] })
  } else {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
    raw = schemaToTypebox(input, PARAM_FIXTURES[name])
  }

  writeFileSync(outputPath, await Effect.runPromise(fmt(raw)))

  console.log(`generated: ${name}/output.ts`)
}
