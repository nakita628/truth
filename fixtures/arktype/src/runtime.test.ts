import { type } from 'arktype'
import { describe, expect, it } from 'vite-plus/test'
import { User as DefsUser } from '../$defs/output.ts'
import { Config as AdditionalConfig } from '../additional-properties/output.ts'
import { Bounded } from '../allof-keyword/output.ts'
import { Amount } from '../not-int64/output.ts'
import { Headers } from '../param-header-array/output.ts'
import { Metadata } from '../pattern-hex/output.ts'
import { Combined as AllofCombined } from '../allof/output.ts'
import { Merged as AllofMessageMerged } from '../allof-message/output.ts'
import { StringOrNumber as AnyofStringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { IntList } from '../contains-min-max/output.ts'
import { ImageBag } from '../content-encoding-base64/output.ts'
import { StyleBag } from '../content-schema-json/output.ts'
import { User as DeepUser } from '../deep-nested-validation/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { DependentRequired } from '../dependent-schemas/output.ts'
import { Animal } from '../discriminated-union/output.ts'
import { Color } from '../enum-japanese/output.ts'
import { User as ErrUser } from '../error-messages/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { Address } from '../if-then-else/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { MaybeString } from '../nullable-default/output.ts'
import { Shape as OneofShape } from '../oneof/output.ts'
import { PatternBag } from '../pattern-properties/output.ts'
import { Tuple } from '../prefix-items-unevaluated/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Organization as ScopeMetadataOrganization } from '../scope-metadata/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Query as WireQuery } from '../wire-query/output.ts'
import { Formats as StringFormats } from '../string-formats/output.ts'
import { Ids as ParamFormNoExplodeIds } from '../param-form-no-explode/output.ts'
import { Filter as ParamDeepObjectFilter } from '../param-deep-object/output.ts'
import { Payload as ParamJsonContentPayload } from '../param-json-content/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'
import { Account } from '../write-only-password/output.ts'

const issues = (result: unknown) => {
  if (!(result instanceof type.errors)) {
    throw new Error('expected ArkErrors')
  }
  return [...result].map((e) => ({ path: [...e.path], code: e.code, message: e.message }))
}

describe('simple', () => {
  it('valid', () => {
    const result = SimpleSchema({ name: 'taro' })
    expect(result).toStrictEqual({ name: 'taro' })
  })

  it('invalid: missing required', () => {
    const result = SimpleSchema({ age: 1 })
    expect(issues(result)).toStrictEqual([
      { path: ['name'], code: 'required', message: 'name must be a string (was missing)' },
    ])
  })

  it('invalid: wrong type', () => {
    const result = SimpleSchema({ name: 1 })
    expect(issues(result)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
    ])
  })
})

describe('title', () => {
  it('valid', () => {
    const result = TitleUser({ name: 'taro', email: 'a@b.com' })
    expect(result).toStrictEqual({ name: 'taro', email: 'a@b.com' })
  })

  it('invalid: bad email', () => {
    const result = TitleUser({ name: 'a', email: 'not-email' })
    expect(issues(result)).toStrictEqual([
      {
        path: ['email'],
        code: 'pattern',
        message: 'email must be an email address (was "not-email")',
      },
    ])
  })
})

describe('error-messages', () => {
  it('valid', () => {
    const result = ErrUser({ name: 'taro', age: 30, tags: ['a'] })
    expect(result).toStrictEqual({ name: 'taro', age: 30, tags: ['a'] })
  })

  it('invalid: empty/negative', () => {
    const result = ErrUser({ name: '', age: -1, tags: [] })
    expect(issues(result)).toStrictEqual([
      { path: ['age'], code: 'predicate', message: 'age must be Age must be positive (was -1)' },
      {
        path: ['name'],
        code: 'predicate',
        message: 'name must be Only alphabetic characters (was "")',
      },
      { path: ['tags'], code: 'predicate', message: 'tags must be Need at least one tag (was [])' },
    ])
  })

  it('invalid: out-of-bounds', () => {
    const result = ErrUser({ name: '123', age: 200, tags: ['a', 'b', 'c', 'd', 'e', 'f'] })
    expect(issues(result)).toStrictEqual([
      { path: ['age'], code: 'predicate', message: 'age must be Age too large (was 200)' },
      {
        path: ['name'],
        code: 'predicate',
        message: 'name must be Only alphabetic characters (was "123")',
      },
      {
        path: ['tags'],
        code: 'predicate',
        message: 'tags must be Too many tags (was ["a","b","c","d","e","f"])',
      },
    ])
  })
})

