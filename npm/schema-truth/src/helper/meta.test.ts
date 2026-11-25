import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import {
  arktypeWrap,
  effectWrap,
  serializeJSValue,
  typeboxDefaultOpt,
  typeboxMetaOpts,
  typeboxWrap,
  valibotWrap,
  zodWrap,
} from './index.js'

describe('serializeJSValue', () => {
  it.concurrent.each<[unknown, string]>([
    [undefined, 'undefined'],
    [null, 'null'],
    ['hello', '"hello"'],
    [42, '42'],
    [true, 'true'],
    [[1, 2, 3], '[1,2,3]'],
    [{ a: 1, b: 2 }, '{a:1,b:2}'],
    [{ 'with-dash': 1 }, '{"with-dash":1}'],
    [{ a: { b: 'nested' } }, '{a:{b:"nested"}}'],
    [{ a: undefined, b: 1 }, '{b:1}'],
  ])('serializeJSValue(%o) → %s', (input, expected) => {
    expect(serializeJSValue(input)).toBe(expected)
  })
})

describe('zodWrap with metadata', () => {
  it('emits .meta({description}) for description only', () => {
    expect(zodWrap('z.string()', { description: 'an email' })).toBe(
      'z.string().meta({description:"an email"})',
    )
  })

  it('emits .meta() for examples / deprecated / readOnly', () => {
    expect(
      zodWrap('z.number()', {
        examples: [1, 2],
        deprecated: true,
        readOnly: true,
      } satisfies JSONSchema),
    ).toBe('z.number().meta({examples:[1,2],deprecated:true,readOnly:true})')
  })

  it('consolidates description and other meta into a single .meta()', () => {
    expect(
      zodWrap('z.string()', {
        description: 'name',
        examples: ['Alice'],
      } satisfies JSONSchema),
    ).toBe('z.string().meta({description:"name",examples:["Alice"]})')
  })

  it('normalizes singular example into examples array', () => {
    expect(zodWrap('z.string()', { example: 'foo' } satisfies JSONSchema)).toBe(
      'z.string().meta({examples:["foo"]})',
    )
  })

  it('combines default + nullable + brand + meta', () => {
    expect(
      zodWrap('z.string()', {
        default: 'foo',
        nullable: true,
        'x-brand': 'UserId',
        description: 'a branded string',
      } satisfies JSONSchema),
    ).toBe(
      'z.string().nullable().default("foo").brand<"UserId">().meta({description:"a branded string"})',
    )
  })
})

describe('valibotWrap with metadata', () => {
  it('emits v.description in pipe', () => {
    expect(valibotWrap('v.string()', { description: 'name' })).toBe(
      'v.pipe(v.string(),v.description("name"))',
    )
  })

  it('emits v.metadata for non-description fields', () => {
    expect(
      valibotWrap('v.number()', {
        examples: [1, 2],
        deprecated: true,
      } satisfies JSONSchema),
    ).toBe('v.pipe(v.number(),v.metadata({examples:[1,2],deprecated:true}))')
  })

  it('combines description + metadata + brand into one pipe', () => {
    expect(
      valibotWrap('v.string()', {
        description: 'an id',
        examples: ['abc'],
        'x-brand': 'Id',
      } satisfies JSONSchema),
    ).toBe('v.pipe(v.string(),v.description("an id"),v.metadata({examples:["abc"]}),v.brand("Id"))')
  })
})

