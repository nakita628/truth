import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { schemaToAjv } from './ajv/index.js'
import { schemaToArktype } from './arktype/index.js'
import { schemaToEffect } from './effect/index.js'
import { schemaToTypebox } from './typebox/index.js'
import { schemaToValibot } from './valibot/index.js'
import { schemaToYup } from './yup/index.js'
import { schemaToZod } from './zod/index.js'

const GENERATORS = {
  ajv: schemaToAjv,
  arktype: schemaToArktype,
  effect: schemaToEffect,
  typebox: schemaToTypebox,
  valibot: schemaToValibot,
  yup: schemaToYup,
  zod: schemaToZod,
}

// A keyword value of the wrong type, as documents in the wild carry them (Revolut's
// `minimum: "'created_at' - 21 days"`). Read as it was, it threw (`schema.enum.filter is
// not a function`) or was written into the source as code (`.max(ten)`).
const MISTYPED = {
  title: 'Root',
  type: 'object',
  required: { a: 1 },
  properties: {
    a: { type: 'string', format: 5, maxLength: 'ten', minimum: "'created_at' - 21 days" },
    b: { type: 'number', multipleOf: 'x', maximum: 'process.exit(1)' },
    c: { type: 'string', enum: 'a' },
    d: { allOf: { type: 'string' } },
    e: { type: 5 },
    f: { type: 'object', properties: null },
  },
} as unknown as JSONSchema

describe('a keyword value of the wrong type', () => {
  it.each(Object.entries(GENERATORS))('is left out by %s', (_, generate) => {
    const code = generate(MISTYPED)
    expect(code).not.toContain('ten')
    expect(code).not.toContain('process.exit')
    expect(code).not.toContain('created_at')
  })
})
