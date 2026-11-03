import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import { runGenerator, runGeneratorError } from '../testing/index.js'
import type { JSONSchema } from './index.js'
import { parseSchemaFile } from './index.js'

// Under the system temporary directory, never next to the sources: the source tree is
// read-only when the suite runs under Bazel.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-truth-parser-'))

beforeAll(async () => {
  await fsp.mkdir(tmpDir, { recursive: true })
})

afterAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true })
})

describe('parseSchemaFile', () => {
  it('parses a valid JSON schema file', async () => {
    const schemaPath = path.join(tmpDir, 'test.json')
    await fsp.writeFile(
      schemaPath,
      JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } },
      }),
    )

    const schema = await runGenerator(parseSchemaFile(schemaPath))
    expect(schema.type).toBe('object')
    expect(schema.properties).toStrictEqual({ name: { type: 'string' } })
  })

  it('parses a schema with $defs', async () => {
    const schemaPath = path.join(tmpDir, 'defs.json')
    await fsp.writeFile(
      schemaPath,
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        $defs: {
          Address: {
            type: 'object',
            properties: { street: { type: 'string' } },
          },
        },
        properties: {
          address: { $ref: '#/$defs/Address' },
        },
      }),
    )

    const schema = await runGenerator(parseSchemaFile(schemaPath))
    expect(schema.$defs).toBeDefined()
  })

  it('fails for a missing file', async () => {
    const error = await runGeneratorError(parseSchemaFile('/non/existent/file.json'))
    expect(error.message.startsWith('Failed to parse schema:')).toBe(true)
  })

  it('parses even loosely valid JSON-like content', async () => {
    const schemaPath = path.join(tmpDir, 'loose.json')
    await fsp.writeFile(schemaPath, '{}')

    const schema = await runGenerator(parseSchemaFile(schemaPath))
    expect(schema).toStrictEqual({})
  })

  it('fails for invalid JSON content', async () => {
    const schemaPath = path.join(tmpDir, 'invalid.json')
    await fsp.writeFile(schemaPath, '{invalid json!!!')

    const error = await runGeneratorError(parseSchemaFile(schemaPath))
    expect(error.message.startsWith('Failed to parse schema:')).toBe(true)
  })

  it('fails with a message for a missing deep path', async () => {
    const error = await runGeneratorError(parseSchemaFile('/non/existent/path/deep/file.json'))
    expect(error.message).toContain('Failed to parse schema:')
  })
})

describe('JSONSchema type', () => {
  it('names every keyword, so a misspelled one does not compile', () => {
    // @ts-expect-error -- `minimumLength` is not a keyword, and no index signature hides that
    const schema: JSONSchema = { type: 'string', minimumLength: 3 }
    expect(schema).toBeDefined()
  })

  it('types $ref as a document reference, so a bare definition name does not compile', () => {
    // @ts-expect-error -- `User` is neither a pointer nor a file: it wanted `#/$defs/User`
    const schema: JSONSchema = { $ref: 'User' }
    expect(schema.$ref).toBe('User')
  })

  it('types format as the known vocabulary', () => {
    // @ts-expect-error -- `e-mail` is not a format any target knows
    const schema: JSONSchema = { type: 'string', format: 'e-mail' }
    expect(schema.format).toBe('e-mail')
  })

  it('accepts every keyword form the generators read', () => {
    const schema: JSONSchema = {
      $ref: '#/$defs/User',
      type: ['string', 'null'],
      format: 'uuidv7',
      items: [{ type: 'string' }, { type: 'number' }],
      additionalItems: false,
      enum: ['a', 1, null, { nested: [true] }],
      const: { deep: { value: [1, 'two'] } },
      contentEncoding: 'base64',
      discriminator: { propertyName: 'kind', defaultMapping: 'Other' },
      'x-emailPattern': 'rfc5322',
    }
    expect(schema.type).toStrictEqual(['string', 'null'])
  })
})
