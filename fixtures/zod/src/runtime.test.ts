import { describe, expect, it } from 'vite-plus/test'
import { User as DefsUser } from '../$defs/output.ts'
import { Config as AdditionalPropertiesConfig } from '../additional-properties/output.ts'
import { Bounded } from '../allof-keyword/output.ts'
import { Amount } from '../not-int64/output.ts'
import { Filters } from '../object-default/output.ts'
import { Headers } from '../param-header-array/output.ts'
import { Metadata } from '../pattern-hex/output.ts'
import { Combined } from '../allof/output.ts'
import { Filter as ParamDeepObjectFilter } from '../param-deep-object/output.ts'
import { Ids as ParamFormNoExplodeIds } from '../param-form-no-explode/output.ts'
import { Payload as ParamJsonContentPayload } from '../param-json-content/output.ts'
import { Formats as StringFormats } from '../string-formats/output.ts'
import { Query as WireQuery } from '../wire-query/output.ts'
import { Merged } from '../allof-message/output.ts'
import { StringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { Animal as DiscriminatedAnimal } from '../discriminated-union/output.ts'
import { User as ErrorMessagesUser } from '../error-messages/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { Shape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema as SelfRefSchema } from '../self-reference/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'

describe('zod fixtures: error-messages runtime', () => {
  it('valid input passes', () => {
    expect(
      ErrorMessagesUser.safeParse({ name: 'taro', age: 25, tags: ['x'] }).success,
    ).toBe(true)
  })

  it('short name returns x-minimum-message', () => {
    const result = ErrorMessagesUser.safeParse({ name: 'a', age: 25, tags: ['x'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_small',
          minimum: 3,
          inclusive: true,
          path: ['name'],
          message: 'Name too short',
        },
      ])
    }
  })

  it('name longer than maxLength returns x-maximum-message', () => {
    const result = ErrorMessagesUser.safeParse({
      name: 'a'.repeat(21),
      age: 25,
      tags: ['x'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_big',
          maximum: 20,
          inclusive: true,
          path: ['name'],
          message: 'Name too long',
        },
      ])
    }
  })

  it('name failing pattern returns x-pattern-message', () => {
    const result = ErrorMessagesUser.safeParse({ name: 'abc123', age: 25, tags: ['x'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'regex',
          pattern: '/^[a-zA-Z]+$/',
          path: ['name'],
          message: 'Only alphabetic characters',
        },
      ])
    }
  })

  it('negative age returns x-minimum-message', () => {
    const result = ErrorMessagesUser.safeParse({ name: 'taro', age: -1, tags: ['x'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'number',
          code: 'too_small',
          minimum: 0,
          inclusive: true,
          path: ['age'],
          message: 'Age must be positive',
        },
      ])
    }
  })

  it('empty tags returns x-minimum-message', () => {
    const result = ErrorMessagesUser.safeParse({ name: 'taro', age: 25, tags: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'array',
          code: 'too_small',
          minimum: 1,
          inclusive: true,
          path: ['tags'],
          message: 'Need at least one tag',
        },
      ])
    }
  })
})

