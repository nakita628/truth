import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, "{type:'integer'}"],
    [{ type: 'integer', minimum: 0 }, "{type:'integer',minimum:0}"],
    [{ type: 'integer', minimum: 18 }, "{type:'integer',minimum:18}"],
    [{ type: 'integer', minimum: 0, maximum: 150 }, "{type:'integer',minimum:0}"],
    [{ type: 'integer', exclusiveMinimum: 0 }, "{type:'integer'}"],
    [{ type: 'integer', multipleOf: 1 }, "{type:'integer'}"],
  ])('integer(%o) -> %s', (schema, expected) => {
    expect(integer(schema)).toBe(expected)
  })
})