describe('typeboxMetaOpts', () => {
  it('returns empty array when no metadata fields are present', () => {
    expect(typeboxMetaOpts({ type: 'string' })).toStrictEqual([])
  })

  it('emits description, examples, deprecated, externalDocs, readOnly, writeOnly entries', () => {
    expect(
      typeboxMetaOpts({
        description: 'age',
        examples: [10, 20],
        deprecated: true,
        externalDocs: { url: 'https://ex.com' },
        readOnly: true,
        writeOnly: false,
      } satisfies JSONSchema),
    ).toStrictEqual([
      'description:"age"',
      'examples:[10,20]',
      'deprecated:true',
      'externalDocs:{url:"https://ex.com"}',
      'readOnly:true',
      'writeOnly:false',
    ])
  })

  it('normalizes singular example into examples array', () => {
    expect(typeboxMetaOpts({ example: 'foo' } satisfies JSONSchema)).toStrictEqual([
      'examples:["foo"]',
    ])
  })

  it('puts a host ref first when one is supplied', () => {
    expect(typeboxMetaOpts({ description: 'd' }, 'X')).toStrictEqual(['ref:"X"', 'description:"d"'])
  })

  it('returns only the ref entry when the schema has no metadata', () => {
    expect(typeboxMetaOpts({ type: 'string' }, 'Name')).toStrictEqual(['ref:"Name"'])
  })
})

describe('typeboxWrap (default/nullable only)', () => {
  it('passes through unchanged when no default or nullable', () => {
    expect(typeboxWrap('Type.String()', { description: 'name' })).toBe('Type.String()')
  })

  it('marks Type.Optional when default is set (default value lives on the inner type)', () => {
    // TypeBox v1's `Type.Optional` takes one arg; the default itself is baked into
    // the wrapped type's options by the factory (`typeboxDefaultOpt`), so the wrap
    // only marks the property optional.
    expect(
      typeboxWrap('Type.String({default:"foo"})', { default: 'foo' } satisfies JSONSchema),
    ).toBe('Type.Optional(Type.String({default:"foo"}))')
  })

  it('wraps with Type.Union([..., Type.Null()]) when nullable', () => {
    expect(typeboxWrap('Type.String()', { nullable: true } satisfies JSONSchema)).toBe(
      'Type.Union([Type.String(),Type.Null()])',
    )
  })
})

describe('effectWrap with metadata', () => {
  it('emits .annotate() for description', () => {
    expect(effectWrap('Schema.String', { description: 'a name' })).toBe(
      'Schema.String.annotate({description:"a name"})',
    )
  })

  it('keeps readOnly / writeOnly native and routes the rest under jsonSchema* keys', () => {
    expect(
      effectWrap('Schema.Number', {
        deprecated: true,
        externalDocs: { url: 'https://ex.com' },
        readOnly: true,
      } satisfies JSONSchema),
    ).toBe(
      'Schema.Number.annotate({jsonSchemaDeprecated:true,jsonSchemaExternalDocs:{url:"https://ex.com"},readOnly:true})',
    )
  })

  it('routes examples through a loose key, not Effect native examples', () => {
    expect(effectWrap('Schema.String', { example: 'foo' })).toBe(
      'Schema.String.annotate({jsonSchemaExamples:["foo"]})',
    )
  })

  it('keeps description native and examples loose when both present', () => {
    expect(
      effectWrap('Schema.String', { description: 'a name', example: 'foo' } satisfies JSONSchema),
    ).toBe('Schema.String.annotate({description:"a name",jsonSchemaExamples:["foo"]})')
  })

  it('routes an incomplete object example loosely so generation does not type-check it', () => {
    // A spec example missing a required field must not break the generated Struct
    // (OpenAPI examples are loose doc metadata; Effect's native `examples` is
    // typed `ReadonlyArray<T>` and would type-check them against the struct).
    expect(
      effectWrap('Schema.Struct({a:Schema.String})', { example: {} } satisfies JSONSchema),
    ).toBe('Schema.Struct({a:Schema.String}).annotate({jsonSchemaExamples:[{}]})')
  })
})

describe('arktypeWrap with metadata', () => {
  it('emits .describe() for description', () => {
    expect(arktypeWrap('type({name:"string"})', { description: 'a user' })).toBe(
      'type({name:"string"}).describe("a user")',
    )
  })

  it('wraps quoted string with type() before .describe()', () => {
    expect(arktypeWrap('"string"', { description: 'a name' })).toBe(
      'type("string").describe("a name")',
    )
  })

  it('does not emit non-description fields (arktype meta requires ArkEnv augmentation)', () => {
    expect(
      arktypeWrap('type({name:"string"})', {
        examples: ['Alice'],
        deprecated: true,
      } satisfies JSONSchema),
    ).toBe('type({name:"string"})')
  })
})