describe('allof', () => {
  it('valid', () => {
    const result = AllofCombined({ name: 'x', age: 1 })
    expect(result).toStrictEqual({ name: 'x', age: 1 })
  })

  it('invalid: missing one branch', () => {
    const result = AllofCombined({ name: 'x' })
    expect(issues(result)).toStrictEqual([
      { path: ['age'], code: 'required', message: 'age must be a number (was missing)' },
    ])
  })
})

describe('allof-keyword', () => {
  it('keeps a minimum folded onto the integer', () => {
    expect(Bounded(5)).toBe(5)
    expect(Bounded(3)).toBeInstanceOf(type.errors)
    expect(Bounded(5.5)).toBeInstanceOf(type.errors)
  })
})

describe('pattern, bigint not and header arrays', () => {
  it('treats a braced hex escape as a unicode range', () => {
    expect(Metadata('あ')).toBe('あ')
  })

  it('rejects the bigint 0 excluded by not.enum', () => {
    expect(Amount(0)).toBeInstanceOf(type.errors)
    expect(Amount(1)).toBe(1n)
  })

  it('splits a header array on commas before reading integers', () => {
    expect(Headers({ 'x-ids': '1,2,3' })).toStrictEqual({ 'x-ids': [1, 2, 3] })
    expect(Headers({ 'x-ids': '007' })).toBeInstanceOf(type.errors)
  })
})

describe('allof-message', () => {
  it('valid', () => {
    const result = AllofMessageMerged({ name: 'taro', age: 1 })
    expect(result).toStrictEqual({ name: 'taro', age: 1 })
  })

  it('invalid: aggregated x-allOf-message', () => {
    const result = AllofMessageMerged({ name: 'ab', age: -1 })
    expect(issues(result)).toStrictEqual([
      { path: ['age'], code: 'predicate', message: 'merged validation failed' },
      { path: ['name'], code: 'predicate', message: 'merged validation failed' },
    ])
  })
})

describe('anyof', () => {
  it('valid: string', () => {
    const result = AnyofStringOrNumber('hello')
    expect(result).toBe('hello')
  })

  it('valid: number', () => {
    const result = AnyofStringOrNumber(42)
    expect(result).toBe(42)
  })

  it('invalid: boolean', () => {
    const result = AnyofStringOrNumber(true)
    expect(issues(result)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be a number or a string (was boolean)',
      },
    ])
  })
})

describe('oneof', () => {
  it('valid: circle', () => {
    const result = OneofShape({ kind: 'circle', radius: 5 })
    expect(result).toStrictEqual({ kind: 'circle', radius: 5 })
  })

  it('valid: rectangle', () => {
    const result = OneofShape({ kind: 'rectangle', width: 1, height: 2 })
    expect(result).toStrictEqual({ kind: 'rectangle', width: 1, height: 2 })
  })

  it('invalid: unknown discriminator', () => {
    const result = OneofShape({ kind: 'triangle' })
    expect(issues(result)).toStrictEqual([
      {
        path: ['kind'],
        code: 'predicate',
        message: 'kind must be "rectangle" or "circle" (was "triangle")',
      },
    ])
  })

  it('invalid: missing branch field', () => {
    const result = OneofShape({ kind: 'circle' })
    expect(issues(result)).toStrictEqual([
      { path: ['radius'], code: 'required', message: 'radius must be a number (was missing)' },
    ])
  })
})

describe('additional-properties', () => {
  it('valid', () => {
    const result = AdditionalConfig({ a: 'hello', b: 'world' })
    expect(result).toStrictEqual({ a: 'hello', b: 'world' })
  })

  it('invalid: non-string value', () => {
    const result = AdditionalConfig({ a: 1 })
    expect(issues(result)).toStrictEqual([
      { path: ['a'], code: 'domain', message: 'a must be a string (was a number)' },
    ])
  })
})

