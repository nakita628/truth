import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, "{type:'string'}"],
    [{ type: 'string', format: 'email' }, "{type:'string',format:'email'}"],
    [{ type: 'string', format: 'uuid' }, "{type:'string'}"],
    [{ type: 'string', format: 'uri' }, "{type:'string'}"],
    [{ type: 'string', minLength: 1, maxLength: 10 }, "{type:'string'}"],
    [{ type: 'string', pattern: '^\\w+$' }, "{type:'string'}"],
    [{ type: 'string', 'x-error-message': 'required' }, "{type:'string'}"],
  ])('string(%o) -> %s', (schema, expected) => {
    expect(string(schema)).toBe(expected)
  })
})
