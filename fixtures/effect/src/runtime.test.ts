import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vite-plus/test'

import { Config as AdditionalPropsConfig } from '../additional-properties/output.ts'
import { Bounded } from '../allof-keyword/output.ts'
import { Amount } from '../not-int64/output.ts'
import { Filters } from '../object-default/output.ts'
import { Headers } from '../param-header-array/output.ts'
import { Metadata } from '../pattern-hex/output.ts'
import { Combined } from '../allof/output.ts'
import { Merged } from '../allof-message/output.ts'
import { StringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { User as DefsUser } from '../$defs/output.ts'
import { Event as DiscriminatedEvent } from '../discriminated-union/output.ts'
import { User as ErrorMessagesUser } from '../error-messages/output.ts'
import { Address as IfThenElseAddress } from '../if-then-else/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { Shape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema_ as SelfRefSchema } from '../self-reference/output.ts'
import { Schema_ as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'
import { Query as WireQuery } from '../wire-query/output.ts'
import { Formats as StringFormats } from '../string-formats/output.ts'
import { Ids as ParamFormNoExplodeIds } from '../param-form-no-explode/output.ts'
import { Filter as ParamDeepObjectFilter } from '../param-deep-object/output.ts'
import { Payload as ParamJsonContentPayload } from '../param-json-content/output.ts'

const decode = <A, I>(schema: Schema.Codec<A, I>, value: unknown) =>
  Schema.decodeUnknownResult(schema)(value)

describe('error-messages runtime', () => {
  it('valid', () => {
    const result = decode(ErrorMessagesUser, { name: 'tarou', age: 20, tags: ['a'] })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL name too short', () => {
    const result = decode(ErrorMessagesUser, { name: 'a', age: 20, tags: ['a'] })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Name too short\n  at ["name"]',
      })
    }
  })
  it('FAIL name pattern', () => {
    const result = decode(ErrorMessagesUser, { name: 'tar1', age: 20, tags: ['a'] })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Only alphabetic characters\n  at ["name"]',
      })
    }
  })
  it('FAIL age negative', () => {
    const result = decode(ErrorMessagesUser, { name: 'tarou', age: -1, tags: ['a'] })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Age must be positive\n  at ["age"]',
      })
    }
  })
  it('FAIL missing tags', () => {
    const result = decode(ErrorMessagesUser, { name: 'tarou', age: 20 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["tags"]',
      })
    }
  })
})

describe('allof runtime', () => {
  it('valid', () => {
    const result = decode(Combined, { name: 'a', age: 1 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing age', () => {
    const result = decode(Combined, { name: 'a' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message: 'Missing key\n  at ["age"]',
      })
    }
  })
  it('FAIL wrong type', () => {
    const result = decode(Combined, { name: 'a', age: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected number\n  at ["age"]',
      })
    }
  })
})

describe('allof-keyword runtime', () => {
  it('keeps a minimum folded onto the integer', () => {
    expect(Schema.decodeUnknownSync(Bounded)(5)).toBe(5)
    expect(Result.isSuccess(decode(Bounded, 3))).toBe(false)
    expect(Result.isSuccess(decode(Bounded, 5.5))).toBe(false)
  })
})

describe('pattern, bigint not, defaults and header arrays', () => {
  it('treats a braced hex escape as a unicode range', () => {
    expect(Schema.decodeUnknownSync(Metadata)('あ')).toBe('あ')
  })

  it('rejects the bigint 0 excluded by not.enum', () => {
    expect(Result.isSuccess(decode(Amount, 0))).toBe(false)
    expect(Schema.decodeUnknownSync(Amount)(1)).toBe(1n)
  })

  it('drops undeclared keys from an object default', () => {
    expect(Schema.decodeUnknownSync(Filters)(undefined)).toStrictEqual({
      fetch_connection_secrets: false,
    })
  })

  it('splits a header array on commas before reading integers', () => {
    expect(Schema.decodeUnknownSync(Headers)({ 'x-ids': '1,2,3' })).toStrictEqual({
      'x-ids': [1, 2, 3],
    })
    expect(Result.isSuccess(decode(Headers, { 'x-ids': '007' }))).toBe(false)
  })
})