describe('nested', () => {
  it('valid', () => {
    const result = NestedOrder({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
    expect(result).toStrictEqual({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
  })

  it('invalid: nested errors', () => {
    const result = NestedOrder({
      id: 1.5,
      customer: { name: '', email: 'x' },
      items: [],
      status: 'unknown',
    })
    expect(issues(result)).toStrictEqual([
      {
        path: ['customer', 'email'],
        code: 'pattern',
        message: 'customer.email must be an email address (was "x")',
      },
      {
        path: ['customer', 'name'],
        code: 'predicate',
        message: 'customer.name must be at least 1 character (was "")',
      },
      { path: ['id'], code: 'divisor', message: 'id must be an integer (was 1.5)' },
      {
        path: ['status'],
        code: 'predicate',
        message:
          'status must be "confirmed", "delivered", "pending" or "shipped" (was "unknown")',
      },
    ])
  })
})

describe('brand', () => {
  it('valid', () => {
    const result = BrandedTypes({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['x'],
      name: 'foo',
    })
    expect(result).toStrictEqual({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['x'],
      name: 'foo',
    })
  })

  it('invalid: multiple branded field errors', () => {
    const result = BrandedTypes({
      userId: 'not-uuid',
      email: 'bad',
      price: -1,
      quantity: -1,
      tags: [],
      name: 1,
    })
    expect(issues(result)).toStrictEqual([
      { path: ['email'], code: 'pattern', message: 'email must be an email address (was "bad")' },
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      { path: ['price'], code: 'min', message: 'price must be non-negative (was -1)' },
      { path: ['quantity'], code: 'min', message: 'quantity must be non-negative (was -1)' },
      { path: ['tags'], code: 'minLength', message: 'tags must be non-empty' },
      { path: ['userId'], code: 'pattern', message: 'userId must be a UUID (was "not-uuid")' },
    ])
  })
})

describe('$defs', () => {
  it('valid', () => {
    const result = DefsUser({ name: 'taro', address: { street: 's', city: 'c' } })
    expect(result).toStrictEqual({ name: 'taro', address: { street: 's', city: 'c' } })
  })

  it('invalid: nested ref errors', () => {
    const result = DefsUser({ name: 1, address: { street: 1 } })
    expect(issues(result)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      {
        path: ['address', 'city'],
        code: 'required',
        message: 'address.city must be a string (was missing)',
      },
      {
        path: ['address', 'street'],
        code: 'domain',
        message: 'address.street must be a string (was a number)',
      },
    ])
  })
})

describe('circular', () => {
  it('valid', () => {
    const result = CircularA({ b: { a: {} } })
    expect(result).toStrictEqual({ b: { a: {} } })
  })

  it('invalid: deep wrong type', () => {
    const result = CircularA({ b: { a: { b: 'wrong' } } })
    expect(issues(result)).toStrictEqual([
      {
        path: ['b', 'a', 'b'],
        code: 'domain',
        message: 'b.a.b must be an object (was a string)',
      },
    ])
  })
})

describe('definitions', () => {
  it('valid', () => {
    const result = DefinitionsA({ b: { c: 'hello' } })
    expect(result).toStrictEqual({ b: { c: 'hello' } })
  })

  it('invalid: nested ref chain error', () => {
    const result = DefinitionsA({ b: { c: 1 } })
    expect(issues(result)).toStrictEqual([
      { path: ['b', 'c'], code: 'domain', message: 'b.c must be a string (was a number)' },
    ])
  })
})

describe('not', () => {
  it('valid: non-string', () => {
    const result = NotString(42)
    expect(result).toBe(42)
  })

  it('invalid: a string', () => {
    const result = NotString('hello')
    expect(issues(result)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be Must not be a string (was "hello")',
      },
    ])
  })
})

describe('readonly', () => {
  it('valid', () => {
    const result = ReadonlyConfig({ name: 'foo', tags: ['x'] })
    expect(result).toStrictEqual({ name: 'foo', tags: ['x'] })
  })

  it('invalid: wrong types', () => {
    const result = ReadonlyConfig({ name: 1, tags: [1] })
    expect(issues(result)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      {
        path: ['tags', 0],
        code: 'domain',
        message: 'tags[0] must be a string (was a number)',
      },
    ])
  })
})

