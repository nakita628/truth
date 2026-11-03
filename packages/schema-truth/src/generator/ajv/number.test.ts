import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number } from './number.js'

describe('number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, "{type:'number'}"],
    [{ type: 'number', minimum: 0 }, "{type:'number',minimum:0}"],
    [{ type: 'number', minimum: 1.5 }, "{type:'number',minimum:1.5}"],
    [{ type: 'number', minimum: 0, maximum: 100 }, "{type:'number',minimum:0}"],
    [{ type: 'number', exclusiveMinimum: 0 }, "{type:'number'}"],
    [{ type: 'number', multipleOf: 2 }, "{type:'number'}"],
    [{ type: 'number', 'x-minimum-message': 'too small' }, "{type:'number'}"],
  ])('number(%o) -> %s', (schema, expected) => {
    expect(number(schema)).toBe(expected)
  })
})