describe('allof-message runtime', () => {
  it('valid', () => {
    const result = decode(Merged, { name: 'taro', age: 5 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL', () => {
    const result = decode(Merged, { name: 'ab', age: -1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'merged validation failed',
      })
    }
  })
})

describe('anyof runtime', () => {
  it('valid string', () => {
    const result = decode(StringOrNumber, 'hi')
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid number', () => {
    const result = decode(StringOrNumber, 5)
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL', () => {
    const result = decode(StringOrNumber, true)
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message: 'Must be string or number',
      })
    }
  })
})

describe('oneof runtime', () => {
  it('valid circle', () => {
    const result = decode(Shape, { kind: 'circle', radius: 1 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid rectangle', () => {
    const result = decode(Shape, { kind: 'rectangle', width: 1, height: 2 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL unknown kind', () => {
    const result = decode(Shape, { kind: 'triangle' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Must be a valid shape',
      })
    }
  })
})

describe('not runtime', () => {
  it('valid number', () => {
    const result = decode(NotString, 1)
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL string', () => {
    const result = decode(NotString, 'x')
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message: 'Must not be a string',
      })
    }
  })
})

describe('additional-properties runtime', () => {
  it('valid', () => {
    const result = decode(AdditionalPropsConfig, { a: 'b' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong value type', () => {
    const result = decode(AdditionalPropsConfig, { a: 1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected string\n  at ["a"]',
      })
    }
  })
})

describe('readonly runtime', () => {
  it('valid', () => {
    const result = decode(ReadonlyConfig, { name: 'a', tags: ['t'] })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing tags', () => {
    const result = decode(ReadonlyConfig, { name: 'a' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["tags"]',
      })
    }
  })
})

describe('$defs runtime', () => {
  it('valid w/o address', () => {
    const result = decode(DefsUser, { name: 'a' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid w/ address', () => {
    const result = decode(DefsUser, { name: 'a', address: { street: 's', city: 'c' } })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing city', () => {
    const result = decode(DefsUser, { name: 'a', address: { street: 's' } })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["address"]["city"]',
      })
    }
  })
})

describe('definitions runtime', () => {
  it('valid empty', () => {
    const result = decode(DefinitionsA, {})
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid nested', () => {
    const result = decode(DefinitionsA, { b: { c: 'x' } })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong leaf', () => {
    const result = decode(DefinitionsA, { b: { c: 1 } })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected string\n  at ["b"]["c"]',
      })
    }
  })
})

describe('nested runtime', () => {
  it('valid', () => {
    const result = decode(NestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad status', () => {
    const result = decode(NestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [],
      status: 'x',
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected "pending" | "confirmed" | "shipped" | "delivered"\n  at ["status"]',
      })
    }
  })
})

describe('simple runtime', () => {
  it('valid', () => {
    const result = decode(SimpleSchema, { name: 'a' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing name', () => {
    const result = decode(SimpleSchema, { age: 1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["name"]',
      })
    }
  })
})

describe('brand runtime', () => {
  it('valid', () => {
    const result = decode(BrandedTypes, {
      userId: '00000000-0000-0000-0000-000000000000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['t'],
      name: 'x',
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad uuid', () => {
    const result = decode(BrandedTypes, {
      userId: 'not-uuid',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['t'],
      name: 'x',
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected a UUID\n  at ["userId"]',
      })
    }
  })
})

describe('circular runtime', () => {
  it('valid empty', () => {
    const result = decode(CircularA, {})
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid nested', () => {
    const result = decode(CircularA, { b: { a: {} } })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong type', () => {
    const result = decode(CircularA, { b: 1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected object\n  at ["b"]',
      })
    }
  })
})

describe('self-reference runtime', () => {
  it('valid', () => {
    const result = decode(SelfRefSchema, { children: [{ children: [] }] })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong children', () => {
    const result = decode(SelfRefSchema, { children: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected array\n  at ["children"]',
      })
    }
  })
})