describe('split-refs', () => {
  it('valid', () => {
    const result = SplitRefsUser({ name: 'taro', address: { street: 's', city: 'c' } })
    expect(result).toStrictEqual({ name: 'taro', address: { street: 's', city: 'c' } })
  })

  it('invalid: nested ref errors', () => {
    const result = SplitRefsUser({ name: 1, address: { street: 1, city: 1 } })
    expect(issues(result)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      {
        path: ['address', 'city'],
        code: 'domain',
        message: 'address.city must be a string (was a number)',
      },
      {
        path: ['address', 'street'],
        code: 'domain',
        message: 'address.street must be a string (was a number)',
      },
    ])
  })
})

describe('split-nested', () => {
  it('valid', () => {
    const result = SplitNestedOrder({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(result).toStrictEqual({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
  })

  it('invalid: nested errors with enum', () => {
    const result = SplitNestedOrder({
      id: 1.5,
      customer: { name: 1, email: 'x' },
      status: 'bad',
    })
    expect(issues(result)).toStrictEqual([
      {
        path: ['customer', 'email'],
        code: 'pattern',
        message: 'customer.email must be an email address (was "x")',
      },
      {
        path: ['customer', 'name'],
        code: 'domain',
        message: 'customer.name must be a string (was a number)',
      },
      { path: ['id'], code: 'divisor', message: 'id must be an integer (was 1.5)' },
      {
        path: ['status'],
        code: 'predicate',
        message: 'status must be "delivered", "pending" or "shipped" (was "bad")',
      },
    ])
  })
})

describe('meta', () => {
  it('valid', () => {
    const result = MetaUser({ id: 1, email: 'a@b.com' })
    expect(result).toStrictEqual({ id: 1, email: 'a@b.com' })
  })

  it('invalid: description-overridden messages', () => {
    const result = MetaUser({ id: 1.5, email: 'bad' })
    expect(issues(result)).toStrictEqual([
      { path: ['email'], code: 'pattern', message: 'email must be email address (was "bad")' },
      { path: ['id'], code: 'divisor', message: 'id must be unique id (was 1.5)' },
    ])
  })
})

describe('discriminated-union', () => {
  it('valid: cat', () => {
    const result = Animal({ kind: 'cat', meow: true })
    expect(result).toStrictEqual({ kind: 'cat', meow: true })
  })

  it('valid: dog', () => {
    const result = Animal({ kind: 'dog', bark: false })
    expect(result).toStrictEqual({ kind: 'dog', bark: false })
  })

  it('invalid: unknown discriminator', () => {
    const result = Animal({ kind: 'fish', meow: true })
    expect(issues(result)).toStrictEqual([
      {
        path: ['kind'],
        code: 'predicate',
        message: 'kind must be "dog" or "cat" (was "fish")',
      },
    ])
  })

  it('invalid: missing branch field', () => {
    const result = Animal({ kind: 'cat' })
    expect(issues(result)).toStrictEqual([
      { path: ['meow'], code: 'required', message: 'meow must be boolean (was missing)' },
    ])
  })
})

describe('prefix-items-unevaluated', () => {
  it('valid', () => {
    const result = Tuple(['hello', true])
    expect(result).toStrictEqual(['hello', true])
  })

  it('invalid: too short', () => {
    const result = Tuple(['x'])
    expect(issues(result)).toStrictEqual([
      { path: [], code: 'minLength', message: 'must be at least length 2 (was 1)' },
    ])
  })

  it('invalid: wrong element types', () => {
    const result = Tuple([1, 'x'])
    expect(issues(result)).toStrictEqual([
      { path: [0], code: 'domain', message: 'value at [0] must be a string (was a number)' },
      { path: [1], code: 'union', message: 'value at [1] must be boolean (was "x")' },
    ])
  })
})

describe('contains-min-max', () => {
  it('valid: within range', () => {
    const result = IntList([1, 2, 3])
    expect(result).toStrictEqual([1, 2, 3])
  })

  it('invalid: too few matches', () => {
    const result = IntList([1])
    expect(issues(result)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be must contain at least 2 matching items (was [1])',
      },
    ])
  })

  it('invalid: too many matches', () => {
    const result = IntList([1, 2, 3, 4])
    expect(issues(result)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be must contain at most 3 matching items (was [1,2,3,4])',
      },
    ])
  })

  it('invalid: not array', () => {
    const result = IntList('not array' as never)
    expect(issues(result)).toStrictEqual([
      { path: [], code: 'proto', message: 'must be an array (was string)' },
    ])
  })
})

