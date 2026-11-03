import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

const here = dirname(fileURLToPath(import.meta.url))
const schemaDir = resolve(here, '../schema')
const zodDir = resolve(here, '../generated/zod')

type Fixture = {
  readonly name: string
  readonly exportName: string
}

const fixtures: readonly Fixture[] = [
  { name: 'abc', exportName: 'A' },
  { name: 'animal', exportName: 'Schema' },
  { name: 'product', exportName: 'Product' },
  { name: 'fizz-buzz', exportName: 'FizzBuzzString' },
  { name: 'if-else', exportName: 'Vehicle' },
]

async function loadExamples(name: string): Promise<{
  readonly valid: readonly unknown[]
  readonly invalid: readonly unknown[]
}> {
  const text = await readFile(resolve(schemaDir, `${name}.examples.json`), 'utf-8')
  return JSON.parse(text)
}

async function loadSchema(
  name: string,
  exportName: string,
): Promise<{
  readonly safeParse: (input: unknown) => { readonly success: boolean }
}> {
  const mod = await import(resolve(zodDir, `${name}.ts`))
  return mod[exportName]
}

describe.each(fixtures)('codegen contract / zod / $name', ({ name, exportName }) => {
  it('accepts every valid example', async () => {
    const schema = await loadSchema(name, exportName)
    const { valid } = await loadExamples(name)
    for (const example of valid) {
      expect(schema.safeParse(example).success, JSON.stringify(example)).toBe(true)
    }
  })

  it('rejects every invalid example', async () => {
    const schema = await loadSchema(name, exportName)
    const { invalid } = await loadExamples(name)
    for (const example of invalid) {
      expect(schema.safeParse(example).success, JSON.stringify(example)).toBe(false)
    }
  })
})