describe('meta runtime', () => {
  it('valid', () => {
    const result = decode(MetaUser, { id: 1, email: 'a@b.com' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad email', () => {
    const result = decode(MetaUser, { id: 1, email: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected a string matching the RegExp ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\n  at ["email"]',
      })
    }
  })
})

describe('title runtime', () => {
  it('valid', () => {
    const result = decode(TitleUser, { name: 'a', email: 'a@b.com' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad email', () => {
    const result = decode(TitleUser, { name: 'a', email: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected a string matching the RegExp ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\n  at ["email"]',
      })
    }
  })
})

describe('split-nested runtime', () => {
  it('valid', () => {
    const result = decode(SplitNestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad id', () => {
    const result = decode(SplitNestedOrder, {
      id: 'x',
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected number\n  at ["id"]',
      })
    }
  })
})

describe('split-refs runtime', () => {
  it('valid w/o address', () => {
    const result = decode(SplitRefsUser, { name: 'a' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid w/ address', () => {
    const result = decode(SplitRefsUser, {
      name: 'a',
      address: { street: 's', city: 'c' },
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing name', () => {
    const result = decode(SplitRefsUser, {})
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["name"]',
      })
    }
  })
  it('FAIL bad address', () => {
    const result = decode(SplitRefsUser, { name: 'a', address: { street: 's' } })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["address"]["city"]',
      })
    }
  })
})

describe('discriminated-union runtime', () => {
  it('PASS click event', () => {
    const result = decode(DiscriminatedEvent, { type: 'click', x: 1, y: 2 })
    expect(Result.isSuccess(result)).toBe(true)
  })

  it('PASS keypress event', () => {
    const result = decode(DiscriminatedEvent, { type: 'keypress', key: 'Enter' })
    expect(Result.isSuccess(result)).toBe(true)
  })

  it('FAIL unknown discriminator', () => {
    const result = decode(DiscriminatedEvent, { type: 'unknown' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected { readonly "type": "click", ... } | { readonly "type": "keypress", ... }',
      })
    }
  })
})

describe('length-message runtime', () => {
  it('PASS exactly 6 chars', () => {
    const result = decode(LengthMessageCode, { code: 'abcdef' })
    expect(Result.isSuccess(result)).toBe(true)
  })

  it('FAIL empty code returns x-length-message', () => {
    const result = decode(LengthMessageCode, { code: '' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Code must be exactly 6 characters\n  at ["code"]',
      })
    }
  })
})

describe('if-then-else', () => {
  it('accepts non-JP country without postalCode', () => {
    expect(Schema.is(IfThenElseAddress)({ country: 'US' })).toBe(true)
  })

  it('accepts JP country with matching postalCode', () => {
    expect(Schema.is(IfThenElseAddress)({ country: 'JP', postalCode: '100-0001' })).toBe(true)
  })

  it('rejects JP country missing postalCode', () => {
    expect(Schema.is(IfThenElseAddress)({ country: 'JP' })).toBe(false)
  })
})