// pattern-properties: arktype generator emits `type({})` when only
// `patternProperties` is present (no `properties` / `additionalProperties: schema`).
// JSON Schema 2020-12 patternProperties without sibling `properties` is therefore
// not enforced at runtime — covered by the same gap in the Zod generator.
describe.skip('pattern-properties (skip: not enforced at runtime)', () => {
  it('skipped', () => {
    expect(PatternBag).toBeDefined()
  })
})

// content-encoding-base64: JSON Schema `contentEncoding` / `contentMediaType` are
// metadata-only annotations. ArkType generator emits a plain `string` and does not
// validate base64 payloads. Test only covers the structural type fallback.
describe('content-encoding-base64', () => {
  it('valid: any string passes', () => {
    const result = ImageBag({ image: 'iVBORw0KGgo=' })
    expect(result).toStrictEqual({ image: 'iVBORw0KGgo=' })
  })

  it('invalid: non-string image', () => {
    const result = ImageBag({ image: 1 } as never)
    expect(issues(result)).toStrictEqual([
      { path: ['image'], code: 'domain', message: 'image must be a string (was a number)' },
    ])
  })
})

// content-schema-json: same as above — `contentSchema` is annotation-only and
// the inner JSON shape is not validated by the generator.
describe('content-schema-json', () => {
  it('valid: any string passes', () => {
    const result = StyleBag({ style: 'eyJuYW1lIjoiZm9vIn0=' })
    expect(result).toStrictEqual({ style: 'eyJuYW1lIjoiZm9vIn0=' })
  })

  it('invalid: non-string style', () => {
    const result = StyleBag({ style: 1 } as never)
    expect(issues(result)).toStrictEqual([
      { path: ['style'], code: 'domain', message: 'style must be a string (was a number)' },
    ])
  })
})

describe('dependent-schemas', () => {
  it('valid: kind + feature both present', () => {
    const result = DependentRequired({ kind: 'a', feature: 'b' })
    expect(result).toStrictEqual({ kind: 'a', feature: 'b' })
  })

  it('valid: neither present', () => {
    const result = DependentRequired({})
    expect(result).toStrictEqual({})
  })

  it('invalid: kind without feature', () => {
    const result = DependentRequired({ kind: 'a' })
    expect(issues(result)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be valid according to an anonymous predicate (was {"kind":"a"})',
      },
    ])
  })
})

describe('if-then-else', () => {
  it('valid: non-JP country has no postalCode requirement', () => {
    const result = Address({ country: 'US' })
    expect(result).toStrictEqual({ country: 'US' })
  })

  it('valid: JP country with matching postalCode', () => {
    const result = Address({ country: 'JP', postalCode: '100-0001' })
    expect(result).toStrictEqual({ country: 'JP', postalCode: '100-0001' })
  })

  it('invalid: JP country missing postalCode is rejected', () => {
    const result = Address({ country: 'JP' })
    expect(result instanceof type.errors).toBe(true)
  })
})

describe('nullable-default', () => {
  it('valid: string', () => {
    const result = MaybeString('hello')
    expect(result).toBe('hello')
  })

  it('valid: null', () => {
    const result = MaybeString(null)
    expect(result).toBe(null)
  })

  it('invalid: number', () => {
    const result = MaybeString(123 as never)
    expect(issues(result)).toStrictEqual([
      { path: [], code: 'predicate', message: 'must be a string or null (was a number)' },
    ])
  })
})

describe('enum-japanese', () => {
  it('valid', () => {
    const result = Color('赤')
    expect(result).toBe('赤')
  })

  it('invalid: not in enum', () => {
    const result = Color('黒' as never)
    expect(issues(result)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be "緑", "赤" or "青" (was "黒")',
      },
    ])
  })
})