describe('zod fixtures: allof runtime', () => {
  it('valid input passes', () => {
    expect(Combined.safeParse({ name: 'taro', age: 30 }).success).toBe(true)
  })

  it('missing age fails with invalid_type', () => {
    const result = Combined.safeParse({ name: 'taro' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'number',
          code: 'invalid_type',
          path: ['age'],
          message: 'Invalid input: expected number, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: allof-keyword runtime', () => {
  it('keeps a minimum folded onto the integer', () => {
    expect(Bounded.safeParse(5).success).toBe(true)
    expect(Bounded.safeParse(3).success).toBe(false)
    expect(Bounded.safeParse(5.5).success).toBe(false)
  })
})

describe('zod fixtures: pattern, bigint not, defaults and header arrays', () => {
  it('treats a braced hex escape as a unicode range', () => {
    expect(Metadata.safeParse('あ').success).toBe(true)
  })

  it('rejects the bigint 0 excluded by not.enum', () => {
    expect(Amount.safeParse(0).success).toBe(false)
    expect(Amount.safeParse(1)).toStrictEqual({ success: true, data: 1n })
  })

  it('drops undeclared keys from an object default', () => {
    expect(Filters.parse(undefined)).toStrictEqual({ fetch_connection_secrets: false })
  })

  it('splits a header array on commas before reading integers', () => {
    expect(Headers.parse({ 'x-ids': '1,2,3' })).toStrictEqual({ 'x-ids': [1, 2, 3] })
    expect(Headers.safeParse({ 'x-ids': '007' }).success).toBe(false)
  })
})

describe('zod fixtures: allof-message runtime', () => {
  it('valid input passes', () => {
    expect(Merged.safeParse({ name: 'taro', age: 25 }).success).toBe(true)
  })

  it('age below minimum rewrites message via x-allOf-message', () => {
    const result = Merged.safeParse({ name: 'taro', age: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'number',
          code: 'too_small',
          minimum: 0,
          inclusive: true,
          path: ['age'],
          message: 'merged validation failed',
        },
      ])
    }
  })
})

describe('zod fixtures: anyof runtime', () => {
  it('string passes', () => {
    expect(StringOrNumber.safeParse('hello').success).toBe(true)
  })

  it('number passes', () => {
    expect(StringOrNumber.safeParse(42).success).toBe(true)
  })

  it('boolean fails with x-anyOf-message', () => {
    const result = StringOrNumber.safeParse(true)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          code: 'invalid_union',
          errors: [
            [
              {
                expected: 'string',
                code: 'invalid_type',
                path: [],
                message: 'Invalid input: expected string, received boolean',
              },
            ],
            [
              {
                expected: 'number',
                code: 'invalid_type',
                path: [],
                message: 'Invalid input: expected number, received boolean',
              },
            ],
          ],
          path: [],
          message: 'Must be string or number',
        },
      ])
    }
  })
})

describe('zod fixtures: oneof runtime', () => {
  it('circle passes', () => {
    expect(Shape.safeParse({ kind: 'circle', radius: 1 }).success).toBe(true)
  })

  it('rectangle passes', () => {
    expect(Shape.safeParse({ kind: 'rectangle', width: 1, height: 2 }).success).toBe(true)
  })

  it('unknown discriminator returns x-oneOf-message', () => {
    const result = Shape.safeParse({ kind: 'triangle', side: 1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          code: 'invalid_union',
          errors: [],
          note: 'No matching discriminator',
          discriminator: 'kind',
          options: ['circle', 'rectangle'],
          path: ['kind'],
          message: 'Must be a valid shape',
        },
      ])
    }
  })
})

describe('zod fixtures: not runtime', () => {
  it('number passes (not string)', () => {
    expect(NotString.safeParse(42).success).toBe(true)
  })

  it('boolean passes (not string)', () => {
    expect(NotString.safeParse(true).success).toBe(true)
  })

  it('string fails with x-not-message', () => {
    const result = NotString.safeParse('hello')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          code: 'custom',
          path: [],
          message: 'Must not be a string',
        },
      ])
    }
  })
})

describe('zod fixtures: additional-properties runtime', () => {
  it('record of strings passes', () => {
    expect(AdditionalPropertiesConfig.safeParse({ a: 'x', b: 'y' }).success).toBe(true)
  })

  it('non-string value fails with invalid_type', () => {
    const result = AdditionalPropertiesConfig.safeParse({ a: 1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['a'],
          message: 'Invalid input: expected string, received number',
        },
      ])
    }
  })
})