describe('a 64-bit or bigint default', () => {
  const definitions = {
    Big: { type: 'integer', format: 'bigint' },
    Long: { type: 'integer', format: 'int64' },
    Level: { type: 'integer', format: 'bigint', enum: [1, 2] },
  } satisfies { [name: string]: JSONSchema }
  const long = { type: 'integer', format: 'int64', default: 1e21 } satisfies JSONSchema
  const big = { $ref: '#/$defs/Big', default: 5 } satisfies JSONSchema
  const level = { $ref: '#/$defs/Level', default: 1 } satisfies JSONSchema
  const allOf = { allOf: [{ $ref: '#/$defs/Long' }], default: 7 } satisfies JSONSchema
  it('zodWrap', () => {
    expect(zodWrap('S', long)).toBe('S.default(1000000000000000000000n)')
    expect(zodWrap('S', big, { definitions })).toBe('S.default(BigInt(5))')
    expect(zodWrap('S', allOf, { definitions })).toBe('S.default(7n)')
    expect(zodWrap('S', level, { definitions })).toBe('S.default(1)')
    expect(
      zodWrap(
        'S',
        { type: 'number', allOf: [{ $ref: '#/$defs/Big' }], default: 1.5 },
        { definitions },
      ),
    ).toBe('S')
    expect(zodWrap('S', { type: 'number', format: 'int64', default: 5 })).toBe('S.default(5)')
    expect(zodWrap('S', { type: 'number', format: 'int64', default: 1.5 })).toBe('S.default(1.5)')
  })
  it('valibotWrap', () => {
    expect(valibotWrap('S', long)).toBe('v.optional(S,1000000000000000000000n)')
    expect(valibotWrap('S', big, { definitions })).toBe('v.optional(S,BigInt(5))')
    expect(valibotWrap('S', level, { definitions })).toBe('v.optional(S,1)')
  })
  it('effectWrap', () => {
    expect(effectWrap('S', long)).toBe(
      'S.pipe(Schema.withDecodingDefault(Effect.succeed(1000000000000000000000n)))',
    )
    expect(effectWrap('S', big, { definitions })).toBe(
      'S.pipe(Schema.withDecodingDefault(Effect.succeed(BigInt(5))))',
    )
    expect(effectWrap('S', level, { definitions })).toBe(
      'S.pipe(Schema.withDecodingDefault(Effect.succeed(1)))',
    )
  })
  it('typeboxDefaultOpt', () => {
    expect(typeboxDefaultOpt({ type: 'integer', format: 'bigint', default: 5 })).toStrictEqual([])
    expect(typeboxDefaultOpt(big, false, definitions)).toStrictEqual([])
    expect(typeboxDefaultOpt(allOf, false, definitions)).toStrictEqual(['default:7'])
    expect(typeboxDefaultOpt(level, false, definitions)).toStrictEqual(['default:1'])
    expect(typeboxDefaultOpt({ type: 'number', format: 'bigint', default: 5 })).toStrictEqual([
      'default:5',
    ])
  })

  it.each([
    [{ type: 'integer', format: 'bigint', default: 1e21 }, ['default:"1000000000000000000000"']],
    [{ type: 'integer', format: 'int64', default: -5 }, ['default:"-5"']],
    // A spec's `18446744073709551615` and `9223372036854775807` parse to these doubles.
    [{ type: 'integer', format: 'uint64', default: 2 ** 64 }, []],
    [{ type: 'integer', format: 'int64', default: 2 ** 63 }, []],
    [{ type: 'integer', format: 'uint64', default: -1 }, []],
    [{ type: 'integer', default: 1e21 }, ['default:"1e+21"']],
    [{ type: 'number', format: 'int64', default: 1e21 }, ['default:"1e+21"']],
  ] satisfies [JSONSchema, string[]][])(
    'typeboxDefaultOpt on the string wire spells a bigint default in digits (#84): %o → %o',
    (schema, expected) => {
      expect(typeboxDefaultOpt(schema, true)).toStrictEqual(expected)
    },
  )
})
