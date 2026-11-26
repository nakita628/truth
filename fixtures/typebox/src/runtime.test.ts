import { Value } from 'typebox/value'
import { describe, expect, it } from 'vite-plus/test'
import { User as DefsUser } from '../$defs/output.ts'
import { Config as AdditionalConfig } from '../additional-properties/output.ts'
import { Bounded } from '../allof-keyword/output.ts'
import { Amount } from '../bigint-bounds/output.ts'
import { Limits } from '../bigint-defaults/output.ts'
import { Defaults } from '../default-emitted/output.ts'
import { Sizes } from '../fixed-width-range/output.ts'
import { Metadata } from '../pattern-hex/output.ts'
import { Combined as AllofCombined } from '../allof/output.ts'
import { StringOrNumber as AnyofStringOrNumber } from '../anyof/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { Pet as DiscriminatedPet } from '../discriminated-union/output.ts'
import { User as ErrUser } from '../error-messages/output.ts'
import { Conditional as IfThenElseConditional } from '../if-then-else/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { NotString } from '../not/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { Shape as OneofShape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { Schema as SelfReferenceSchema } from '../self-reference/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'
import { Query as WireBooleanQuery } from '../wire-boolean/output.ts'
import { Query as WireNumberQuery } from '../wire-number/output.ts'

describe('simple', () => {
  it('valid', () => {
    const result = Value.Check(SimpleSchema, { name: 'taro' })
    const errors = [...Value.Errors(SimpleSchema, { name: 'taro' })]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: missing name', () => {
    const result = Value.Check(SimpleSchema, { age: 1 })
    const errors = [...Value.Errors(SimpleSchema, { age: 1 })]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#',
        instancePath: '',
        params: { requiredProperties: ['name'] },
        message: 'must have required properties name',
      },
    ])
  })

  it('invalid: wrong type', () => {
    const result = Value.Check(SimpleSchema, { name: 1 })
    const errors = [...Value.Errors(SimpleSchema, { name: 1 })]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('title', () => {
  it('valid', () => {
    const result = Value.Check(TitleUser, { name: 'taro', email: 'a@b.com' })
    const errors = [...Value.Errors(TitleUser, { name: 'taro', email: 'a@b.com' })]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: bad email format', () => {
    const result = Value.Check(TitleUser, { name: 'a', email: 'not-email' })
    const errors = [...Value.Errors(TitleUser, { name: 'a', email: 'not-email' })]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'format',
        schemaPath: '#/properties/email',
        instancePath: '/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
    ])
  })
})

describe('error-messages', () => {
  it('valid', () => {
    const value = { name: 'taro', age: 30, tags: ['a'] }
    const result = Value.Check(ErrUser, value)
    const errors = [...Value.Errors(ErrUser, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: minimum bounds', () => {
    const value = { name: '', age: -1, tags: [] }
    const result = Value.Check(ErrUser, value)
    const errors = [...Value.Errors(ErrUser, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'minLength',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { limit: 3 },
        message: 'must not have fewer than 3 characters',
      },
      {
        keyword: 'pattern',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { pattern: '^[a-zA-Z]+$' },
        message: 'must match pattern "^[a-zA-Z]+$"',
      },
      {
        keyword: 'minimum',
        schemaPath: '#/properties/age',
        instancePath: '/age',
        params: { comparison: '>=', limit: 0 },
        message: 'must be >= 0',
      },
      {
        keyword: 'minItems',
        schemaPath: '#/properties/tags',
        instancePath: '/tags',
        params: { limit: 1 },
        message: 'must not have fewer than 1 items',
      },
    ])
  })

  it('invalid: maximum bounds', () => {
    const value = { name: '123', age: 200, tags: ['a', 'b', 'c', 'd', 'e', 'f'] }
    const result = Value.Check(ErrUser, value)
    const errors = [...Value.Errors(ErrUser, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'pattern',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { pattern: '^[a-zA-Z]+$' },
        message: 'must match pattern "^[a-zA-Z]+$"',
      },
      {
        keyword: 'maximum',
        schemaPath: '#/properties/age',
        instancePath: '/age',
        params: { comparison: '<=', limit: 120 },
        message: 'must be <= 120',
      },
      {
        keyword: 'maxItems',
        schemaPath: '#/properties/tags',
        instancePath: '/tags',
        params: { limit: 5 },
        message: 'must not have more than 5 items',
      },
    ])
  })
})