describe('zod fixtures: nested runtime', () => {
  it('valid order passes', () => {
    expect(
      NestedOrder.safeParse({
        id: 1,
        customer: { name: 'taro', email: 'a@b.com' },
        items: [{ name: 'apple', price: 100, quantity: 2 }],
        status: 'pending',
      }).success,
    ).toBe(true)
  })

  it('invalid status returns enum invalid_value', () => {
    const result = NestedOrder.safeParse({
      id: 1,
      customer: { name: 'taro', email: 'a@b.com' },
      items: [],
      status: 'invalid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          code: 'invalid_value',
          values: ['pending', 'confirmed', 'shipped', 'delivered'],
          path: ['status'],
          message: 'Invalid option: expected one of "pending"|"confirmed"|"shipped"|"delivered"',
        },
      ])
    }
  })
})

describe('zod fixtures: brand runtime', () => {
  it('valid branded types pass', () => {
    expect(
      BrandedTypes.safeParse({
        userId: '00000000-0000-4000-8000-000000000000',
        email: 'a@b.com',
        price: 10,
        quantity: 1,
        tags: ['x'],
        name: 'item',
      }).success,
    ).toBe(true)
  })

  it('bad uuid fails with invalid_format', () => {
    const result = BrandedTypes.safeParse({
      userId: 'not-uuid',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['x'],
      name: 'a',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'uuid',
          pattern:
            '/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/',
          path: ['userId'],
          message: 'Invalid UUID',
        },
      ])
    }
  })
})