describe('deep-nested-validation', () => {
  it('valid', () => {
    const result = DeepUser({
      name: 'taro',
      email: 'a@b.com',
      address: { city: 'Tokyo', zip: '100-0001' },
    })
    expect(result).toStrictEqual({
      name: 'taro',
      email: 'a@b.com',
      address: { city: 'Tokyo', zip: '100-0001' },
    })
  })

  it('invalid: cascade across levels', () => {
    const result = DeepUser({ name: '', email: 'bad', address: { zip: 'x' } })
    expect(issues(result)).toStrictEqual([
      { path: ['email'], code: 'pattern', message: 'email must be an email address (was "bad")' },
      { path: ['name'], code: 'predicate', message: 'name must be at least 1 character (was "")' },
      {
        path: ['address', 'zip'],
        code: 'pattern',
        message: 'address.zip must be matched by ^\\d{3}-\\d{4}$ (was "x")',
      },
    ])
  })
})

// write-only-password: JSON Schema `writeOnly` is metadata-only. The generator
// does not attach `.configure({ writeOnly: true })` (would require ArkEnv["meta"]
// augmentation in consumer projects), so password is just a plain `string`.
describe('write-only-password', () => {
  it('valid', () => {
    const result = Account({ name: 'taro', password: 'secret' })
    expect(result).toStrictEqual({ name: 'taro', password: 'secret' })
  })

  it('invalid: wrong types', () => {
    const result = Account({ name: 1 } as never)
    expect(issues(result)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
    ])
  })
})

describe('length-message', () => {
  it('valid', () => {
    const result = LengthMessageCode({ code: 'abcdef' })
    expect(result).toStrictEqual({ code: 'abcdef' })
  })

  it('invalid: empty code returns x-length-message via narrow + ctx.mustBe', () => {
    const result = LengthMessageCode({ code: '' })
    expect(issues(result)).toStrictEqual([
      {
        path: ['code'],
        code: 'predicate',
        message: 'code must be Code must be exactly 6 characters (was "")',
      },
    ])
  })
})

describe('scope-metadata (descriptions and intersections inside a scope)', () => {
  it('valid: nested members, parent and audited intersection', () => {
    const result = ScopeMetadataOrganization({
      name: 'acme',
      members: [{ userId: '00000000-0000-4000-8000-000000000000' }],
      parent: { name: 'holding' },
      audited: { userId: '00000000-0000-4000-8000-000000000001', note: 'ok' },
    })
    expect(result).toStrictEqual({
      name: 'acme',
      members: [{ userId: '00000000-0000-4000-8000-000000000000' }],
      parent: { name: 'holding' },
      audited: { userId: '00000000-0000-4000-8000-000000000001', note: 'ok' },
    })
  })

  it('valid: only the required name', () => {
    expect(ScopeMetadataOrganization({ name: 'acme' })).toStrictEqual({ name: 'acme' })
  })

  it('invalid: minItems on an alias array is enforced', () => {
    expect(issues(ScopeMetadataOrganization({ name: 'acme', members: [] }))).toStrictEqual([
      {
        path: ['members'],
        code: 'minLength',
        message: 'members must be The members of the organization.',
      },
    ])
  })

  it('invalid: a recursive alias reference is still validated', () => {
    expect(
      issues(ScopeMetadataOrganization({ name: 'acme', parent: { name: 1 } as never })),
    ).toStrictEqual([
      { path: ['parent', 'name'], code: 'domain', message: 'parent.name must be The organization name. (was a number)' },
    ])
  })

  it('invalid: the allOf intersection still requires the referenced member fields', () => {
    expect(
      issues(ScopeMetadataOrganization({ name: 'acme', audited: { note: 'ok' } as never })),
    ).toStrictEqual([
      { path: ['audited', 'userId'], code: 'required', message: "audited.userId must be a string or The user's id. (was missing)" },
    ])
  })
})