describe('wire-query runtime', () => {
  it('coerces every parameter from its text', () => {
    expect(
      Schema.decodeUnknownSync(WireQuery)({
        page: '2',
        ids: '1',
        sort: '-1',
        active: 'true',
        limit: 'null',
        cursor: '18446744073709551615',
        offset: '0',
        skip: '3',
        flag: '1',
        constructor: '5',
        email: ' a@b.co ',
      }),
    ).toStrictEqual({
      page: 2,
      ids: [1],
      sort: -1,
      active: true,
      limit: null,
      cursor: 18446744073709551615n,
      offset: 0,
      skip: 3,
      flag: 1,
      constructor: 5,
      email: 'a@b.co',
    })
  })

  it('applies a wire default on the decoded side, and reads an inherited name as absent', () => {
    expect(Schema.decodeUnknownSync(WireQuery)({})).toStrictEqual({ page: 1 })
  })

  it('reads the boolean spellings z.stringbool() reads', () => {
    expect(Schema.decodeUnknownSync(WireQuery)({ page: '1', flag: 'yes' })).toStrictEqual({
      page: 1,
      flag: true,
    })
    expect(Schema.decodeUnknownSync(WireQuery)({ page: '1', active: 'YES' })).toStrictEqual({
      page: 1,
      active: true,
    })
  })

  it('reads the JavaScript number grammar and refuses what is not finite', () => {
    expect(Schema.decodeUnknownSync(WireQuery)({ page: '1', offset: '1e3' })).toStrictEqual({
      page: 1,
      offset: 1000,
    })
    expect(Result.isSuccess(decode(WireQuery, { page: '1', offset: '1e309' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '1', offset: 'not-a-value' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '1', skip: '1.5' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '007' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '1', skip: '1.0' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '1', skip: '1e3' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '1', offset: '0x10' }))).toBe(false)
    expect(Result.isSuccess(decode(WireQuery, { page: '1', offset: '' }))).toBe(false)
  })

  it.each([
    { sort: '2' },
    { active: 'false' },
    { offset: '-1' },
    { skip: '0' },
    { skip: 'abc' },
    { cursor: '-1' },
    { ids: ['1', 'x'] },
  ])('rejects %o', (input) => {
    expect(Result.isSuccess(decode(WireQuery, { page: '1', ...input }))).toBe(false)
  })
})

describe('parameter serialization runtime', () => {
  it('splits a non-exploded form array', () => {
    expect(Schema.decodeUnknownSync(ParamFormNoExplodeIds)('1,2,3')).toStrictEqual([1, 2, 3])
    expect(Result.isSuccess(decode(ParamFormNoExplodeIds, ''))).toBe(false)
  })

  it('gathers a deepObject parameter', () => {
    expect(
      Schema.decodeUnknownSync(ParamDeepObjectFilter)({ 'deep[age]': '5', 'deep[name]': 'bob' }),
    ).toStrictEqual({ age: 5, name: 'bob' })
  })

  it('parses a JSON content parameter without coercing it', () => {
    expect(Schema.decodeUnknownSync(ParamJsonContentPayload)('{"id":1,"tags":["a"]}')).toStrictEqual(
      { id: 1, tags: ['a'] },
    )
    expect(Result.isSuccess(decode(ParamJsonContentPayload, '{"id":"1"}'))).toBe(false)
  })
})

describe('string-formats runtime', () => {
  it('reads int64 / uint64 from a JSON number or a string of digits', () => {
    expect(
      Schema.decodeUnknownSync(StringFormats)({
        id: 9007199254740991,
        size: '18446744073709551615',
        kind: '2',
      }),
    ).toStrictEqual({ id: 9007199254740991n, size: 18446744073709551615n, kind: 2n })
  })

  it.each([
    ['at', '2025-01-01T00:00:00+09:00'],
    ['time', '12:34:56+09:00'],
    ['time', '12:34'],
    ['guid', '00000000-0000-0000-0000-000000000000'],
    ['site', 'https://example.com'],
  ])('accepts %s %j', (key, value) => {
    expect(Result.isSuccess(decode(StringFormats, { [key]: value }))).toBe(true)
  })

  it.each([
    ['id', 1.5],
    ['id', '1.5'],
    ['kind', 3],
    ['at', '2020-02-30T00:00:00Z'],
    ['time', '25:00'],
    ['time', '99:99:99x'],
    ['guid', 'a1b2c3d4e5f69a7b0c9d0e1f2a3b4c5d'],
    ['site', 'ftp://example.com'],
  ])('rejects %s %j', (key, value) => {
    expect(Result.isSuccess(decode(StringFormats, { [key]: value }))).toBe(false)
  })

  it('trims before the format check', () => {
    expect(Schema.decodeUnknownSync(StringFormats)({ slug: ' a ', email: ' a@b.co ' })).toStrictEqual(
      { slug: 'a', email: 'a@b.co' },
    )
  })
})

describe('string length counts code points', () => {
  it('counts an astral character once', () => {
    expect(Result.isSuccess(decode(LengthMessageCode, { code: '🔥🔥🔥🔥🔥🔥' }))).toBe(true)
    expect(Result.isSuccess(decode(LengthMessageCode, { code: '🔥🔥🔥' }))).toBe(false)
  })
})
