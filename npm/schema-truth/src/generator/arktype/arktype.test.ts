import { describe, expect, it } from 'vite-plus/test'

import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { arktype } from './arktype.js'

describe('arktype', () => {
  // Standalone exports (isArktype=false): cross-schema refs are value references to imported
  // consts; self-refs and unresolvable pointers stay quoted. See the scope-mode pair below.
  describe('ref (standalone)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/User' }, 'User'],
      [{ $ref: '#/components/schemas/UserProfile' }, 'UserProfile'],
      [{ $ref: '#/definitions/Item' }, 'Item'],
      [{ $ref: '#/$defs/Address' }, 'Address'],
      [{ $ref: '#' }, '"Schema"'],
      [{ $ref: '' }, '"unknown"'],
      [{ $ref: '#/components/schemas/User', nullable: true }, 'type(User).or("null")'],
      [{ type: 'array', items: { $ref: '#/components/schemas/User' } }, 'type(User).array()'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  // Scope mode (isArktype=true): refs resolve through scope({...}) as DSL keyword strings.
  describe('ref (scope)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/User' }, '"User"'],
      [{ $ref: '#/components/schemas/User', nullable: true }, '"User | null"'],
      [{ type: 'array', items: { $ref: '#/components/schemas/User' } }, '"User[]"'],
      [
        {
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        '"A | B"',
      ],
      [
        {
          allOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        '"A & B"',
      ],
    ])('arktype(%o, "Schema", true) → %s', (input, expected) => {
      expect(arktype(input, 'Schema', true)).toBe(expected)
    })
  })

  describe('oneOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
        '"string | number"',
      ],
      [
        {
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'type(A).or(B)',
      ],
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          nullable: true,
        },
        '"string | number | null"',
      ],
      [{ oneOf: [] }, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('anyOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
        '"string | number"',
      ],
      [
        {
          anyOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        },
        'type(Cat).or(Dog)',
      ],
      [
        {
          anyOf: [{ type: 'string' }, { type: 'boolean' }],
          nullable: true,
        },
        '"string | boolean | null"',
      ],
      [{ anyOf: [] }, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          allOf: [{ type: 'string' }, { type: 'number' }],
        },
        '"string & number"',
      ],
      [
        {
          allOf: [{ $ref: '#/components/schemas/A' }],
        },
        'A',
      ],
      [
        {
          allOf: [{ type: 'string' }, { type: 'number' }],
          nullable: true,
        },
        '"string & number | null"',
      ],
      [{ allOf: [] }, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('not', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { not: { type: 'string' } },
        `type("unknown").narrow((data: unknown) => typeof data !== 'string')`,
      ],
      [
        { not: { type: 'integer' } },
        `type("unknown").narrow((data: unknown) => typeof data !== 'number' || !Number.isInteger(data))`,
      ],
      [
        { not: { type: 'boolean' } },
        `type("unknown").narrow((data: unknown) => typeof data !== 'boolean')`,
      ],
      [
        { not: { type: 'string' }, nullable: true },
        `type(type("unknown").narrow((data: unknown) => typeof data !== 'string')).or("null")`,
      ],
      [
        { not: { type: 'string' }, type: ['null'] },
        `type("null | null").narrow((data: unknown) => typeof data !== 'string')`,
      ],
      [{ not: { const: 42 } }, `type("unknown").narrow((data: unknown) => data !== 42)`],
      [
        { not: { enum: ['a', 'b'] } },
        `type("unknown").narrow((data: unknown) => !["a","b"].includes(data as never))`,
      ],
      [
        { type: 'integer', format: 'int64', not: { enum: [0] } },
        'type("bigint | number.integer").or(/^-?\\d+$/).pipe((data) => BigInt(data)).narrow((data, ctx) => (data >= -9223372036854775808n && data <= 9223372036854775807n) || ctx.mustBe("an int64")).narrow((data: unknown) => ![0n].includes(data as never))',
      ],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' }, '"\'fixed\'"'],
      [{ const: 42 }, '"42"'],
      [{ const: true }, '"true"'],
      [{ const: 'fixed', nullable: true }, '"\'fixed\' | null"'],
      [{ const: { a: 1 } }, '"unknown"'],
      [{ const: [1, 2] }, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: ['A', 'B', 'C'] }, "\"'A' | 'B' | 'C'\""],
      [{ enum: ['A', 'B'], nullable: true }, "\"'A' | 'B' | null\""],
      [{ enum: [1, 2, 3] }, '"1 | 2 | 3"'],
      [{ enum: [true, false] }, '"true | false"'],
      [{ enum: ['only'] }, '"\'only\'"'],
      [{ enum: [null] }, '"null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' }, '"string"'],
      [{ type: 'string', nullable: true }, '"string | null"'],
      [{ type: ['string', 'null'] }, '"string | null"'],
      [{ type: 'string', format: 'email' }, '"string.email"'],
      [{ type: 'string', format: 'uuid' }, '"string.uuid"'],
      [{ type: 'string', format: 'uri' }, '"string.url"'],
      [{ type: 'string', format: 'ipv4' }, '"string.ip.v4"'],
      [{ type: 'string', format: 'ipv6' }, '"string.ip.v6"'],
      [
        { type: 'string', format: 'date-time' },
        'type(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/)',
      ],
      [
        { type: 'string', format: 'date' },
        'type(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/)',
      ],
      [
        { type: 'string', minLength: 1 },
        'type("string").narrow((data, ctx) => [...data].length >= 1 || ctx.mustBe("at least 1 character"))',
      ],
      [
        { type: 'string', maxLength: 100 },
        'type("string").narrow((data, ctx) => [...data].length <= 100 || ctx.mustBe("at most 100 characters"))',
      ],
      [
        { type: 'string', minLength: 3, maxLength: 20 },
        'type("string").narrow((data, ctx) => [...data].length >= 3 || ctx.mustBe("at least 3 characters")).narrow((data, ctx) => [...data].length <= 20 || ctx.mustBe("at most 20 characters"))',
      ],
      [
        { type: 'string', minLength: 5, maxLength: 5 },
        'type("string").narrow((data, ctx) => [...data].length === 5 || ctx.mustBe("exactly 5 characters"))',
      ],
      [{ type: 'string', pattern: '^\\w+$' }, 'type("string").and(/^\\w+$/)'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('number', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number' }, '"number"'],
      [{ type: 'number', nullable: true }, '"number | null"'],
      [{ type: ['number', 'null'] }, '"number | null"'],
      [{ type: 'number', minimum: 0 }, '"number >= 0"'],
      [{ type: 'number', maximum: 100 }, '"number <= 100"'],
      [{ type: 'number', minimum: 0, maximum: 100 }, '"number >= 0 & number <= 100"'],
      [{ type: 'number', exclusiveMinimum: 0 }, '"number > 0"'],
      [{ type: 'number', exclusiveMaximum: 100 }, '"number < 100"'],
      [{ type: 'number', multipleOf: 2 }, '"number % 2"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' }, '"number.integer"'],
      [{ type: 'integer', nullable: true }, '"number.integer | null"'],
      [{ type: ['integer', 'null'] }, '"number.integer | null"'],
      [{ type: 'integer', minimum: 0 }, '"number.integer >= 0"'],
      [{ type: 'integer', maximum: 100 }, '"number.integer <= 100"'],
      [{ type: 'integer', exclusiveMinimum: 0 }, '"number.integer > 0"'],
      [{ type: 'integer', exclusiveMaximum: 100 }, '"number.integer < 100"'],
      [{ type: 'integer', multipleOf: 5 }, '"number.integer % 5"'],
      [{ type: 'integer', format: 'bigint' }, '"bigint"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' }, '"boolean"'],
      [{ type: 'boolean', nullable: true }, '"boolean | null"'],
      [{ type: ['boolean', 'null'] }, '"boolean | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'array', items: { type: 'string' } }, '"string[]"'],
      [{ type: 'array', items: { type: 'number' } }, '"number[]"'],
      [{ type: 'array', items: { type: 'boolean' } }, '"boolean[]"'],
      [
        {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        },
        '"string[] | null"',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        },
        'type("string[]").and(type("unknown[] >= 1"))',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
        },
        'type("string[]").and(type("unknown[] <= 10"))',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
        },
        'type("string[]").and(type("1 <= unknown[] <= 10"))',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 5,
          maxItems: 5,
        },
        'type("string[]").and(type("unknown[] == 5"))',
      ],
      [{ type: 'array' }, '"unknown[]"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' }, 'type({})'],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        'type({name:"string"})',
      ],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        'type({"name?":"string"})',
      ],
      [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name'],
        },
        'type({name:"string","age?":"number.integer"})',
      ],
      [
        {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test'],
          additionalProperties: false,
        },
        'type({test:"string","+":"reject"})',
      ],
      [
        {
          type: 'object',
          properties: {
            kind: { const: 'A' },
          },
          required: ['kind'],
        },
        'type({kind:"\'A\'"})',
      ],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'date' }, '"Date"'],
      [{ type: 'date', nullable: true }, '"Date | null"'],
      [{ type: ['date', 'null'] }, '"Date | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' }, '"null | null"'],
      [{ type: 'null', nullable: true }, '"null | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('unknown (fallback)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{}, '"unknown"'],
      [{ nullable: true }, '"unknown | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('openapi', () => {
    describe('ref with openapi option', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/User' }, 'UserSchema'],
        [{ $ref: '#/components/schemas/user-profile' }, 'UserProfileSchema'],
        [{ $ref: '#/components/parameters/UserId' }, 'UserIdParamsSchema'],
        [{ $ref: '#/components/headers/X-Request-Id' }, 'XRequestIdHeaderSchema'],
        [{ $ref: '#/components/responses/NotFound' }, 'NotFoundResponse'],
        [{ $ref: '#/components/securitySchemes/Bearer' }, 'BearerSecurityScheme'],
        [{ $ref: '#/components/requestBodies/CreateUser' }, 'CreateUserRequestBody'],
        [{ $ref: '#/definitions/Address' }, 'Address'],
        [{ $ref: '#/$defs/Address' }, 'Address'],
      ])('arktype(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(arktype(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('object with openapi refs', () => {
      it('should resolve $ref in object properties with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          type: 'object',
          properties: {
            pet: { $ref: '#/components/schemas/Pet' },
          },
          required: ['pet'],
        }
        expect(arktype(schema, 'Schema', false, { openapi: true })).toBe('type({pet:PetSchema})')
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(arktype(schema, 'Schema', false, { openapi: true })).toBe(
          'type(CatSchema).or(DogSchema)',
        )
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName → stays quoted to avoid a TDZ on the const
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', '"UserSchema"'],
        // Nullable cross-ref with openapi
        [
          { $ref: '#/components/schemas/Pet', nullable: true },
          'TestSchema',
          'type(PetSchema).or("null")',
        ],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', 'BaseSchema'],
        // anyOf with openapi ref and inline — mixed union keeps the inline part quoted
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          'type(ASchema).or("string")',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', 'MySchemaSchema'],
      ])('arktype(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(arktype(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef) — cross-ref, value reference in standalone
      [{ $ref: '#SomeRef' }, 'SomeRef'],
      // External file or URL without fragment → unknown
      [{ $ref: 'other.json#/definitions/Foo' }, '"unknown"'],
      [{ $ref: 'https://example.com/schemas/User.json' }, '"unknown"'],
      [{ $ref: 'relative/path' }, '"unknown"'],
      // Self reference #
      [{ $ref: '#' }, '"Schema"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(arktype({ oneOf: [] })).toBe('"unknown"')
    })

    it('should handle empty anyOf', () => {
      expect(arktype({ anyOf: [] })).toBe('"unknown"')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle nullable via type array with null', () => {
      expect(arktype({ type: ['string', 'null'] })).toBe('"string | null"')
    })
  })

  describe('readonly option', () => {
    it('should add .readonly() to object', () => {
      expect(
        arktype(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: true },
        ),
      ).toBe('type({name:"string"}).readonly()')
    })

    it('should not add .readonly() to string', () => {
      expect(arktype({ type: 'string' }, 'Schema', false, { readonly: true })).toBe('"string"')
    })
  })

  describe('code-emitting extensions (unsafeCodeExtensions)', () => {
    const unsafe = { unsafeCodeExtensions: true }

    it('appends x-narrow chain after type literal', () => {
      expect(
        arktype(
          { type: 'string', 'x-narrow': '.narrow((data) => data.length > 0)' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('type("string").narrow((data) => data.length > 0)')
    })

    it('silently ignores x-narrow when flag is not set', () => {
      expect(arktype({ type: 'string', 'x-narrow': '.narrow((data) => data.length > 0)' })).toBe(
        '"string"',
      )
    })

    it('silently ignores denylisted code', () => {
      expect(
        arktype(
          { type: 'string', 'x-narrow': '.narrow(() => eval("x"))' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('"string"')
    })
  })

  describe('x-brand', () => {
    it('should add .brand() for string', () => {
      expect(arktype({ type: 'string', 'x-brand': 'UserId' })).toBe(
        'type("string").brand("UserId")',
      )
    })

    it('should add .brand() for number with constraints', () => {
      expect(arktype({ type: 'number', minimum: 0, 'x-brand': 'Price' })).toBe(
        'type("number >= 0").brand("Price")',
      )
    })

    it('should add .brand() after nullable', () => {
      expect(arktype({ type: 'string', nullable: true, 'x-brand': 'Email' })).toBe(
        'type("string | null").brand("Email")',
      )
    })

    it('should add .brand() for integer', () => {
      expect(arktype({ type: 'integer', minimum: 0, 'x-brand': 'Quantity' })).toBe(
        'type("number.integer >= 0").brand("Quantity")',
      )
    })

    it('should add .brand() for array', () => {
      expect(
        arktype({ type: 'array', items: { type: 'string' }, minItems: 1, 'x-brand': 'Tags' }),
      ).toBe('type("string[]").and(type("unknown[] >= 1")).brand("Tags")')
    })

    it('should add .brand() for complex type', () => {
      expect(
        arktype({
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
          'x-brand': 'User',
        }),
      ).toBe('type({name:"string"}).brand("User")')
    })
  })

  describe('x-prefixItems-message', () => {
    it('attaches .describe to the tuple type', () => {
      expect(
        arktype({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'number' }],
          'x-prefixItems-message': 'bad tuple',
        }),
      ).toBe('type(["string","number"]).describe("bad tuple")')
    })

    it('falls through to plain tuple when message is absent', () => {
      expect(
        arktype({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'number' }] }),
      ).toBe('type(["string","number"])')
    })
  })

  describe('x-items-message', () => {
    it('attaches .describe to the array type', () => {
      expect(
        arktype({ type: 'array', items: { type: 'string' }, 'x-items-message': 'bad items' }),
      ).toBe('type("string[]").describe("bad items")')
    })

    it('composes with min/max narrows', () => {
      expect(
        arktype({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-items-message': 'bad items',
        }),
      ).toBe('type("string[]").and(type("unknown[] >= 1")).describe("bad items")')
    })
  })

  describe('x-implication-message', () => {
    it('takes precedence over x-anyOf-message', () => {
      expect(
        arktype({
          anyOf: [{ type: 'string' }, { type: 'number' }],
          'x-anyOf-message': 'any',
          'x-implication-message': 'implication failed',
        }),
      ).toBe('type("string | number").describe("implication failed")')
    })
  })

  describe('paramIn coercion', () => {
    it('query: number → "string.numeric.parse"', () => {
      expect(arktype({ type: 'number' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/.test(data) ? Number(data) : Number.NaN; return Number.isFinite(value) ? value : ctx.error("a number") })',
      )
    })

    it('query: integer → "string.integer.parse"', () => {
      expect(arktype({ type: 'integer' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })',
      )
    })

    it("path: boolean → type(\"'true' | 'false'\").pipe", () => {
      expect(arktype({ type: 'boolean' }, 'Schema', false, { paramIn: 'path' })).toBe(
        `type(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i).pipe((data) => /^(?:true|1|yes|on|y|enabled)$/i.test(data))`,
      )
    })

    it('query: date → "string.date.parse"', () => {
      expect(arktype({ type: 'date' }, 'Schema', false, { paramIn: 'query' })).toBe(
        '"string.date.parse"',
      )
    })

    it('x-coerce: false overrides paramIn (user opt-out wins)', () => {
      expect(
        arktype({ type: 'number', 'x-coerce': false }, 'Schema', false, { paramIn: 'query' }),
      ).toBe('"number"')
    })

    it('query: integer with minimum → .to() constraint', () => {
      expect(arktype({ type: 'integer', minimum: 1 }, 'Schema', false, { paramIn: 'query' })).toBe(
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("number.integer >= 1")',
      )
    })

    it('query: integer with minimum+maximum → .to() constraint', () => {
      expect(
        arktype({ type: 'integer', minimum: 1, maximum: 100 }, 'Schema', false, {
          paramIn: 'query',
        }),
      ).toBe(
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("number.integer >= 1 & number.integer <= 100")',
      )
    })

    it('query: number with minimum → .to() constraint', () => {
      expect(arktype({ type: 'number', minimum: 0 }, 'Schema', false, { paramIn: 'query' })).toBe(
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/.test(data) ? Number(data) : Number.NaN; return Number.isFinite(value) ? value : ctx.error("a number") }).to("number >= 0")',
      )
    })
  })

  describe('x-unevaluatedProperties-message', () => {
    it('attaches the message to a narrow that rejects undeclared keys', () => {
      expect(
        arktype({
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          unevaluatedProperties: false,
          'x-unevaluatedProperties-message': 'no extras',
        }),
      ).toBe(
        'type({a:"string"}).narrow((data, ctx) => Object.keys(data).every((key) => ["a"].includes(key)) || ctx.mustBe("no extras"))',
      )
    })
  })

  describe('x-unevaluatedItems-message (prefixItems tuple)', () => {
    it('describes the tuple with the message when unevaluatedItems: false', () => {
      expect(
        arktype({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: false,
          'x-unevaluatedItems-message': 'no extras',
        }),
      ).toBe('type(["string","boolean"]).describe("no extras")')
    })

    it('emits a variadic tuple when unevaluatedItems is a schema', () => {
      expect(
        arktype({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: { type: 'integer' },
        }),
      ).toBe('type(["string","boolean","...","number.integer[]"])')
    })
  })

  describe('#98: shapes that threw at module load', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        // A `constructor` key in an object literal is checked against Object's own member.
        { type: 'object', properties: Object.fromEntries([['constructor', { type: 'integer' }]]) },
        { paramIn: 'query' },
        'type("object").pipe((data)=>(typeof data==="object"&&data!==null&&!Array.isArray(data)?Object.assign(Object.create(null),data):data),type({"constructor?":type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })})).pipe((data) => ({ ...data }))',
      ],
      [
        { oneOf: [{ type: 'integer' }, { type: 'string' }] },
        { paramIn: 'path' },
        'type("unknown").pipe((data, ctx) => { for (const branch of [type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }),type("string")]) { const out = branch(data); if (!(out instanceof type.errors)) return out } return ctx.error("one of the members") })',
      ],
      [
        {
          allOf: [
            { type: 'integer', minimum: 1 },
            { type: 'integer', maximum: 5 },
          ],
        },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("number.integer >= 1 & number.integer <= 5")',
      ],
      [
        { anyOf: [{ type: 'number' }, { type: 'string' }] },
        { paramIn: 'query' },
        'type("unknown").pipe((data, ctx) => { for (const branch of [type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/.test(data) ? Number(data) : Number.NaN; return Number.isFinite(value) ? value : ctx.error("a number") }),type("string")]) { const out = branch(data); if (!(out instanceof type.errors)) return out } return ctx.error("one of the members") })',
      ],
    ])('arktype(%o, %o) → %s', (schema, options, expected) => {
      expect(arktype(schema, 'Schema', false, options)).toBe(expected)
    })
  })

  describe('#103: the wire-parameter coercion of #96, and the JavaScript number grammar', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        { type: 'number' },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/.test(data) ? Number(data) : Number.NaN; return Number.isFinite(value) ? value : ctx.error("a number") })',
      ],
      [
        { type: 'integer' },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })',
      ],
      [
        { type: 'integer', minimum: 1, maximum: 100 },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("number.integer >= 1 & number.integer <= 100")',
      ],
      [
        { type: 'integer', format: 'int32' },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("number.integer >= -2147483648 & number.integer <= 2147483647")',
      ],
      [
        { type: 'number', format: 'float32' },
        undefined,
        'type("number").atLeast(-3.4028234663852886e38).atMost(3.4028234663852886e38)',
      ],
      [
        { type: 'array', items: { type: 'integer' } },
        { paramIn: 'query' },
        'type("unknown").pipe((data)=>(data===undefined||Array.isArray(data)?data:[data]),type(type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })).array())',
      ],
      [
        { type: 'array', items: { type: 'integer' }, minItems: 1 },
        { paramIn: 'query' },
        'type("unknown").pipe((data)=>(data===undefined||Array.isArray(data)?data:[data]),type(type(type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })).array()).and(type("unknown[] >= 1")))',
      ],
      [
        { type: 'integer', enum: [1, 2] },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("1 | 2")',
      ],
      [
        { type: 'boolean', const: true },
        { paramIn: 'query' },
        'type(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i).pipe((data) => /^(?:true|1|yes|on|y|enabled)$/i.test(data)).to("true")',
      ],
      [
        { type: 'boolean' },
        { paramIn: 'query' },
        'type(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i).pipe((data) => /^(?:true|1|yes|on|y|enabled)$/i.test(data))',
      ],
      [
        { type: 'integer', nullable: true },
        { paramIn: 'query' },
        'type("unknown").pipe((data)=>(data===\'null\'?null:data),type(type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })).or("null"))',
      ],
      [
        { minimum: 1 },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/.test(data) ? Number(data) : Number.NaN; return Number.isFinite(value) ? value : ctx.error("a number") }).to("number >= 1")',
      ],
      [
        { type: 'integer', not: { const: 0 } },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).narrow((data: unknown) => data !== 0)',
      ],
      [
        { type: ['integer', 'string'] },
        { paramIn: 'query' },
        'type("unknown").pipe((data, ctx) => { for (const branch of [type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }),type("string")]) { const out = branch(data); if (!(out instanceof type.errors)) return out } return ctx.error("one of the members") })',
      ],
      [{ type: ['string', 'number'] }, undefined, '"string | number"'],
      [
        { type: 'integer', format: 'int64' },
        { paramIn: 'query' },
        'type("string").pipe((data, ctx) => (/^-?\\d+$/.test(data) ? BigInt(data) : ctx.error("an integer"))).narrow((data, ctx) => (data >= -9223372036854775808n && data <= 9223372036854775807n) || ctx.mustBe("an int64"))',
      ],
      [
        { type: 'integer', format: 'uint64' },
        undefined,
        'type("bigint | number.integer").or(/^-?\\d+$/).pipe((data) => BigInt(data)).narrow((data, ctx) => (data >= 0n && data <= 18446744073709551615n) || ctx.mustBe("a uint64"))',
      ],
      [
        { type: 'integer', format: 'int64', enum: [1, 2] },
        undefined,
        'type("bigint | number.integer").or(/^-?\\d+$/).pipe((data) => BigInt(data)).to("1n | 2n")',
      ],
      [
        { type: 'integer', format: 'bigint', minimum: 0 },
        undefined,
        'type("bigint").narrow((data, ctx) => data >= BigInt(0) || ctx.mustBe("at least 0"))',
      ],
      [{ type: 'string', format: 'base64' }, undefined, '"string.base64"'],
      [{ type: 'string', format: 'base64url' }, undefined, '"string.base64.url"'],
      [{ type: 'string', format: 'hex' }, undefined, '"string.hex"'],
      [{ type: 'string', format: 'uuidv4' }, undefined, '"string.uuid.v4"'],
      [{ type: 'string', format: 'uuid', 'x-uuidVersion': 'v7' }, undefined, '"string.uuid.v7"'],
      [{ type: 'string', format: 'ipv4' }, undefined, '"string.ip.v4"'],
      [{ type: 'string', format: 'ipv6' }, undefined, '"string.ip.v6"'],
      [
        { type: 'string', format: 'date' },
        undefined,
        'type(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/)',
      ],
      [
        { type: 'string', format: 'date-time' },
        undefined,
        'type(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/)',
      ],
      [
        { type: 'string', format: 'time' },
        undefined,
        'type(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/)',
      ],
      [{ type: 'string', format: 'nanoid' }, undefined, 'type(/^[a-zA-Z0-9_-]{21}$/)'],
      [
        { type: 'string', format: 'httpUrl' },
        undefined,
        'type("string.url").and(/^https?:\\/\\//)',
      ],
      [{ type: 'string', format: 'binary' }, undefined, '"File"'],
      [{ type: 'string', format: 'trim' }, undefined, 'type("string.trim")'],
      [
        { type: 'string', format: 'email', 'x-trim': true },
        undefined,
        'type("string.trim").to("string.email")',
      ],
      [
        { type: 'string', 'x-trim': true, 'x-toLowerCase': true, pattern: '^[a-z]+$' },
        undefined,
        'type("string.trim").to("string.lower").to(/^[a-z]+$/)',
      ],
      [{ type: 'string', 'x-normalize': 'NFKC' }, undefined, 'type("string.normalize.NFKC")'],
      [
        { type: 'array', items: { type: 'integer' } },
        { paramIn: 'query', explode: false },
        'type("unknown").pipe((data)=>{if(typeof data!==\'string\')return data;const text=data;return (text===\'\'?[]:text.split(","))},type("unknown").pipe((data)=>(data===undefined||Array.isArray(data)?data:[data]),type(type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })).array()))',
      ],
      [
        { type: 'object', properties: { age: { type: 'integer' } } },
        { paramIn: 'query', style: 'deepObject' },
        'type("unknown").pipe((data)=>{if(typeof data!==\'object\'||data===null||Array.isArray(data))return data;const out=Object.entries(data).reduce<{[k:string]:unknown}>((acc,[key,value])=>{const name=/^[^[\\]]+\\[([^\\]]+)\\]$/u.exec(key)?.[1];return name===undefined?acc:{...acc,[name]:value}},{});return Object.keys(out).length>0?out:data},type({"age?":type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") })}))',
      ],
      [
        { type: 'object', properties: { id: { type: 'integer' } } },
        { paramIn: 'query', contentType: 'application/json' },
        'type("unknown").pipe((data)=>{if(typeof data!==\'string\')return data;try{return JSON.parse(data)}catch{return data}},type({"id?":"number.integer"}))',
      ],
    ])('arktype(%o, %o) → %s', (schema, options, expected) => {
      expect(arktype(schema, 'Schema', false, options)).toBe(expected)
    })
  })

  describe('#105: minLength / maxLength count code points', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        { type: 'string', minLength: 2, maxLength: 4 },
        undefined,
        'type("string").narrow((data, ctx) => [...data].length >= 2 || ctx.mustBe("at least 2 characters")).narrow((data, ctx) => [...data].length <= 4 || ctx.mustBe("at most 4 characters"))',
      ],
      [
        { type: 'string', minLength: 1, 'x-minLength-message': 'Name too short' },
        undefined,
        'type("string").narrow((data, ctx) => [...data].length >= 1 || ctx.mustBe("Name too short"))',
      ],
    ])('arktype(%o, %o) → %s', (schema, options, expected) => {
      expect(arktype(schema, 'Schema', false, options)).toBe(expected)
    })
  })
})

describe('allOf keyword members', () => {
  it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
    [{ allOf: [{ type: 'integer' }, { minimum: 5 }] }, undefined, '"number.integer >= 5"'],
    [
      { allOf: [{ minimum: 5 }] },
      undefined,
      'type("unknown").narrow((data) => (typeof data !== \'number\' || (data >= 5)))',
    ],
    [
      { allOf: [{ type: 'integer' }, { minimum: 5 }] },
      { paramIn: 'query' },
      'type("string").pipe((data, ctx) => { const value = /^-?(?:0|[1-9]\\d*)$/.test(data) ? Number(data) : Number.NaN; return Number.isSafeInteger(value) ? value : ctx.error("an integer") }).to("number.integer >= 5")',
    ],
  ])('arktype(%o, %o) → %s', (schema, options, expected) => {
    expect(arktype(schema, 'Schema', false, options)).toBe(expected)
  })
})