describe('wire-query', () => {
  it('coerces every parameter from its text', () => {
    expect(
      WireQuery({
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
    expect(WireQuery({ page: '1' })).toStrictEqual({ page: 1 })
  })

  it('reads the boolean spellings z.stringbool() reads', () => {
    expect(WireQuery({ page: '1', flag: 'yes' })).toStrictEqual({ page: 1, flag: true })
    expect(WireQuery({ page: '1', active: 'YES' })).toStrictEqual({ page: 1, active: true })
  })

  it('reads the JavaScript number grammar and refuses what is not finite', () => {
    expect(WireQuery({ page: '1', offset: '1e3' })).toStrictEqual({ page: 1, offset: 1000 })
    expect(WireQuery({ page: '007', skip: '1.0' })).toBeInstanceOf(type.errors)
    expect(WireQuery({ page: '1', offset: '1e309' })).toBeInstanceOf(type.errors)
    expect(WireQuery({ page: '1', skip: '1.5' })).toBeInstanceOf(type.errors)
    expect(WireQuery({ page: '1', skip: '1e3' })).toBeInstanceOf(type.errors)
    expect(WireQuery({ page: '1', offset: '0x10' })).toBeInstanceOf(type.errors)
  })

  it('reports a bad array element at its index', () => {
    expect(issues(WireQuery({ page: '1', ids: ['1', 'x'] })).map((e) => e.path)).toStrictEqual([
      ['ids', 1],
    ])
  })

  it.each([
    [{ sort: '2' }, ['sort']],
    [{ active: 'false' }, ['active']],
    [{ offset: '-1' }, ['offset']],
    [{ skip: '0' }, ['skip']],
    [{ skip: 'abc' }, ['skip']],
    [{ cursor: '-1' }, ['cursor']],
  ])('rejects %o at %j', (input, path) => {
    expect(issues(WireQuery({ page: '1', ...input })).map((e) => e.path)).toStrictEqual([path])
  })
})

describe('parameter serialization', () => {
  it('splits a non-exploded form array', () => {
    expect(ParamFormNoExplodeIds('1,2,3')).toStrictEqual([1, 2, 3])
    expect(ParamFormNoExplodeIds('')).toBeInstanceOf(type.errors)
  })

  it('gathers a deepObject parameter', () => {
    expect(ParamDeepObjectFilter({ 'deep[age]': '5', 'deep[name]': 'bob' })).toStrictEqual({
      age: 5,
      name: 'bob',
    })
  })

  it('parses a JSON content parameter without coercing it', () => {
    expect(ParamJsonContentPayload('{"id":1,"tags":["a"]}')).toStrictEqual({ id: 1, tags: ['a'] })
    expect(ParamJsonContentPayload('{"id":"1"}')).toBeInstanceOf(type.errors)
  })
})

describe('string-formats', () => {
  it('reads int64 / uint64 from a JSON number or a string of digits', () => {
    expect(
      StringFormats({ id: 9007199254740991, size: '18446744073709551615', kind: '2' }),
    ).toStrictEqual({ id: 9007199254740991n, size: 18446744073709551615n, kind: 2n })
  })

  it.each([
    ['at', '2025-01-01T00:00:00+09:00'],
    ['time', '12:34:56+09:00'],
    ['guid', '00000000-0000-0000-0000-000000000000'],
    ['site', 'https://example.com'],
    ['card', '4111111111111111'],
  ])('accepts %s %j', (key, value) => {
    expect(StringFormats({ [key]: value })).toStrictEqual({ [key]: value })
  })

  it.each([
    ['id', 1.5],
    ['id', '1.5'],
    ['kind', 3],
    ['at', '2020-01-02'],
    ['time', '25:00'],
    ['guid', 'a1b2c3d4e5f69a7b0c9d0e1f2a3b4c5d'],
    ['site', 'ftp://example.com'],
    ['card', '4111111111111112'],
  ])('rejects %s %j', (key, value) => {
    expect(StringFormats({ [key]: value })).toBeInstanceOf(type.errors)
  })

  it('trims before the format check', () => {
    expect(StringFormats({ slug: ' a ', email: ' a@b.co ' })).toStrictEqual({
      slug: 'a',
      email: 'a@b.co',
    })
  })
})

describe('string length counts code points', () => {
  it('counts an astral character once', () => {
    expect(LengthMessageCode({ code: '🔥🔥🔥🔥🔥🔥' })).toStrictEqual({ code: '🔥🔥🔥🔥🔥🔥' })
    expect(LengthMessageCode({ code: '🔥🔥🔥' })).toBeInstanceOf(type.errors)
  })
})
