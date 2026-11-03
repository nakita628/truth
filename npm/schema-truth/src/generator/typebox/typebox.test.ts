import { describe, expect, it } from 'vite-plus/test'

import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { typebox } from './typebox.js'

describe('typebox', () => {
  describe('ref', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/User' }, 'User'],
      [{ $ref: '#/components/schemas/UserProfile' }, 'UserProfile'],
      [{ $ref: '#/definitions/Item' }, 'Item'],
      [{ $ref: '#/$defs/Address' }, 'Address'],
      [{ $ref: '#' }, "Type.Ref('Schema')"],
      [{ $ref: '' }, 'Type.Any()'],
      [
        {
          type: 'array',
          items: { $ref: '#/components/schemas/Tag' },
        },
        'Type.Array(Tag)',
      ],
      [{ $ref: '#/components/schemas/User', nullable: true }, 'Type.Union([User,Type.Null()])'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('oneOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
        'Type.Union([Type.String(),Type.Number()])',
      ],
      [
        {
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Type.Union([A,B])',
      ],
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          nullable: true,
        },
        'Type.Union([Type.Union([Type.String(),Type.Number()]),Type.Null()])',
      ],
      [{ oneOf: [] }, 'Type.Any()'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('anyOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
        'Type.Union([Type.String(),Type.Number()])',
      ],
      [
        {
          anyOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        },
        'Type.Union([Cat,Dog])',
      ],
      [
        {
          anyOf: [{ type: 'string' }, { type: 'boolean' }],
          nullable: true,
        },
        'Type.Union([Type.Union([Type.String(),Type.Boolean()]),Type.Null()])',
      ],
      [{ anyOf: [] }, 'Type.Any()'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            {
              type: 'object',
              properties: { name: { type: 'string' } },
              required: ['name'],
            },
          ],
        },
        'Type.Intersect([Base,Type.Object({name:Type.String()})])',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              properties: { a: { type: 'string' } },
              required: ['a'],
            },
            {
              type: 'object',
              properties: { b: { type: 'number' } },
              required: ['b'],
            },
          ],
        },
        'Type.Intersect([Type.Object({a:Type.String()}),Type.Object({b:Type.Number()})])',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              properties: { a: { type: 'string' } },
              required: ['a'],
            },
            {
              type: 'object',
              properties: { b: { type: 'string' } },
              required: ['b'],
            },
          ],
          nullable: true,
        },
        'Type.Union([Type.Intersect([Type.Object({a:Type.String()}),Type.Object({b:Type.String()})]),Type.Null()])',
      ],
      [{ allOf: [] }, 'Type.Any()'],
      [
        {
          allOf: [{ $ref: '#/components/schemas/A' }],
        },
        'A',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('not (TypeBox v1 has no runtime Type.Not — falls back to Type.Any())', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ not: { type: 'string' } }, 'Type.Any()'],
      [{ not: { type: 'integer' } }, 'Type.Any()'],
      [{ not: { type: 'boolean' } }, 'Type.Any()'],
      [{ not: { type: 'number' } }, 'Type.Any()'],
      [{ not: { type: 'string' }, nullable: true }, 'Type.Union([Type.Any(),Type.Null()])'],
      [{ not: { type: 'string' }, type: ['null'] }, 'Type.Union([Type.Any(),Type.Null()])'],
      [
        {
          not: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
        },
        'Type.Any()',
      ],
      [{ not: { enum: ['admin', 'root'] } }, 'Type.Any()'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' }, 'Type.Literal("fixed")'],
      [{ const: 42 }, 'Type.Literal(42)'],
      [{ const: true }, 'Type.Literal(true)'],
      [{ const: 'fixed', nullable: true }, 'Type.Union([Type.Literal("fixed"),Type.Null()])'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { enum: ['A', 'B', 'C'] },
        'Type.Union([Type.Literal("A"),Type.Literal("B"),Type.Literal("C")])',
      ],
      [
        { enum: ['A', 'B'], nullable: true },
        'Type.Union([Type.Union([Type.Literal("A"),Type.Literal("B")]),Type.Null()])',
      ],
      [{ enum: [1, 2, 3] }, 'Type.Union([Type.Literal(1),Type.Literal(2),Type.Literal(3)])'],
      [{ enum: [true, false] }, 'Type.Union([Type.Literal(true),Type.Literal(false)])'],
      [{ enum: ['only'] }, 'Type.Literal("only")'],
      [{ enum: [null] }, 'Type.Null()'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' }, 'Type.String()'],
      [{ type: 'string', nullable: true }, 'Type.Union([Type.String(),Type.Null()])'],
      [{ type: ['string', 'null'] }, 'Type.Union([Type.String(),Type.Null()])'],
      [{ type: 'string', format: 'email' }, 'Type.String({format:"email"})'],
      [{ type: 'string', format: 'uuid' }, 'Type.String({format:"uuid"})'],
      [{ type: 'string', format: 'uri' }, 'Type.String({format:"uri"})'],
      [{ type: 'string', format: 'ipv4' }, 'Type.String({format:"ipv4"})'],
      [{ type: 'string', format: 'ipv6' }, 'Type.String({format:"ipv6"})'],
      [{ type: 'string', format: 'date-time' }, 'Type.String({format:"date-time"})'],
      [{ type: 'string', format: 'date' }, 'Type.String({format:"date"})'],
      [{ type: 'string', format: 'time' }, 'Type.String({format:"time"})'],
      [{ type: 'string', minLength: 1 }, 'Type.String({minLength:1})'],
      [{ type: 'string', maxLength: 100 }, 'Type.String({maxLength:100})'],
      [{ type: 'string', minLength: 3, maxLength: 20 }, 'Type.String({minLength:3,maxLength:20})'],
      [{ type: 'string', minLength: 5, maxLength: 5 }, 'Type.String({minLength:5,maxLength:5})'],
      [{ type: 'string', pattern: '^\\w+$' }, 'Type.String({pattern:"^\\\\w+$"})'],
      [{ type: 'string', default: 'hello' }, 'Type.Optional(Type.String({default:"hello"}))'],
      [
        { type: 'string', default: 'hello', nullable: true },
        'Type.Optional(Type.Union([Type.String({default:"hello"}),Type.Null()]))',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('number', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number' }, 'Type.Number()'],
      [{ type: 'number', nullable: true }, 'Type.Union([Type.Number(),Type.Null()])'],
      [{ type: ['number', 'null'] }, 'Type.Union([Type.Number(),Type.Null()])'],
      [{ type: 'number', minimum: 0 }, 'Type.Number({minimum:0})'],
      [{ type: 'number', maximum: 100 }, 'Type.Number({maximum:100})'],
      [{ type: 'number', minimum: 0, maximum: 100 }, 'Type.Number({minimum:0,maximum:100})'],
      [{ type: 'number', exclusiveMinimum: 0 }, 'Type.Number({exclusiveMinimum:0})'],
      [{ type: 'number', exclusiveMaximum: 100 }, 'Type.Number({exclusiveMaximum:100})'],
      [{ type: 'number', multipleOf: 2 }, 'Type.Number({multipleOf:2})'],
      [{ type: 'number', default: 42 }, 'Type.Optional(Type.Number({default:42}))'],
      [
        { type: 'number', default: 42, nullable: true },
        'Type.Optional(Type.Union([Type.Number({default:42}),Type.Null()]))',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' }, 'Type.Integer()'],
      [{ type: 'integer', nullable: true }, 'Type.Union([Type.Integer(),Type.Null()])'],
      [{ type: ['integer', 'null'] }, 'Type.Union([Type.Integer(),Type.Null()])'],
      [{ type: 'integer', minimum: 0 }, 'Type.Integer({minimum:0})'],
      [{ type: 'integer', maximum: 100 }, 'Type.Integer({maximum:100})'],
      [{ type: 'integer', exclusiveMinimum: 0 }, 'Type.Integer({exclusiveMinimum:0})'],
      [{ type: 'integer', exclusiveMaximum: 100 }, 'Type.Integer({exclusiveMaximum:100})'],
      [{ type: 'integer', multipleOf: 5 }, 'Type.Integer({multipleOf:5})'],
      [{ type: 'integer', default: 10 }, 'Type.Optional(Type.Integer({default:10}))'],
      [{ type: 'integer', format: 'bigint' }, 'Type.BigInt()'],
      [
        { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 },
        'Type.BigInt({minimum:BigInt(0),maximum:BigInt(100)})',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' }, 'Type.Boolean()'],
      [{ type: 'boolean', nullable: true }, 'Type.Union([Type.Boolean(),Type.Null()])'],
      [{ type: ['boolean', 'null'] }, 'Type.Union([Type.Boolean(),Type.Null()])'],
      [{ type: 'boolean', default: true }, 'Type.Optional(Type.Boolean({default:true}))'],
      [{ type: 'boolean', default: false }, 'Type.Optional(Type.Boolean({default:false}))'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'array', items: { type: 'string' } }, 'Type.Array(Type.String())'],
      [{ type: 'array', items: { type: 'number' } }, 'Type.Array(Type.Number())'],
      [{ type: 'array', items: { type: 'boolean' } }, 'Type.Array(Type.Boolean())'],
      [
        {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        },
        'Type.Union([Type.Array(Type.String()),Type.Null()])',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        },
        'Type.Array(Type.String(),{minItems:1})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
        },
        'Type.Array(Type.String(),{maxItems:10})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
        },
        'Type.Array(Type.String(),{minItems:1,maxItems:10})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 5,
          maxItems: 5,
        },
        'Type.Array(Type.String(),{minItems:5,maxItems:5})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string', nullable: true },
        },
        'Type.Array(Type.Union([Type.String(),Type.Null()]))',
      ],
      [
        {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' },
          },
        },
        'Type.Array(Type.Array(Type.Number()))',
      ],
      [{ type: 'array' }, 'Type.Array(Type.Any())'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' }, 'Type.Object({})'],
      [{ type: 'object', nullable: true }, 'Type.Union([Type.Object({}),Type.Null()])'],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        'Type.Object({name:Type.String()})',
      ],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        'Type.Object({name:Type.Optional(Type.String())})',
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
        'Type.Object({name:Type.String(),age:Type.Optional(Type.Integer())})',
      ],
      [
        {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test'],
          additionalProperties: false,
        },
        'Type.Object({test:Type.String()},{additionalProperties:false})',
      ],
      [
        {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test'],
          nullable: true,
        },
        'Type.Union([Type.Object({test:Type.String()}),Type.Null()])',
      ],
      [
        {
          type: 'object',
          properties: {
            kind: { const: 'A' },
          },
          required: ['kind'],
        },
        'Type.Object({kind:Type.Literal("A")})',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'date' },
        'Codec(Type.String()).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString())',
      ],
      [
        { type: 'date', nullable: true },
        'Type.Union([Codec(Type.String()).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString()),Type.Null()])',
      ],
      [
        { type: ['date', 'null'] },
        'Type.Union([Codec(Type.String()).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString()),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' }, 'Type.Union([Type.Null(),Type.Null()])'],
      [{ type: 'null', nullable: true }, 'Type.Union([Type.Null(),Type.Null()])'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('any (fallback)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{}, 'Type.Any()'],
      [{ nullable: true }, 'Type.Union([Type.Any(),Type.Null()])'],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
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
        [{ type: 'array', items: { $ref: '#/components/schemas/Pet' } }, 'Type.Array(PetSchema)'],
        [{ $ref: '#/definitions/Address' }, 'Address'],
        [{ $ref: '#/$defs/Address' }, 'Address'],
      ])('typebox(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(typebox(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('object with openapi refs', () => {
      it('should resolve $ref in object properties with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          type: 'object',
          properties: {
            pet: { $ref: '#/components/schemas/Pet' },
            owner: { $ref: '#/components/schemas/user-profile' },
          },
          required: ['pet'],
        }
        expect(typebox(schema, 'Schema', false, { openapi: true })).toBe(
          'Type.Object({pet:PetSchema,owner:Type.Optional(UserProfileSchema)})',
        )
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(typebox(schema, 'Schema', false, { openapi: true })).toBe(
          'Type.Union([CatSchema,DogSchema])',
        )
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', "Type.Ref('UserSchema')"],
        // Nullable ref with openapi (double-wrapped: ref() wraps, then typebox() wraps again)
        [
          { $ref: '#/components/schemas/Pet', nullable: true },
          'TestSchema',
          'Type.Union([PetSchema,Type.Null()])',
        ],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', 'BaseSchema'],
        // anyOf with openapi ref and inline
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          'Type.Union([ASchema,Type.String()])',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', 'MySchemaSchema'],
      ])('typebox(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(typebox(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef)
      [{ $ref: '#SomeRef' }, 'SomeRef'],
      // External file with fragment
      [{ $ref: 'other.json#/definitions/Foo' }, 'Type.Unknown()'],
      // HTTP URL reference with .json
      [{ $ref: 'https://example.com/schemas/User.json' }, 'User'],
      // HTTP URL without .json
      [{ $ref: 'https://example.com/schemas/User' }, 'User'],
      // Fallback to any (no # and no http)
      [{ $ref: 'relative/path' }, 'Type.Any()'],
      // Self reference #
      [{ $ref: '#' }, "Type.Ref('Schema')"],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(typebox({ oneOf: [] })).toBe('Type.Any()')
    })

    it('should handle empty anyOf', () => {
      expect(typebox({ anyOf: [] })).toBe('Type.Any()')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle nullable via type array with null', () => {
      expect(typebox({ type: ['string', 'null'] })).toBe('Type.Union([Type.String(),Type.Null()])')
    })
  })

  describe('ref option', () => {
    it('puts ref on Type.String', () => {
      expect(typebox({ type: 'string' }, 'Schema', false, { ref: 'X' })).toBe(
        'Type.String({ref:"X"})',
      )
    })

    it('puts ref on Type.Object alongside description', () => {
      expect(
        typebox(
          { type: 'object', properties: { a: { type: 'string' } }, description: 'd' },
          'Schema',
          false,
          { ref: 'X' },
        ),
      ).toBe('Type.Object({a:Type.Optional(Type.String())},{ref:"X",description:"d"})')
    })

    it('keeps ref on the inner Type.Object under Type.Readonly', () => {
      expect(
        typebox(
          { type: 'object', properties: { a: { type: 'string' } }, 'x-readonly': true },
          'Schema',
          false,
          { ref: 'X' },
        ),
      ).toBe('Type.Readonly(Type.Object({a:Type.Optional(Type.String())},{ref:"X"}))')
    })

    it('does not leak ref onto nested properties', () => {
      expect(
        typebox(
          {
            type: 'object',
            properties: { a: { type: 'string', minLength: 1 } },
            required: ['a'],
          },
          'Schema',
          false,
          { ref: 'X' },
        ),
      ).toBe('Type.Object({a:Type.String({minLength:1})},{ref:"X"})')
    })
  })

  describe('readonly option', () => {
    it('should wrap object with Type.Readonly()', () => {
      expect(
        typebox(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: true },
        ),
      ).toBe('Type.Readonly(Type.Object({name:Type.String()}))')
    })

    it('should wrap array with Type.Readonly()', () => {
      expect(
        typebox({ type: 'array', items: { type: 'string' } }, 'Schema', false, {
          readonly: true,
        }),
      ).toBe('Type.Readonly(Type.Array(Type.String()))')
    })

    it('should not wrap string', () => {
      expect(typebox({ type: 'string' }, 'Schema', false, { readonly: true })).toBe('Type.String()')
    })
  })

  describe('x-prefixItems-message', () => {
    it('emits errorMessage.prefixItems and errorMessage.items for ajv-errors compatibility', () => {
      expect(
        typebox({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'number' }],
          'x-prefixItems-message': 'bad tuple',
        }),
      ).toBe(
        'Type.Tuple([Type.String(),Type.Number()],{errorMessage:{prefixItems:"bad tuple",items:"bad tuple"}})',
      )
    })
  })

  describe('x-items-message', () => {
    it('emits errorMessage.items for ajv-errors compatibility', () => {
      expect(
        typebox({ type: 'array', items: { type: 'string' }, 'x-items-message': 'bad items' }),
      ).toBe('Type.Array(Type.String(),{errorMessage:{items:"bad items"}})')
    })

    it('coexists with other array errorMessage entries', () => {
      expect(
        typebox({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-items-message': 'bad items',
          'x-minItems-message': 'too few',
        }),
      ).toBe(
        'Type.Array(Type.String(),{minItems:1,errorMessage:{minItems:"too few",items:"bad items"}})',
      )
    })
  })

  describe('x-implication-message', () => {
    it('takes precedence over x-anyOf-message', () => {
      expect(
        typebox({
          anyOf: [{ type: 'string' }, { type: 'number' }],
          'x-anyOf-message': 'any',
          'x-implication-message': 'implication failed',
        }),
      ).toBe('Type.Union([Type.String(),Type.Number()],{errorMessage:"implication failed"})')
    })
  })

  describe('x-length-message', () => {
    it('falls back for minItems when x-minItems-message absent', () => {
      expect(
        typebox({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-length-message': 'bad length',
        }),
      ).toBe('Type.Array(Type.String(),{minItems:1,errorMessage:{minItems:"bad length"}})')
    })
  })

  describe('paramIn coercion', () => {
    it('query: number → Type.Transform decode Number', () => {
      expect(typebox({ type: 'number' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'Codec(Type.String({pattern:/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/})).Decode((value)=>Number(value)).Encode((value)=>String(value))',
      )
    })

    it("path: boolean → Type.Transform decode 'true'|'false'", () => {
      expect(typebox({ type: 'boolean' }, 'Schema', false, { paramIn: 'path' })).toBe(
        "Codec(Type.String({pattern:/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i})).Decode((value)=>/^(?:true|1|yes|on|y|enabled)$/i.test(value)).Encode((value)=>value?'true':'false')",
      )
    })

    it('query: date → Type.Transform decode new Date', () => {
      expect(typebox({ type: 'date' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'Codec(Type.String()).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString())',
      )
    })

    it('x-coerce: false overrides paramIn (user opt-out wins)', () => {
      expect(
        typebox({ type: 'number', 'x-coerce': false }, 'Schema', false, { paramIn: 'query' }),
      ).toBe('Type.Number()')
    })
  })

  describe('x-not-message', () => {
    it('rides through Type.Any errorMessage for ajv-compatible downstreams', () => {
      expect(
        typebox({ type: 'string', not: { type: 'number' }, 'x-not-message': 'cannot be number' }),
      ).toBe('Type.Any({errorMessage:"cannot be number"})')
    })
  })

  describe('#101: an optional property with a default is wrapped once', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        { type: 'object', properties: { n: { type: 'integer', default: 1 } } },
        undefined,
        'Type.Object({n:Type.Optional(Type.Integer({default:1}))})',
      ],
      [
        { type: 'object', properties: { n: { type: 'integer', default: 1 } }, required: ['n'] },
        undefined,
        'Type.Object({n:Type.Optional(Type.Integer({default:1}))})',
      ],
      [
        { type: 'object', properties: { n: { type: 'string', default: 'x', nullable: true } } },
        undefined,
        'Type.Object({n:Type.Optional(Type.Union([Type.String({default:"x"}),Type.Null()]))})',
      ],
      [
        { type: 'object', properties: { n: { allOf: [{ type: 'string' }, { default: 'x' }] } } },
        undefined,
        'Type.Object({n:Type.Optional(Type.Intersect([Type.String()],{default:"x"}))})',
      ],
    ])('typebox(%o, %o) → %s', (schema, options, expected) => {
      expect(typebox(schema, 'Schema', false, options)).toBe(expected)
    })
  })

  describe('#106: a $ref beside a default is wrapped once', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        {
          type: 'object',
          properties: { ref_def: { $ref: '#/components/schemas/Count', default: 3 } },
        },
        undefined,
        'Type.Object({ref_def:Type.Optional(Type.Intersect([Count],{default:3}))})',
      ],
      [
        { $ref: '#/components/schemas/Count', nullable: true },
        undefined,
        'Type.Union([Count,Type.Null()])',
      ],
    ])('typebox(%o, %o) → %s', (schema, options, expected) => {
      expect(typebox(schema, 'Schema', false, options)).toBe(expected)
    })
  })
})

describe('allOf keyword members', () => {
  it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
    [{ allOf: [{ type: 'integer' }, { minimum: 5 }] }, undefined, 'Type.Integer({minimum:5})'],
    [{ allOf: [{ minimum: 5 }] }, undefined, 'Type.Number({minimum:5})'],
    [
      { type: 'integer' },
      { paramIn: 'query' },
      'Codec(Type.String({pattern:/^-?(?:0|[1-9]\\d*)$/})).Decode((value)=>Number(value)).Encode((value)=>String(value))',
    ],
    [
      { type: 'boolean' },
      { paramIn: 'path' },
      "Codec(Type.String({pattern:/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i})).Decode((value)=>/^(?:true|1|yes|on|y|enabled)$/i.test(value)).Encode((value)=>value?'true':'false')",
    ],
  ])('typebox(%o, %o) → %s', (schema, options, expected) => {
    expect(typebox(schema, 'Schema', false, options)).toBe(expected)
  })
})