describe('zod fixtures: readonly runtime', () => {
  it('valid config passes (count optional)', () => {
    expect(ReadonlyConfig.safeParse({ name: 'a', tags: ['x'] }).success).toBe(true)
  })

  it('valid config with count passes', () => {
    expect(ReadonlyConfig.safeParse({ name: 'a', tags: ['x', 'y'], count: 2 }).success).toBe(
      true,
    )
  })

  it('missing required name fails', () => {
    const result = ReadonlyConfig.safeParse({ tags: ['x'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['name'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: circular runtime', () => {
  it('deeply nested cycle passes', () => {
    expect(CircularA.safeParse({ b: { a: { b: { a: {} } } } }).success).toBe(true)
  })

  it('non-object at deep path fails', () => {
    const result = CircularA.safeParse({ b: { a: 'bad' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'object',
          code: 'invalid_type',
          path: ['b', 'a'],
          message: 'Invalid input: expected object, received string',
        },
      ])
    }
  })
})

describe('zod fixtures: definitions runtime', () => {
  it('valid chained $ref passes', () => {
    expect(DefinitionsA.safeParse({ b: { c: 'hello' } }).success).toBe(true)
  })

  it('wrong leaf type fails', () => {
    const result = DefinitionsA.safeParse({ b: { c: 123 } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['b', 'c'],
          message: 'Invalid input: expected string, received number',
        },
      ])
    }
  })
})

describe('zod fixtures: simple runtime', () => {
  it('required name passes (age optional)', () => {
    expect(SimpleSchema.safeParse({ name: 'taro' }).success).toBe(true)
  })

  it('missing name fails', () => {
    const result = SimpleSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['name'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: title runtime', () => {
  it('valid user passes', () => {
    expect(TitleUser.safeParse({ name: 'taro', email: 'a@b.com' }).success).toBe(true)
  })

  it('bad email fails with invalid_format', () => {
    const result = TitleUser.safeParse({ name: 'x', email: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'email',
          pattern:
            "/^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/",
          path: ['email'],
          message: 'Invalid email address',
        },
      ])
    }
  })
})

describe('zod fixtures: meta runtime', () => {
  it('valid user passes (role optional)', () => {
    expect(MetaUser.safeParse({ id: 1, email: 'a@b.com' }).success).toBe(true)
  })

  it('missing required email fails', () => {
    const result = MetaUser.safeParse({ id: 1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['email'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: $defs runtime', () => {
  it('user without optional address passes', () => {
    expect(DefsUser.safeParse({ name: 'taro' }).success).toBe(true)
  })

  it('partial address fails', () => {
    const result = DefsUser.safeParse({ name: 'x', address: { street: 'a' } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['address', 'city'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: self-reference runtime', () => {
  it('nested children pass', () => {
    expect(
      SelfRefSchema.safeParse({
        children: [{ children: [{ children: [] }] }],
      }).success,
    ).toBe(true)
  })

  it('non-array children at depth fails', () => {
    const result = SelfRefSchema.safeParse({ children: [{ children: 'bad' }] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'array',
          code: 'invalid_type',
          path: ['children', 0, 'children'],
          message: 'Invalid input: expected array, received string',
        },
      ])
    }
  })
})

describe('zod fixtures: split-refs runtime', () => {
  it('valid split user passes', () => {
    expect(
      SplitRefsUser.safeParse({
        name: 'taro',
        address: { street: 'main', city: 'tokyo' },
      }).success,
    ).toBe(true)
  })

  it('wrong-type field in referenced schema fails', () => {
    const result = SplitRefsUser.safeParse({
      name: 'x',
      address: { street: 1, city: 'b' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['address', 'street'],
          message: 'Invalid input: expected string, received number',
        },
      ])
    }
  })
})

describe('zod fixtures: split-nested runtime', () => {
  it('valid split-nested order passes', () => {
    expect(
      SplitNestedOrder.safeParse({
        id: 1,
        customer: {
          name: 'taro',
          email: 'a@b.com',
          address: { street: 'a', city: 'b' },
        },
        status: 'pending',
      }).success,
    ).toBe(true)
  })

  it('bad email deep inside customer fails', () => {
    const result = SplitNestedOrder.safeParse({
      id: 1,
      customer: { name: 'x', email: 'bad', address: { street: 'a', city: 'b' } },
      status: 'pending',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'email',
          pattern:
            "/^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/",
          path: ['customer', 'email'],
          message: 'Invalid email address',
        },
      ])
    }
  })
})

describe('zod fixtures: discriminated-union runtime', () => {
  it('valid: cat', () => {
    expect(DiscriminatedAnimal.safeParse({ kind: 'cat', meow: true }).success).toBe(true)
  })

  it('valid: dog', () => {
    expect(DiscriminatedAnimal.safeParse({ kind: 'dog', bark: false }).success).toBe(true)
  })

  it('invalid: unknown discriminator', () => {
    const result = DiscriminatedAnimal.safeParse({ kind: 'fish', meow: true })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          code: 'invalid_union',
          errors: [],
          note: 'No matching discriminator',
          discriminator: 'kind',
          options: ['cat', 'dog'],
          path: ['kind'],
          message: "Invalid discriminator value. Expected 'cat' | 'dog'",
        },
      ])
    }
  })

  it('invalid: missing variant-specific property', () => {
    const result = DiscriminatedAnimal.safeParse({ kind: 'cat' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'boolean',
          code: 'invalid_type',
          path: ['meow'],
          message: 'Invalid input: expected boolean, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: length-message runtime', () => {
  it('valid: exactly 6 chars passes', () => {
    expect(LengthMessageCode.safeParse({ code: 'abcdef' }).success).toBe(true)
  })

  it('invalid: short code returns x-length-message', () => {
    const result = LengthMessageCode.safeParse({ code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_small',
          minimum: 6,
          inclusive: true,
          exact: true,
          path: ['code'],
          message: 'Code must be exactly 6 characters',
        },
      ])
    }
  })

  it('invalid: long code returns x-length-message', () => {
    const result = LengthMessageCode.safeParse({ code: 'abcdefg' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_big',
          maximum: 6,
          inclusive: true,
          exact: true,
          path: ['code'],
          message: 'Code must be exactly 6 characters',
        },
      ])
    }
  })
})

describe('zod fixtures: wire-query runtime', () => {
  it('coerces every parameter from its text', () => {
    expect(
      WireQuery.parse({
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

  it('reads an absent parameter named like an Object.prototype member as absent', () => {
    expect(WireQuery.parse({})).toStrictEqual({ page: 1 })
  })

  it('reads a JSON number and refuses integer text that is not a decimal integer', () => {
    expect(WireQuery.parse({ page: '1', offset: '1e3' })).toStrictEqual({ page: 1, offset: 1000 })
  })

  it('reports a bad array element at its index', () => {
    const result = WireQuery.safeParse({ ids: ['1', 'x'] })
    expect(result.error?.issues.map((issue) => issue.path)).toStrictEqual([['ids', 1]])
  })

  it.each([
    [{ sort: '2' }, 'sort'],
    [{ active: 'false' }, 'active'],
    [{ offset: '-1' }, 'offset'],
    [{ offset: '0x10' }, 'offset'],
    [{ offset: '' }, 'offset'],
    [{ page: '007' }, 'page'],
    [{ skip: '0' }, 'skip'],
    [{ skip: '1.0' }, 'skip'],
    [{ skip: '1e3' }, 'skip'],
    [{ skip: 'abc' }, 'skip'],
    [{ cursor: '-1' }, 'cursor'],
  ])('rejects %o at %s', (input, key) => {
    const result = WireQuery.safeParse(input)
    expect(result.error?.issues.map((issue) => issue.path)).toStrictEqual([[key]])
  })
})

describe('zod fixtures: parameter serialization runtime', () => {
  it('splits a non-exploded form array', () => {
    expect(ParamFormNoExplodeIds.parse('1,2,3')).toStrictEqual([1, 2, 3])
    expect(ParamFormNoExplodeIds.safeParse('').success).toBe(false)
  })

  it('gathers a deepObject parameter', () => {
    expect(ParamDeepObjectFilter.parse({ 'deep[age]': '5', 'deep[name]': 'bob' })).toStrictEqual({
      age: 5,
      name: 'bob',
    })
  })

  it('parses a JSON content parameter without coercing it', () => {
    expect(ParamJsonContentPayload.parse('{"id":1,"tags":["a"]}')).toStrictEqual({
      id: 1,
      tags: ['a'],
    })
    expect(ParamJsonContentPayload.safeParse('{"id":"1"}').success).toBe(false)
  })
})

describe('zod fixtures: string-formats runtime', () => {
  it('reads int64 / uint64 from a JSON number or a string of digits', () => {
    expect(
      StringFormats.parse({ id: 9007199254740991, size: '18446744073709551615', kind: '2' }),
    ).toStrictEqual({ id: 9007199254740991n, size: 18446744073709551615n, kind: 2n })
  })

  it.each([
    ['at', '2025-01-01T00:00:00+09:00'],
    ['time', '12:34:56+09:00'],
    ['guid', '00000000-0000-0000-0000-000000000000'],
    ['site', 'https://example.com'],
    ['card', '4111111111111111'],
    ['iban', 'GB82WEST12345698765432'],
    ['currency', 'JPY'],
  ])('accepts %s %j', (key, value) => {
    expect(StringFormats.safeParse({ [key]: value }).success).toBe(true)
  })

  it.each([
    ['id', 1.5],
    ['id', '1.5'],
    ['kind', 3],
    ['time', '25:00'],
    ['guid', 'a1b2c3d4e5f69a7b0c9d0e1f2a3b4c5d'],
    ['site', 'ftp://example.com'],
    ['card', '4111111111111112'],
    ['iban', 'GB82WEST12345698765433'],
    ['currency', 'ABC'],
  ])('rejects %s %j', (key, value) => {
    expect(StringFormats.safeParse({ [key]: value }).success).toBe(false)
  })

  it('trims before the format check', () => {
    expect(StringFormats.parse({ slug: ' a ', email: ' a@b.co ' })).toStrictEqual({
      slug: 'a',
      email: 'a@b.co',
    })
  })
})