describe('allof', () => {
  it('valid', () => {
    const value = { name: 'x', age: 1 }
    const result = Value.Check(AllofCombined, value)
    const errors = [...Value.Errors(AllofCombined, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: missing required from second schema', () => {
    const value = { name: 'x' }
    const result = Value.Check(AllofCombined, value)
    const errors = [...Value.Errors(AllofCombined, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#/allOf/1',
        instancePath: '',
        params: { requiredProperties: ['age'] },
        message: 'must have required properties age',
      },
    ])
  })
})

describe('pattern-hex', () => {
  it('treats a braced hex escape as a unicode range', () => {
    expect(Value.Check(Metadata, 'あ')).toBe(true)
  })
})

describe('allof-keyword', () => {
  it('keeps a minimum folded onto the integer', () => {
    expect(Value.Check(Bounded, 5)).toBe(true)
    expect(Value.Check(Bounded, 3)).toBe(false)
    expect(Value.Check(Bounded, 5.5)).toBe(false)
  })
})

describe('anyof', () => {
  it('valid: string', () => {
    const result = Value.Check(AnyofStringOrNumber, 'hello')
    const errors = [...Value.Errors(AnyofStringOrNumber, 'hello')]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('valid: number', () => {
    const result = Value.Check(AnyofStringOrNumber, 42)
    const errors = [...Value.Errors(AnyofStringOrNumber, 42)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: boolean', () => {
    const result = Value.Check(AnyofStringOrNumber, true)
    const errors = [...Value.Errors(AnyofStringOrNumber, true)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/anyOf/0',
        instancePath: '',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/anyOf/1',
        instancePath: '',
        params: { type: 'number' },
        message: 'must be number',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#',
        instancePath: '',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('oneof', () => {
  it('valid: circle', () => {
    const value = { kind: 'circle', radius: 5 }
    const result = Value.Check(OneofShape, value)
    const errors = [...Value.Errors(OneofShape, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('valid: rectangle', () => {
    const value = { kind: 'rectangle', width: 1, height: 2 }
    const result = Value.Check(OneofShape, value)
    const errors = [...Value.Errors(OneofShape, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: unknown kind', () => {
    const value = { kind: 'triangle' }
    const result = Value.Check(OneofShape, value)
    const errors = [...Value.Errors(OneofShape, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#/anyOf/0',
        instancePath: '',
        params: { requiredProperties: ['radius'] },
        message: 'must have required properties radius',
      },
      {
        keyword: 'const',
        schemaPath: '#/anyOf/0/properties/kind',
        instancePath: '/kind',
        params: { allowedValue: 'circle' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'required',
        schemaPath: '#/anyOf/1',
        instancePath: '',
        params: { requiredProperties: ['width', 'height'] },
        message: 'must have required properties width, height',
      },
      {
        keyword: 'const',
        schemaPath: '#/anyOf/1/properties/kind',
        instancePath: '/kind',
        params: { allowedValue: 'rectangle' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#',
        instancePath: '',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('additional-properties', () => {
  it('valid', () => {
    const result = Value.Check(AdditionalConfig, { a: 'hello' })
    const errors = [...Value.Errors(AdditionalConfig, { a: 'hello' })]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: value type mismatch', () => {
    const result = Value.Check(AdditionalConfig, { a: 1 })
    const errors = [...Value.Errors(AdditionalConfig, { a: 1 })]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/patternProperties/^.*$',
        instancePath: '/a',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('nested', () => {
  it('valid', () => {
    const value = {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    }
    const result = Value.Check(NestedOrder, value)
    const errors = [...Value.Errors(NestedOrder, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: multiple nested errors', () => {
    const value = {
      id: 1.5,
      customer: { name: '', email: 'x' },
      items: [],
      status: 'unknown',
    }
    const result = Value.Check(NestedOrder, value)
    const errors = [...Value.Errors(NestedOrder, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/id',
        instancePath: '/id',
        params: { type: 'integer' },
        message: 'must be integer',
      },
      {
        keyword: 'minLength',
        schemaPath: '#/properties/customer/properties/name',
        instancePath: '/customer/name',
        params: { limit: 1 },
        message: 'must not have fewer than 1 characters',
      },
      {
        keyword: 'format',
        schemaPath: '#/properties/customer/properties/email',
        instancePath: '/customer/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/0',
        instancePath: '/status',
        params: { allowedValue: 'pending' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/1',
        instancePath: '/status',
        params: { allowedValue: 'confirmed' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/2',
        instancePath: '/status',
        params: { allowedValue: 'shipped' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/3',
        instancePath: '/status',
        params: { allowedValue: 'delivered' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#/properties/status',
        instancePath: '/status',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('$defs', () => {
  it('valid', () => {
    const value = { name: 'taro', address: { street: 's', city: 'c' } }
    const result = Value.Check(DefsUser, value)
    const errors = [...Value.Errors(DefsUser, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: nested ref violations', () => {
    const value = { name: 1, address: { street: 1 } }
    const result = Value.Check(DefsUser, value)
    const errors = [...Value.Errors(DefsUser, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'required',
        schemaPath: '#/properties/address',
        instancePath: '/address',
        params: { requiredProperties: ['city'] },
        message: 'must have required properties city',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/address/properties/street',
        instancePath: '/address/street',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('definitions', () => {
  it('valid', () => {
    const result = Value.Check(DefinitionsA, { b: { c: 'hello' } })
    const errors = [...Value.Errors(DefinitionsA, { b: { c: 'hello' } })]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: nested type', () => {
    const result = Value.Check(DefinitionsA, { b: { c: 1 } })
    const errors = [...Value.Errors(DefinitionsA, { b: { c: 1 } })]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/b/properties/c',
        instancePath: '/b/c',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('readonly', () => {
  it('valid', () => {
    const result = Value.Check(ReadonlyConfig, { name: 'foo', tags: ['x'] })
    const errors = [...Value.Errors(ReadonlyConfig, { name: 'foo', tags: ['x'] })]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: wrong types', () => {
    const result = Value.Check(ReadonlyConfig, { name: 1, tags: [1] })
    const errors = [...Value.Errors(ReadonlyConfig, { name: 1, tags: [1] })]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/tags/items',
        instancePath: '/tags/0',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('split-refs', () => {
  it('valid', () => {
    const value = { name: 'taro', address: { street: 's', city: 'c' } }
    const result = Value.Check(SplitRefsUser, value)
    const errors = [...Value.Errors(SplitRefsUser, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: nested type mismatches', () => {
    const value = { name: 1, address: { street: 1, city: 1 } }
    const result = Value.Check(SplitRefsUser, value)
    const errors = [...Value.Errors(SplitRefsUser, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/address/properties/street',
        instancePath: '/address/street',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/address/properties/city',
        instancePath: '/address/city',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('split-nested', () => {
  it('valid', () => {
    const value = {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    }
    const result = Value.Check(SplitNestedOrder, value)
    const errors = [...Value.Errors(SplitNestedOrder, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: multiple nested errors', () => {
    const value = { id: 1.5, customer: { name: 1, email: 'x' }, status: 'bad' }
    const result = Value.Check(SplitNestedOrder, value)
    const errors = [...Value.Errors(SplitNestedOrder, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/id',
        instancePath: '/id',
        params: { type: 'integer' },
        message: 'must be integer',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/customer/properties/name',
        instancePath: '/customer/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'format',
        schemaPath: '#/properties/customer/properties/email',
        instancePath: '/customer/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/0',
        instancePath: '/status',
        params: { allowedValue: 'pending' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/1',
        instancePath: '/status',
        params: { allowedValue: 'shipped' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/2',
        instancePath: '/status',
        params: { allowedValue: 'delivered' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#/properties/status',
        instancePath: '/status',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('meta', () => {
  it('valid', () => {
    const value = { id: 1, email: 'a@b.com' }
    const result = Value.Check(MetaUser, value)
    const errors = [...Value.Errors(MetaUser, value)]
    expect(result).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: type and format', () => {
    const value = { id: 1.5, email: 'bad' }
    const result = Value.Check(MetaUser, value)
    const errors = [...Value.Errors(MetaUser, value)]
    expect(result).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/id',
        instancePath: '/id',
        params: { type: 'integer' },
        message: 'must be integer',
      },
      {
        keyword: 'format',
        schemaPath: '#/properties/email',
        instancePath: '/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
    ])
  })
})

describe('discriminated-union', () => {
  it('valid: dog', () => {
    expect(Value.Check(DiscriminatedPet, { kind: 'dog', bark: true })).toBe(true)
  })

  it('valid: cat', () => {
    expect(Value.Check(DiscriminatedPet, { kind: 'cat', purr: false })).toBe(true)
  })

  it('invalid: unknown discriminator surfaces all branch failures + anyOf summary', () => {
    const value = { kind: 'fish' }
    expect(Value.Check(DiscriminatedPet, value)).toBe(false)
    expect([...Value.Errors(DiscriminatedPet, value)]).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#/anyOf/0',
        instancePath: '',
        params: { requiredProperties: ['bark'] },
        message: 'must have required properties bark',
      },
      {
        keyword: 'const',
        schemaPath: '#/anyOf/0/properties/kind',
        instancePath: '/kind',
        params: { allowedValue: 'dog' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'required',
        schemaPath: '#/anyOf/1',
        instancePath: '',
        params: { requiredProperties: ['purr'] },
        message: 'must have required properties purr',
      },
      {
        keyword: 'const',
        schemaPath: '#/anyOf/1/properties/kind',
        instancePath: '/kind',
        params: { allowedValue: 'cat' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#',
        instancePath: '',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('length-message', () => {
  it('valid', () => {
    const value = { code: 'abcdef' }
    expect(Value.Check(LengthMessageCode, value)).toBe(true)
    expect([...Value.Errors(LengthMessageCode, value)]).toStrictEqual([])
  })

  it('invalid: empty code emits TypeBox default (x-length-message only via ajv-errors)', () => {
    const value = { code: '' }
    expect(Value.Check(LengthMessageCode, value)).toBe(false)
    expect([...Value.Errors(LengthMessageCode, value)]).toStrictEqual([
      {
        keyword: 'minLength',
        schemaPath: '#/properties/code',
        instancePath: '/code',
        params: { limit: 6 },
        message: 'must not have fewer than 6 characters',
      },
    ])
  })
})


describe('not (TypeBox v1 falls back to Type.Any() — accepts any input)', () => {
  it('accepts strings (fallback to Type.Any)', () => {
    expect(Value.Check(NotString, 'hello')).toBe(true)
  })

  it('accepts non-strings (fallback to Type.Any)', () => {
    expect(Value.Check(NotString, 42)).toBe(true)
  })
})

describe('if-then-else (sub-schemas without `type` collapse to Type.Any)', () => {
  it('accepts kind=named with value', () => {
    expect(Value.Check(IfThenElseConditional, { kind: 'named', value: 'x' })).toBe(true)
  })

  it('accepts non-named without value', () => {
    expect(Value.Check(IfThenElseConditional, { kind: 'other' })).toBe(true)
  })

  it('rejects non-string kind', () => {
    expect(Value.Check(IfThenElseConditional, { kind: 42 })).toBe(false)
  })
})

describe('self-reference (Type.Cyclic)', () => {
  it('accepts an arbitrarily deep tree', () => {
    expect(Value.Check(SelfReferenceSchema, { children: [{ children: [{ children: [] }] }] })).toBe(
      true,
    )
  })

  it('accepts the empty object', () => {
    expect(Value.Check(SelfReferenceSchema, {})).toBe(true)
  })

  it('rejects a non-array children', () => {
    expect(Value.Check(SelfReferenceSchema, { children: 'x' })).toBe(false)
  })

  it('rejects a malformed nested node', () => {
    expect(Value.Check(SelfReferenceSchema, { children: [{ children: 1 }] })).toBe(false)
  })
})

describe('circular (mutually recursive Type.Cyclic)', () => {
  it('accepts an alternating A/B chain', () => {
    expect(Value.Check(CircularA, { b: { a: { b: {} } } })).toBe(true)
  })

  it('accepts the empty object', () => {
    expect(Value.Check(CircularA, {})).toBe(true)
  })

  it('rejects a non-object at the B position', () => {
    expect(Value.Check(CircularA, { b: 1 })).toBe(false)
  })

  it('rejects a non-object deeper in the chain', () => {
    expect(Value.Check(CircularA, { b: { a: 1 } })).toBe(false)
  })
})

describe('bigint-bounds', () => {
  it('honors a fractional minimum, an exclusive maximum and a fractional multipleOf', () => {
    expect([0n, 5n, 10n, 95n, 100n, 4n].map((value) => Value.Check(Amount, value))).toStrictEqual([
      false,
      true,
      true,
      true,
      false,
      false,
    ])
  })

  it('stays serializable', () => {
    expect(() => JSON.stringify(Amount)).not.toThrow()
  })

  // `Value.Create` runs `BigInt()` on the lower bound, which throws on a fraction. It
  // starts from the minimum and does not look at `multipleOf`.
  it('creates a value from the rounded minimum', () => {
    expect(Value.Create(Amount)).toBe(1n)
  })
})

describe('bigint-defaults', () => {
  it('checks a minimum beside a numeric exclusiveMinimum, and a maximum beside an exclusiveMaximum', () => {
    expect([5n, 6n, 7n, 8n].map((between) => Value.Check(Limits, { between }))).toStrictEqual([
      false,
      true,
      true,
      false,
    ])
  })

  it('leaves the default of a Type.BigInt out, so Value.Default puts in nothing it rejects', () => {
    const filled = Value.Default(Limits, {})
    expect(filled).toStrictEqual({ large: 9007199254740992 })
    expect(Value.Check(Limits, filled)).toBe(true)
  })

  it('serializes, as it carries no bigint default', () => {
    expect(JSON.parse(JSON.stringify(Limits)).properties.big).not.toHaveProperty('default')
  })
})

describe('wire-boolean', () => {
  it('serializes the wire pattern as a JSON Schema string', () => {
    expect(JSON.parse(JSON.stringify(WireBooleanQuery)).properties.active.pattern).toBe(
      '^(?:[Tt][Rr][Uu][Ee]|1|[Yy][Ee][Ss]|[Oo][Nn]|[Yy]|[Ee][Nn][Aa][Bb][Ll][Ee][Dd]|[Ff][Aa][Ll][Ss][Ee]|0|[Nn][Oo]|[Oo][Ff][Ff]|[Nn]|[Dd][Ii][Ss][Aa][Bb][Ll][Ee][Dd])$',
    )
  })

  it.each<[string, boolean]>([
    ['true', true],
    ['TRUE', true],
    ['1', true],
    ['Yes', true],
    ['oN', true],
    ['Y', true],
    ['Enabled', true],
    ['false', false],
    ['False', false],
    ['0', false],
    ['NO', false],
    ['Off', false],
    ['n', false],
    ['DISABLED', false],
  ])('decodes %s to %s', (text, expected) => {
    expect(Value.Decode(WireBooleanQuery, { active: text })).toStrictEqual({ active: expected })
  })

  it.each(['', 'maybe', 'true1', ' true', '2', 'yes\n'])('rejects %j', (text) => {
    expect(Value.Check(WireBooleanQuery, { active: text })).toBe(false)
  })

  it('encodes a boolean to its text', () => {
    expect(Value.Encode(WireBooleanQuery, { active: true })).toStrictEqual({ active: 'true' })
    expect(Value.Encode(WireBooleanQuery, { active: false })).toStrictEqual({ active: 'false' })
  })
})

describe('wire-number', () => {
  it.each<[string, string, number]>([
    ['ratio', '1.5', 1.5],
    ['ratio', '9007199254740993', 9007199254740992],
    ['score', '1e3', 1000],
    ['id', '-9007199254740991', -9007199254740991],
    ['count', '9007199254740991', 9007199254740991],
  ])('decodes %s=%s to %d', (key, text, expected) => {
    expect(Value.Decode(WireNumberQuery, { [key]: text })).toStrictEqual({ [key]: expected })
  })

  it.each<[string, string]>([
    ['ratio', '1e999'],
    ['ratio', '-1e999'],
    ['score', '1e999'],
    ['id', '9007199254740992'],
    ['id', '-9007199254740993'],
    ['count', '9007199254740993'],
  ])('rejects %s=%s, which overflows or loses precision', (key, text) => {
    expect(Value.Check(WireNumberQuery, { [key]: text })).toBe(false)
    expect(() => Value.Decode(WireNumberQuery, { [key]: text })).toThrow()
  })

  it('decodes int64 text to a bigint, keeping every digit (#84)', () => {
    expect(Value.Decode(WireNumberQuery, { total: '9007199254740993' })).toStrictEqual({
      total: 9007199254740993n,
    })
    expect(Value.Decode(WireNumberQuery, { total: '-9223372036854775808' })).toStrictEqual({
      total: -9223372036854775808n,
    })
    expect(Value.Encode(WireNumberQuery, { total: 9223372036854775807n })).toStrictEqual({
      total: '9223372036854775807',
    })
  })

  it.each(['9223372036854775808', '-9223372036854775809', '1.5', '1e3', ''])(
    'rejects total=%s, outside int64 or not integer text',
    (text) => {
      expect(Value.Check(WireNumberQuery, { total: text })).toBe(false)
      expect(() => Value.Decode(WireNumberQuery, { total: text })).toThrow()
    },
  )

  it.each<[string, string, number]>([
    ['small', '2147483647', 2147483647],
    ['small', '-2147483648', -2147483648],
    ['single', '3.4e38', 3.4e38],
  ])('decodes %s=%s inside the range of its format to %d', (key, text, expected) => {
    expect(Value.Decode(WireNumberQuery, { [key]: text })).toStrictEqual({ [key]: expected })
  })

  it.each<[string, string]>([
    ['small', '3000000000'],
    ['small', '-2147483649'],
    ['single', '1e39'],
    ['single', '-1e39'],
    // The text Java prints for `Float.MAX_VALUE` reads as a double above the bound, which
    // Zod's `z.float32()` and Valibot's `v.maxValue` reject as well.
    ['single', '3.4028235E38'],
  ])('rejects %s=%s, outside the range of its format', (key, text) => {
    expect(Value.Check(WireNumberQuery, { [key]: text })).toBe(false)
    expect(() => Value.Decode(WireNumberQuery, { [key]: text })).toThrow()
  })
})

describe('fixed-width-range (#121)', () => {
  it.each([{ count: -2147483648 }, { count: 2147483647 }, { total: 4294967295 }, { ratio: 1.5 }])(
    'accepts %j, within the format range',
    (value) => {
      expect(Value.Check(Sizes, value)).toBe(true)
    },
  )

  it.each([
    { count: 3000000000 },
    { count: -2147483649 },
    { total: 0 },
    { total: 4294967296 },
    { ratio: 1e39 },
  ])('rejects %j, outside the format range', (value) => {
    expect(Value.Check(Sizes, value)).toBe(false)
  })

  it('creates a value within the format beside a looser exclusive bound', () => {
    const floor = Value.Create(Sizes.properties.floor)
    expect(Value.Check(Sizes, { floor })).toBe(true)
    expect(Value.Check(Sizes, { floor: -2147483649 })).toBe(false)
  })

  it('creates a multiple of multipleOf within the format', () => {
    const step = Value.Create(Sizes.properties.step)
    expect(Value.Check(Sizes, { step })).toBe(true)
    expect(Value.Check(Sizes, { step: 2147483650 })).toBe(false)
  })
})

describe('default-emitted (#127)', () => {
  it('fills defaults the emitted properties and items accept', () => {
    const value = Value.Default(Defaults, {})
    expect(value).toStrictEqual({ box: { n: '5' }, list: ['5', '6'] })
    expect(Value.Check(Defaults, value)).toBe(true)
  })
})
