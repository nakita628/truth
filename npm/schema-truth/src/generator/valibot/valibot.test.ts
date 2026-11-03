import { describe, expect, it } from 'vite-plus/test'

import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibot } from './valibot.js'

describe('valibot', () => {
  describe('ref', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/Test' }, 'TestSchema'],
      [{ $ref: '#/definitions/Test' }, 'TestSchema'],
      [
        {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Test',
          },
        },
        'v.array(TestSchema)',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })

    describe('ref with isValibot=true', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/Test' }, 'v.lazy(() => Test)'],
        [{ $ref: '#/definitions/Test' }, 'v.lazy(() => Test)'],
      ])('valibot(%o, undefined, true) → %s', (input, expected) => {
        expect(valibot(input, undefined, true)).toBe(expected)
      })
    })
  })

  describe('oneOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          type: 'object',
          oneOf: [
            {
              properties: { kind: { const: 'A' } },
              required: ['kind'],
            },
            {
              properties: { kind: { const: 'B' } },
              required: ['kind'],
            },
          ],
          nullable: true,
        },
        'v.nullable(v.union([v.object({kind:v.literal("A")}),v.object({kind:v.literal("B")})]))',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.union([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
      [
        {
          type: ['object', 'null'],
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('anyOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          type: 'object',
          anyOf: [
            {
              properties: { kind: { const: 'A' } },
              required: ['kind'],
            },
            {
              properties: { kind: { const: 'B' } },
              required: ['kind'],
            },
          ],
          nullable: true,
        },
        'v.nullable(v.union([v.object({kind:v.literal("A")}),v.object({kind:v.literal("B")})]))',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.union([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
      [
        {
          type: ['object', 'null'],
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          description:
            'Abstract type for all GeoJSon object except Feature and FeatureCollection\n',
          externalDocs: {
            url: 'https://tools.ietf.org/html/rfc7946#section-3',
          },
          allOf: [
            {
              $ref: '#/components/schemas/GeoJsonObject',
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'Point',
                    'MultiPoint',
                    'LineString',
                    'MultiLineString',
                    'Polygon',
                    'MultiPolygon',
                    'GeometryCollection',
                  ],
                },
              },
              required: ['type'],
              discriminator: {
                propertyName: 'type',
              },
            },
          ],
        },
        'v.pipe(v.intersect([GeoJsonObjectSchema,v.object({type:v.picklist(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon","GeometryCollection"])})]),v.description("Abstract type for all GeoJSon object except Feature and FeatureCollection\\n"),v.metadata({externalDocs:{url:"https://tools.ietf.org/html/rfc7946#section-3"}}))',
      ],
      [
        {
          description: "GeoJSon 'Feature' object",
          externalDocs: {
            url: 'https://tools.ietf.org/html/rfc7946#section-3.2',
          },
          allOf: [
            {
              $ref: '#/components/schemas/GeoJsonObject',
            },
            {
              type: 'object',
              required: ['geometry', 'properties'],
              properties: {
                geometry: {
                  allOf: [
                    {
                      nullable: true,
                    },
                    {
                      $ref: '#/components/schemas/Geometry',
                    },
                  ],
                },
                properties: {
                  type: 'object',
                  nullable: true,
                },
                id: {
                  oneOf: [
                    {
                      type: 'number',
                    },
                    {
                      type: 'string',
                    },
                  ],
                },
              },
            },
          ],
        },
        'v.pipe(v.intersect([GeoJsonObjectSchema,v.object({geometry:v.nullable(GeometrySchema),properties:v.nullable(v.object({})),id:v.optional(v.union([v.number(),v.string()]))})]),v.description("GeoJSon \'Feature\' object"),v.metadata({externalDocs:{url:"https://tools.ietf.org/html/rfc7946#section-3.2"}}))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: {
                  type: 'string',
                },
              },
            },
          ],
        },
        'v.intersect([v.object({a:v.string()}),v.object({b:v.string()})])',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: {
                  type: 'string',
                },
              },
            },
          ],
          nullable: true,
        },
        'v.nullable(v.intersect([v.object({a:v.string()}),v.object({b:v.string()})]))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: {
                  type: 'string',
                },
              },
            },
          ],
          type: ['null'],
        },
        'v.nullable(v.intersect([v.object({a:v.string()}),v.object({b:v.string()})]))',
      ],
      [
        {
          allOf: [
            {
              $ref: '#/components/schemas/Base',
            },
            {
              default: 'hello',
            },
          ],
        },
        'v.optional(BaseSchema,"hello")',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('not', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ not: { type: 'string' } }, "v.custom<unknown>((input) => typeof input !== 'string')"],
      [
        { not: { type: 'integer' } },
        "v.custom<unknown>((input) => typeof input !== 'number' || !Number.isInteger(input))",
      ],
      [{ not: { type: 'boolean' } }, "v.custom<unknown>((input) => typeof input !== 'boolean')"],
      [
        { not: { type: 'string' }, nullable: true },
        "v.nullable(v.custom<unknown>((input) => typeof input !== 'string'))",
      ],
      [
        { not: { type: 'string' }, type: ['null'] },
        "v.pipe(v.nullable(v.null()),v.check((input) => typeof input !== 'string'))",
      ],
      [{ not: { const: 42 } }, 'v.custom<unknown>((input) => input !== 42)'],
      [
        { not: { enum: ['a', 'b'] } },
        'v.custom<unknown>((input) => !["a","b"].some((item) => item === input))',
      ],
      [
        { type: 'integer', format: 'int64', not: { enum: [0] } },
        'v.pipe(v.union([v.bigint(),v.pipe(v.number(),v.integer()),v.pipe(v.string(),v.regex(/^-?\\d+$/))]),v.transform((input)=>BigInt(input)),v.minValue(-9223372036854775808n),v.maxValue(9223372036854775807n),v.check((input) => ![0n].some((item) => item === input)))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' }, 'v.literal("fixed")'],
      [{ const: 'fixed', nullable: true }, 'v.nullable(v.literal("fixed"))'],
      [{ type: ['null'], const: 'fixed' }, 'v.nullable(v.literal("fixed"))'],
      [{ const: null }, 'v.null()'],
      [{ const: [] }, 'v.custom<[]>((input) => Array.isArray(input)&&input.length===0)'],
      [
        { const: {} },
        "v.custom<{}>((input) => typeof input==='object'&&input!==null&&!Array.isArray(input)&&Object.keys(input).length===0)",
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: ['A', 'B'] }, 'v.picklist(["A","B"])'],
      [{ enum: ['A', 'B'], type: ['string'], nullable: true }, 'v.nullable(v.picklist(["A","B"]))'],
      [{ enum: ['A', 'B'], type: ['string', 'null'] }, 'v.nullable(v.picklist(["A","B"]))'],
      [{ enum: [1, 2] }, 'v.union([v.literal(1),v.literal(2)])'],
      [
        { enum: [1, 2], type: ['number'], nullable: true },
        'v.nullable(v.union([v.literal(1),v.literal(2)]))',
      ],
      [
        { enum: [1, 2], type: ['number', 'null'] },
        'v.nullable(v.union([v.literal(1),v.literal(2)]))',
      ],
      [{ enum: [true, false] }, 'v.union([v.literal(true),v.literal(false)])'],
      [
        { enum: [true, false], type: ['boolean'], nullable: true },
        'v.nullable(v.union([v.literal(true),v.literal(false)]))',
      ],
      [
        { enum: [true, false], type: ['boolean', 'null'] },
        'v.nullable(v.union([v.literal(true),v.literal(false)]))',
      ],
      [{ enum: [null] }, 'v.null()'],
      [{ enum: [null], type: ['null'] }, 'v.nullable(v.null())'],
      [{ enum: ['abc'] }, "v.literal('abc')"],
      [{ enum: ['abc'], type: ['string'], nullable: true }, "v.nullable(v.literal('abc'))"],
      [{ enum: ['abc'], type: ['string', 'null'] }, "v.nullable(v.literal('abc'))"],
      [{ type: 'array', enum: [[1, 2]] }, 'v.tuple([v.literal(1),v.literal(2)])'],
      [
        { type: 'array', nullable: true, enum: [[1, 2]] },
        'v.nullable(v.tuple([v.literal(1),v.literal(2)]))',
      ],
      [
        { type: ['array', 'null'], enum: [[1, 2]] },
        'v.nullable(v.tuple([v.literal(1),v.literal(2)]))',
      ],
      [
        {
          type: 'array',
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'v.union([v.tuple([v.literal(1),v.literal(2)]),v.tuple([v.literal(3),v.literal(4)])])',
      ],
      [
        {
          type: 'array',
          nullable: true,
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'v.nullable(v.union([v.tuple([v.literal(1),v.literal(2)]),v.tuple([v.literal(3),v.literal(4)])]))',
      ],
      [
        {
          type: ['array', 'null'],
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'v.nullable(v.union([v.tuple([v.literal(1),v.literal(2)]),v.tuple([v.literal(3),v.literal(4)])]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' }, 'v.string()'],
      [{ type: ['string'], nullable: true }, 'v.nullable(v.string())'],
      [{ type: ['string', 'null'] }, 'v.nullable(v.string())'],
      [
        { type: 'string', minLength: 1, maxLength: 10 },
        'v.pipe(v.string(),v.minCodePoints(1),v.maxCodePoints(10))',
      ],
      [{ type: 'string', pattern: '^\\w+$' }, 'v.pipe(v.string(),v.regex(/^\\w+$/))'],
      [{ type: 'string', default: 'test' }, 'v.optional(v.string(),"test")'],
      [
        { type: 'string', default: 'test', nullable: true },
        'v.optional(v.nullable(v.string()),"test")',
      ],
      [{ type: ['string', 'null'], default: 'test' }, 'v.optional(v.nullable(v.string()),"test")'],
      [
        { type: 'string', nullable: true, default: null },
        'v.optional(v.nullable(v.string()),null)',
      ],
      [{ type: ['string', 'null'], default: null }, 'v.optional(v.nullable(v.string()),null)'],
      [{ type: 'string', format: 'email' }, 'v.pipe(v.string(),v.email())'],
      [
        { type: 'string', format: 'uuid' },
        'v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/))',
      ],
      [{ type: 'string', format: 'uri' }, 'v.pipe(v.string(),v.url())'],
      [{ type: 'string', format: 'ipv4' }, 'v.pipe(v.string(),v.ipv4())'],
      [{ type: 'string', format: 'ipv6' }, 'v.pipe(v.string(),v.ipv6())'],
      [
        { type: 'string', format: 'date-time' },
        'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/))',
      ],
      [{ type: 'string', format: 'base64' }, 'v.pipe(v.string(),v.base64())'],
      [{ type: 'string', format: 'emoji' }, 'v.pipe(v.string(),v.emoji())'],
      [
        { type: 'string', format: 'date' },
        'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/))',
      ],
      [
        { type: 'string', format: 'time' },
        'v.pipe(v.string(),v.regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('number', () => {
    describe('type: number', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'number' }, 'v.number()'],
        [{ type: ['number'], nullable: true }, 'v.nullable(v.number())'],
        [{ type: ['number', 'null'] }, 'v.nullable(v.number())'],
        [{ type: 'number', minimum: 0 }, 'v.pipe(v.number(),v.minValue(0))'],
        [{ type: 'number', minimum: 100 }, 'v.pipe(v.number(),v.minValue(100))'],
        [{ type: 'number', maximum: 100 }, 'v.pipe(v.number(),v.maxValue(100))'],
        [{ type: 'number', maximum: 0 }, 'v.pipe(v.number(),v.maxValue(0))'],
        [{ type: 'number', exclusiveMinimum: 10 }, 'v.pipe(v.number(),v.gtValue(10))'],
        [{ type: 'number', exclusiveMaximum: 10 }, 'v.pipe(v.number(),v.ltValue(10))'],
        [{ type: 'number', multipleOf: 2 }, 'v.pipe(v.number(),v.multipleOf(2))'],
        [{ type: 'number', default: 100 }, 'v.optional(v.number(),100)'],
        [
          { type: 'number', default: 100, nullable: true },
          'v.optional(v.nullable(v.number()),100)',
        ],
        [{ type: ['number', 'null'], default: 100 }, 'v.optional(v.nullable(v.number()),100)'],
      ])('valibot(%o) → %s', (input, expected) => {
        expect(valibot(input)).toBe(expected)
      })
    })
  })

  describe('integer', () => {
    describe('type: integer', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'integer' }, 'v.pipe(v.number(),v.integer())'],
        [{ type: ['integer'], nullable: true }, 'v.nullable(v.pipe(v.number(),v.integer()))'],
        [{ type: ['integer', 'null'] }, 'v.nullable(v.pipe(v.number(),v.integer()))'],
        [{ type: 'integer', minimum: 100 }, 'v.pipe(v.number(),v.integer(),v.minValue(100))'],
        [{ type: 'integer', minimum: 0 }, 'v.pipe(v.number(),v.integer(),v.minValue(0))'],
        [{ type: 'integer', maximum: 100 }, 'v.pipe(v.number(),v.integer(),v.maxValue(100))'],
        [{ type: 'integer', maximum: 0 }, 'v.pipe(v.number(),v.integer(),v.maxValue(0))'],
        [{ type: 'integer', exclusiveMinimum: 10 }, 'v.pipe(v.number(),v.integer(),v.gtValue(10))'],
        [{ type: 'integer', exclusiveMaximum: 10 }, 'v.pipe(v.number(),v.integer(),v.ltValue(10))'],
        [{ type: 'integer', multipleOf: 2 }, 'v.pipe(v.number(),v.integer(),v.multipleOf(2))'],
        [{ type: 'integer', default: 100 }, 'v.optional(v.pipe(v.number(),v.integer()),100)'],
        [
          { type: 'integer', default: 100, nullable: true },
          'v.optional(v.nullable(v.pipe(v.number(),v.integer())),100)',
        ],
        [
          { type: ['integer', 'null'], default: 100 },
          'v.optional(v.nullable(v.pipe(v.number(),v.integer())),100)',
        ],
      ])('valibot(%o) → %s', (input, expected) => {
        expect(valibot(input)).toBe(expected)
      })
    })

    describe('type: integer, format: bigint', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'integer', format: 'bigint' }, 'v.bigint()'],
        [{ type: 'integer', format: 'bigint', nullable: true }, 'v.nullable(v.bigint())'],
        [{ type: ['integer', 'null'], format: 'bigint' }, 'v.nullable(v.bigint())'],
        [
          { type: 'integer', format: 'bigint', minimum: 100 },
          'v.pipe(v.bigint(),v.minValue(BigInt(100)))',
        ],
        [
          { type: 'integer', format: 'bigint', minimum: 0 },
          'v.pipe(v.bigint(),v.minValue(BigInt(0)))',
        ],
        [
          { type: 'integer', format: 'bigint', maximum: 100 },
          'v.pipe(v.bigint(),v.maxValue(BigInt(100)))',
        ],
        [
          { type: 'integer', format: 'bigint', maximum: 0 },
          'v.pipe(v.bigint(),v.maxValue(BigInt(0)))',
        ],
      ])('valibot(%o) → %s', (input, expected) => {
        expect(valibot(input)).toBe(expected)
      })
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' }, 'v.boolean()'],
      [{ type: ['boolean'], nullable: true }, 'v.nullable(v.boolean())'],
      [{ type: ['boolean', 'null'] }, 'v.nullable(v.boolean())'],
      [{ type: 'boolean', default: true }, 'v.optional(v.boolean(),true)'],
      [{ type: 'boolean', default: false }, 'v.optional(v.boolean(),false)'],
      [{ type: 'boolean', nullable: true }, 'v.nullable(v.boolean())'],
      [{ type: ['boolean', 'null'] }, 'v.nullable(v.boolean())'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'array', items: { type: 'string' } }, 'v.array(v.string())'],
      [
        { type: 'array', items: { type: 'string', nullable: true } },
        'v.array(v.nullable(v.string()))',
      ],
      [{ type: 'array', items: { type: ['string', 'null'] } }, 'v.array(v.nullable(v.string()))'],
      [
        { type: 'array', nullable: true, items: { type: ['string', 'null'] } },
        'v.nullable(v.array(v.nullable(v.string())))',
      ],
      [{ type: 'array', items: { type: 'number' } }, 'v.array(v.number())'],
      [
        { type: 'array', items: { type: 'number', nullable: true } },
        'v.array(v.nullable(v.number()))',
      ],
      [{ type: 'array', items: { type: ['number', 'null'] } }, 'v.array(v.nullable(v.number()))'],
      [
        { type: 'array', nullable: true, items: { type: ['number', 'null'] } },
        'v.nullable(v.array(v.nullable(v.number())))',
      ],
      [{ type: 'array', items: { type: 'boolean' } }, 'v.array(v.boolean())'],
      [
        { type: 'array', items: { type: 'boolean', nullable: true } },
        'v.array(v.nullable(v.boolean()))',
      ],
      [{ type: 'array', items: { type: ['boolean', 'null'] } }, 'v.array(v.nullable(v.boolean()))'],
      [
        { type: 'array', nullable: true, items: { type: ['boolean', 'null'] } },
        'v.nullable(v.array(v.nullable(v.boolean())))',
      ],
      [{ type: 'array', items: { type: 'object' } }, 'v.array(v.object({}))'],
      [
        { type: 'array', items: { type: 'object', nullable: true } },
        'v.array(v.nullable(v.object({})))',
      ],
      [{ type: 'array', items: { type: ['object', 'null'] } }, 'v.array(v.nullable(v.object({})))'],
      [
        { type: 'array', nullable: true, items: { type: ['object', 'null'] } },
        'v.nullable(v.array(v.nullable(v.object({}))))',
      ],
      [
        {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        'v.array(v.array(v.string()))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1 },
        'v.pipe(v.array(v.string()),v.minLength(1))',
      ],
      [
        { type: 'array', items: { type: 'string' }, maxItems: 10 },
        'v.pipe(v.array(v.string()),v.maxLength(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
        'v.pipe(v.array(v.string()),v.minLength(1),v.maxLength(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
        'v.pipe(v.array(v.string()),v.length(5))',
      ],
      [
        {
          type: 'array',
          items: {
            anyOf: [
              {
                type: 'string',
              },
              {
                type: 'number',
              },
              {
                type: 'boolean',
              },
            ],
          },
        },
        'v.array(v.union([v.string(),v.number(),v.boolean()]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' }, 'v.object({})'],
      [{ type: 'object', nullable: true }, 'v.nullable(v.object({}))'],
      [{ type: ['object', 'null'] }, 'v.nullable(v.object({}))'],
      [
        { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
        'v.object({foo:v.string()})',
      ],
      [
        {
          type: 'object',
          properties: { foo: { type: 'string' } },
          required: ['foo'],
          nullable: true,
        },
        'v.nullable(v.object({foo:v.string()}))',
      ],
      [
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['A', 'B', 'C'],
            },
          },
          required: ['type'],
          discriminator: {
            propertyName: 'type',
          },
        },
        'v.object({type:v.picklist(["A","B","C"])})',
      ],
      [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
            },
          },
          required: ['test'],
          additionalProperties: false,
        },
        'v.strictObject({test:v.string()})',
      ],
      [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
            },
          },
          required: ['test'],
          additionalProperties: true,
        },
        'v.looseObject({test:v.string()})',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'date' }, 'v.date()'],
      [{ type: 'date', nullable: true }, 'v.nullable(v.date())'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' }, 'v.nullable(v.null())'],
      [{ type: 'null', nullable: true }, 'v.nullable(v.null())'],
      [{ type: ['null'] }, 'v.nullable(v.null())'],
      [{ type: 'null', default: 'test' }, 'v.nullable(v.null())'],
      [{ type: ['null'], default: 'test' }, 'v.nullable(v.null())'],
      [{ type: 'null', nullable: true, default: 'test' }, 'v.nullable(v.null())'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('any', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          type: 'any' as any,
        },
        'v.any()',
      ],
      [
        {
          type: 'any' as any,
          nullable: true,
        },
        'v.nullable(v.any())',
      ],
      [
        {
          type: ['any', 'null'],
        },
        'v.nullable(v.any())',
      ],
      [
        {
          type: 'any' as any,
          default: 'test',
        },
        'v.optional(v.any(),"test")',
      ],
      [
        {
          type: 'any' as any,
          nullable: true,
          default: 'test',
        },
        'v.optional(v.nullable(v.any()),"test")',
      ],
      [
        {
          type: ['any', 'null'],
          default: 'test',
        },
        'v.optional(v.nullable(v.any()),"test")',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('openapi', () => {
    describe('ref with openapi option', () => {
      it.concurrent.each<[JSONSchema, string]>([
        // schemas → Schema suffix
        [{ $ref: '#/components/schemas/User' }, 'UserSchema'],
        [{ $ref: '#/components/schemas/user-profile' }, 'UserProfileSchema'],
        // parameters → ParamsSchema suffix
        [{ $ref: '#/components/parameters/UserId' }, 'UserIdParamsSchema'],
        // headers → HeaderSchema suffix
        [{ $ref: '#/components/headers/X-Request-Id' }, 'XRequestIdHeaderSchema'],
        // responses → Response suffix
        [{ $ref: '#/components/responses/NotFound' }, 'NotFoundResponse'],
        // securitySchemes → SecurityScheme suffix
        [{ $ref: '#/components/securitySchemes/Bearer' }, 'BearerSecurityScheme'],
        // requestBodies → RequestBody suffix
        [{ $ref: '#/components/requestBodies/CreateUser' }, 'CreateUserRequestBody'],
        // array of refs
        [{ type: 'array', items: { $ref: '#/components/schemas/Pet' } }, 'v.array(PetSchema)'],
        // definitions/$defs fallback (not OpenAPI component path)
        [{ $ref: '#/definitions/Address' }, 'AddressSchema'],
        [{ $ref: '#/$defs/Address' }, 'AddressSchema'],
      ])('valibot(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(valibot(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('ref with openapi and isValibot', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/User' }, 'v.lazy(() => UserSchema)'],
        [{ $ref: '#/components/parameters/UserId' }, 'v.lazy(() => UserIdParamsSchema)'],
        [{ $ref: '#/components/schemas/Tree' }, 'v.lazy(() => TreeSchema)'],
      ])('valibot(%o, "TreeSchema", true, { openapi: true }) → %s', (input, expected) => {
        expect(valibot(input, 'TreeSchema', true, { openapi: true })).toBe(expected)
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
        expect(valibot(schema, 'Schema', false, { openapi: true })).toBe(
          'v.object({pet:PetSchema,owner:v.optional(UserProfileSchema)})',
        )
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(valibot(schema, 'Schema', false, { openapi: true })).toBe(
          'v.union([CatSchema,DogSchema])',
        )
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', 'v.lazy(() => UserSchema)'],
        // Nullable ref with openapi (double-wrapped: ref() wraps, then valibot() wraps again)
        [
          { $ref: '#/components/schemas/Pet', nullable: true },
          'TestSchema',
          'v.nullable(PetSchema)',
        ],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', 'BaseSchema'],
        // anyOf with openapi ref and inline
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          'v.union([ASchema,v.string()])',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', 'MySchemaSchema'],
      ])('valibot(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(valibot(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef)
      [{ $ref: '#SomeRef' }, 'SomeRefSchema'],
      // External file with fragment
      [{ $ref: 'other.json#/definitions/Foo' }, 'v.unknown()'],
      // HTTP URL reference with .json
      [{ $ref: 'https://example.com/schemas/User.json' }, 'User'],
      // HTTP URL without .json
      [{ $ref: 'https://example.com/schemas/User' }, 'User'],
      // Fallback to any (no # and no http)
      [{ $ref: 'relative/path' }, 'v.any()'],
      // Self reference #
      [{ $ref: '#' }, 'v.lazy(() => Schema)'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(valibot({ oneOf: [] })).toBe('v.any()')
    })

    it('should handle empty anyOf', () => {
      expect(valibot({ anyOf: [] })).toBe('v.any()')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle nullable via type array with null', () => {
      expect(valibot({ type: ['string', 'null'] })).toBe('v.nullable(v.string())')
    })

    it('should handle default with nullable', () => {
      expect(valibot({ type: 'string', nullable: true, default: 'x' })).toBe(
        'v.optional(v.nullable(v.string()),"x")',
      )
    })
  })

  describe('readonly option', () => {
    it('should add v.readonly() to object', () => {
      expect(
        valibot(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: true },
        ),
      ).toBe('v.pipe(v.object({name:v.string()}),v.readonly())')
    })

    it('should add v.readonly() to array', () => {
      expect(
        valibot({ type: 'array', items: { type: 'string' } }, 'Schema', false, {
          readonly: true,
        }),
      ).toBe('v.pipe(v.array(v.string()),v.readonly())')
    })

    it('should not add v.readonly() to string', () => {
      expect(valibot({ type: 'string' }, 'Schema', false, { readonly: true })).toBe('v.string()')
    })
  })

  describe('x-brand', () => {
    it('should add v.brand() for string', () => {
      expect(valibot({ type: 'string', 'x-brand': 'UserId' })).toBe(
        'v.pipe(v.string(),v.brand("UserId"))',
      )
    })

    it('should add v.brand() for number with constraints', () => {
      expect(valibot({ type: 'number', minimum: 0, 'x-brand': 'Price' })).toBe(
        'v.pipe(v.pipe(v.number(),v.minValue(0)),v.brand("Price"))',
      )
    })

    it('should add v.brand() after v.nullable()', () => {
      expect(valibot({ type: 'string', nullable: true, 'x-brand': 'Email' })).toBe(
        'v.pipe(v.nullable(v.string()),v.brand("Email"))',
      )
    })

    it('should add v.brand() after v.optional()', () => {
      expect(valibot({ type: 'string', default: 'foo', 'x-brand': 'Name' })).toBe(
        'v.pipe(v.optional(v.string(),"foo"),v.brand("Name"))',
      )
    })

    it('should add v.brand() for integer', () => {
      expect(valibot({ type: 'integer', minimum: 0, 'x-brand': 'Quantity' })).toBe(
        'v.pipe(v.pipe(v.number(),v.integer(),v.minValue(0)),v.brand("Quantity"))',
      )
    })

    it('should add v.brand() for array', () => {
      expect(
        valibot({ type: 'array', items: { type: 'string' }, minItems: 1, 'x-brand': 'Tags' }),
      ).toBe('v.pipe(v.pipe(v.array(v.string()),v.minLength(1)),v.brand("Tags"))')
    })
  })

  describe('code-emitting extensions (unsafeCodeExtensions)', () => {
    const unsafe = { unsafeCodeExtensions: true }

    it('adds v.check action to the pipe', () => {
      expect(
        valibot(
          { type: 'string', 'x-check': 'v.check((input) => input.length > 0, "non-empty")' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('v.pipe(v.string(),v.check((input) => input.length > 0, "non-empty"))')
    })

    it('adds v.transform action to the pipe', () => {
      expect(
        valibot(
          { type: 'string', 'x-transform': 'v.transform((input) => input.toUpperCase())' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('v.pipe(v.string(),v.transform((input) => input.toUpperCase()))')
    })

    it('silently ignores x-check when flag is not set', () => {
      expect(valibot({ type: 'string', 'x-check': 'v.check((input) => input.length > 0)' })).toBe(
        'v.string()',
      )
    })

    it('silently ignores denylisted values', () => {
      expect(
        valibot({ type: 'string', 'x-check': 'v.check(() => eval("x"))' }, 'Schema', false, unsafe),
      ).toBe('v.string()')
    })
  })

  describe('x-fallback', () => {
    it('wraps a plain string with v.fallback()', () => {
      expect(valibot({ type: 'string', 'x-fallback': 'guest' })).toBe(
        'v.fallback(v.string(),"guest")',
      )
    })

    it('wraps a numeric schema with v.fallback()', () => {
      expect(valibot({ type: 'integer', minimum: 0, 'x-fallback': 0 })).toBe(
        'v.fallback(v.pipe(v.number(),v.integer(),v.minValue(0)),0)',
      )
    })

    it('wraps after v.brand() so brand is preserved on success path', () => {
      expect(valibot({ type: 'string', 'x-brand': 'UserId', 'x-fallback': 'anon' })).toBe(
        'v.fallback(v.pipe(v.string(),v.brand("UserId")),"anon")',
      )
    })

    it('accepts boolean fallback value', () => {
      expect(valibot({ type: 'boolean', 'x-fallback': false })).toBe(
        'v.fallback(v.boolean(),false)',
      )
    })
  })

  describe('x-prefixItems-message', () => {
    it('wraps tuple with rawCheck that rewrites element-level messages', () => {
      expect(
        valibot({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'number' }],
          'x-prefixItems-message': 'bad tuple',
        }),
      ).toBe(
        'v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(v.tuple([v.string(),v.number()]),dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:"bad tuple",path:issue.path})}else{addIssue({message:issue.message})}}}}),v.tuple([v.string(),v.number()]))',
      )
    })

    it('falls through to plain tuple when message is absent', () => {
      expect(
        valibot({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'number' }] }),
      ).toBe('v.tuple([v.string(),v.number()])')
    })
  })

  describe('x-items-message', () => {
    it('wraps array with rawCheck that rewrites element-level messages', () => {
      expect(
        valibot({ type: 'array', items: { type: 'string' }, 'x-items-message': 'bad items' }),
      ).toBe(
        'v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(v.array(v.string()),dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:"bad items",path:issue.path})}else{addIssue({message:issue.message})}}}}),v.array(v.string()))',
      )
    })

    it('preserves min/max chain after wrap', () => {
      expect(
        valibot({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 5,
          'x-items-message': 'bad items',
        }),
      ).toBe(
        'v.pipe(v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(v.array(v.string()),dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:"bad items",path:issue.path})}else{addIssue({message:issue.message})}}}}),v.array(v.string())),v.minLength(1),v.maxLength(5))',
      )
    })
  })

  describe('x-implication-message', () => {
    it('takes precedence over x-anyOf-message', () => {
      expect(
        valibot({
          anyOf: [{ type: 'string' }, { type: 'number' }],
          'x-anyOf-message': 'any',
          'x-implication-message': 'implication failed',
        }),
      ).toBe('v.union([v.string(),v.number()],"implication failed")')
    })
  })

  describe('x-length-message', () => {
    it('falls back for minItems when x-minItems-message absent', () => {
      expect(
        valibot({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-length-message': 'bad length',
        }),
      ).toBe('v.pipe(v.array(v.string()),v.minLength(1,"bad length"))')
    })
  })

  describe('paramIn coercion', () => {
    it('query: integer → string transform', () => {
      expect(valibot({ type: 'integer' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())',
      )
    })

    it('query: number → string transform', () => {
      expect(valibot({ type: 'number' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/),v.transform((input)=>Number(input)),v.number(),v.finite())',
      )
    })

    it("path: boolean → picklist('true'|'false') transform", () => {
      expect(valibot({ type: 'boolean' }, 'Schema', false, { paramIn: 'path' })).toBe(
        'v.pipe(v.string(),v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),v.transform((input)=>/^(?:true|1|yes|on|y|enabled)$/i.test(input)))',
      )
    })

    it('no paramIn: integer → v.pipe(v.number(),v.integer())', () => {
      expect(valibot({ type: 'integer' })).toBe('v.pipe(v.number(),v.integer())')
    })

    it('x-coerce: false overrides paramIn (user opt-out wins)', () => {
      expect(
        valibot({ type: 'integer', 'x-coerce': false }, 'Schema', false, { paramIn: 'query' }),
      ).toBe('v.pipe(v.number(),v.integer())')
    })

    it('query: integer with default → default emitted as string-wire literal', () => {
      expect(
        valibot({ type: 'integer', default: 1, minimum: 1 }, 'Schema', false, { paramIn: 'query' }),
      ).toBe(
        'v.optional(v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger(),v.minValue(1)),"1")',
      )
    })

    it('query: number with default → default emitted as string-wire literal', () => {
      expect(valibot({ type: 'number', default: 2.5 }, 'Schema', false, { paramIn: 'query' })).toBe(
        'v.optional(v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/),v.transform((input)=>Number(input)),v.number(),v.finite()),"2.5")',
      )
    })

    it('path: boolean with default → default emitted as string-wire literal', () => {
      expect(
        valibot({ type: 'boolean', default: true }, 'Schema', false, { paramIn: 'path' }),
      ).toBe(
        'v.optional(v.pipe(v.string(),v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),v.transform((input)=>/^(?:true|1|yes|on|y|enabled)$/i.test(input))),"true")',
      )
    })

    it('no paramIn: integer with default keeps the numeric default (no string-wire coercion)', () => {
      expect(valibot({ type: 'integer', default: 1 })).toBe(
        'v.optional(v.pipe(v.number(),v.integer()),1)',
      )
    })
  })

  describe('x-unevaluatedProperties-message', () => {
    it('switches to v.strictObject with the message as second argument', () => {
      expect(
        valibot({
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          unevaluatedProperties: false,
          'x-unevaluatedProperties-message': 'no extras',
        }),
      ).toBe('v.strictObject({a:v.string()},"no extras")')
    })
  })

  describe('x-unevaluatedItems-message (prefixItems tuple)', () => {
    it('emits v.strictTuple with the message when unevaluatedItems: false', () => {
      expect(
        valibot({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: false,
          'x-unevaluatedItems-message': 'no extras',
        }),
      ).toBe('v.strictTuple([v.string(),v.boolean()],"no extras")')
    })

    it('emits v.tupleWithRest when unevaluatedItems is a schema', () => {
      expect(
        valibot({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: { type: 'integer' },
        }),
      ).toBe('v.tupleWithRest([v.string(),v.boolean()],v.pipe(v.number(),v.integer()))')
    })
  })
})

describe('valibot not: $ref / type arrays / combinators / message', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { not: { $ref: '#/components/schemas/Foo' } },
      'v.custom<unknown>((input) => !v.safeParse(FooSchema,input).success)',
    ],
    [
      { not: { type: ['string', 'number'] } },
      "v.custom<unknown>((input) => (typeof input !== 'string') && (typeof input !== 'number'))",
    ],
    [{ not: { type: 'number' } }, "v.custom<unknown>((input) => typeof input !== 'number')"],
    [{ not: { type: 'array' } }, 'v.custom<unknown>((input) => !Array.isArray(input))'],
    [
      { not: { type: 'object' } },
      "v.custom<unknown>((input) => typeof input !== 'object' || input === null || Array.isArray(input))",
    ],
    [{ not: { type: 'null' } }, 'v.custom<unknown>((input) => input !== null)'],
    [
      { not: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
      'v.custom<unknown>((input) => !v.safeParse(v.union([v.string(),v.number()]),input).success)',
    ],
    [
      { not: { type: 'string' }, 'x-not-message': 'no strings' },
      `v.custom<unknown>((input) => typeof input !== 'string',"no strings")`,
    ],
    [
      { not: { format: 'email' } },
      'v.custom<unknown>((input) => !v.safeParse(v.any(),input).success)',
    ],
  ])('valibot(%o) → %s', (input, expected) => {
    expect(valibot(input)).toBe(expected)
  })
})

describe('valibot contains / minContains / maxContains', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' } },
      'v.pipe(v.array(v.number()),v.check((input)=>input.some((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success)))',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        'x-contains-message': 'need int',
      },
      'v.pipe(v.array(v.number()),v.check((input)=>input.some((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success),"need int"))',
    ],
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' }, minContains: 2 },
      'v.pipe(v.array(v.number()),v.check((input)=>input.filter((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success).length>=2))',
    ],
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' }, maxContains: 3 },
      'v.pipe(v.array(v.number()),v.check((input)=>input.filter((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success).length>=1),v.check((input)=>input.filter((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success).length<=3))',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        minContains: 1,
        maxContains: 2,
        'x-minContains-message': 'few',
        'x-maxContains-message': 'many',
      },
      'v.pipe(v.array(v.number()),v.check((input)=>input.filter((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success).length>=1,"few"),v.check((input)=>input.filter((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success).length<=2,"many"))',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        minContains: 0,
        maxContains: 2,
      },
      'v.pipe(v.array(v.number()),v.check((input)=>input.filter((item)=>v.safeParse(v.pipe(v.number(),v.integer()),item).success).length<=2))',
    ],
  ])('valibot(%o) → %s', (input, expected) => {
    expect(valibot(input)).toBe(expected)
  })

  describe('#99: wire bigint, binary files and RFC 3339 times', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        { type: 'integer', format: 'bigint' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?\\d+$/),v.transform((input)=>BigInt(input)),v.bigint())',
      ],
      [{ type: 'string', format: 'binary' }, undefined, 'v.file()'],
      [
        { type: 'string', format: 'time' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/))',
      ],
      [
        { type: 'boolean' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),v.transform((input)=>/^(?:true|1|yes|on|y|enabled)$/i.test(input)))',
      ],
    ])('valibot(%o, %o) → %s', (schema, options, expected) => {
      expect(valibot(schema, 'Schema', false, options)).toBe(expected)
    })
  })

  describe('#102: the wire-parameter coercion of #96', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        { type: 'array', items: { type: 'integer' } },
        { paramIn: 'query' },
        'v.pipe(v.unknown(),v.transform((input)=>(input===undefined||Array.isArray(input)?input:[input])),v.array(v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())))',
      ],
      [
        { type: 'integer', enum: [1, 2] },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.union([v.literal(1),v.literal(2)]))',
      ],
      [
        { type: 'boolean', const: true },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^(?:true|1|yes|on|y|enabled|false|0|no|off|n|disabled)$/i),v.transform((input)=>/^(?:true|1|yes|on|y|enabled)$/i.test(input)),v.literal(true))',
      ],
      [
        { type: 'integer', nullable: true },
        { paramIn: 'query' },
        "v.pipe(v.unknown(),v.transform((input)=>(input==='null'?null:input)),v.nullable(v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())))",
      ],
      [
        { oneOf: [{ type: 'integer' }, { type: 'null' }] },
        { paramIn: 'query' },
        "v.pipe(v.unknown(),v.transform((input)=>(input==='null'?null:input)),v.nullable(v.union([v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger()),v.pipe(v.unknown(),v.transform((input)=>(input==='null'?null:input)),v.nullable(v.null()))])))",
      ],
      [
        { minimum: 1 },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/),v.transform((input)=>Number(input)),v.number(),v.finite(),v.minValue(1))',
      ],
      [{ maxLength: 3 }, { paramIn: 'query' }, 'v.pipe(v.string(),v.maxCodePoints(3))'],
      [
        { type: 'integer', not: { const: 0 } },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger(),v.check((input) => input !== 0))',
      ],
      [
        { type: ['integer', 'string'] },
        { paramIn: 'query' },
        'v.union([v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger()),v.string()])',
      ],
      [{ type: ['string', 'number'] }, undefined, 'v.union([v.string(),v.number()])'],
      [
        { type: 'integer', format: 'int64' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?\\d+$/),v.transform((input)=>BigInt(input)),v.minValue(-9223372036854775808n),v.maxValue(9223372036854775807n))',
      ],
      [
        { type: 'integer', format: 'uint64' },
        undefined,
        'v.pipe(v.union([v.bigint(),v.pipe(v.number(),v.integer()),v.pipe(v.string(),v.regex(/^-?\\d+$/))]),v.transform((input)=>BigInt(input)),v.minValue(0n),v.maxValue(18446744073709551615n))',
      ],
      [
        { type: 'integer', format: 'int64', enum: [1, 2] },
        undefined,
        'v.pipe(v.union([v.bigint(),v.pipe(v.number(),v.integer()),v.pipe(v.string(),v.regex(/^-?\\d+$/))]),v.transform((input)=>BigInt(input)),v.union([v.literal(1n),v.literal(2n)]))',
      ],
      [{ type: 'string', format: 'nanoid' }, undefined, 'v.pipe(v.string(),v.nanoid())'],
      [{ type: 'string', format: 'cuid2' }, undefined, 'v.pipe(v.string(),v.cuid2())'],
      [{ type: 'string', format: 'ulid' }, undefined, 'v.pipe(v.string(),v.ulid())'],
      [{ type: 'string', format: 'mac' }, undefined, 'v.pipe(v.string(),v.mac())'],
      [{ type: 'string', format: 'hex' }, undefined, 'v.pipe(v.string(),v.hexadecimal())'],
      [{ type: 'string', format: 'url' }, undefined, 'v.pipe(v.string(),v.url())'],
      [
        { type: 'string', format: 'httpUrl' },
        undefined,
        'v.pipe(v.string(),v.url(),v.regex(/^https?:\\/\\//))',
      ],
      [
        { type: 'string', format: 'uuidv4' },
        undefined,
        'v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/))',
      ],
      [
        { type: 'string', format: 'uuid', 'x-uuidVersion': 'v7' },
        undefined,
        'v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$/))',
      ],
      [
        { type: 'string', format: 'base64url' },
        undefined,
        'v.pipe(v.string(),v.regex(/^[A-Za-z0-9_-]*$/))',
      ],
      [
        { type: 'string', format: 'hostname' },
        undefined,
        'v.pipe(v.string(),v.regex(/^(?=.{1,253}\\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\\.?$/))',
      ],
      [
        { type: 'string', format: 'guid' },
        undefined,
        'v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/))',
      ],
      [
        { type: 'string', format: 'e164' },
        undefined,
        'v.pipe(v.string(),v.regex(/^\\+[1-9]\\d{6,14}$/))',
      ],
      [
        { type: 'string', format: 'cidrv4' },
        undefined,
        'v.pipe(v.string(),v.regex(/^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\/([0-9]|[1-2][0-9]|3[0-2])$/))',
      ],
      [
        { type: 'string', format: 'duration' },
        undefined,
        'v.pipe(v.string(),v.regex(/^P(?:(\\d+W)|(?!.*W)(?=\\d|T\\d)(\\d+Y)?(\\d+M)?(\\d+D)?(T(?=\\d)(\\d+H)?(\\d+M)?(\\d+([.,]\\d+)?S)?)?)$/))',
      ],
      [{ type: 'string', format: 'trim' }, undefined, 'v.pipe(v.string(),v.trim())'],
      [
        { type: 'string', format: 'email', 'x-trim': true },
        undefined,
        'v.pipe(v.string(),v.trim(),v.email())',
      ],
      [
        // A `constructor` key in an object literal is checked against Object's own member.
        { type: 'object', properties: Object.fromEntries([['constructor', { type: 'integer' }]]) },
        { paramIn: 'query' },
        'v.pipe(v.unknown(),v.transform((input)=>(typeof input==="object"&&input!==null&&!Array.isArray(input)?Object.assign(Object.create(null),input):input)),v.partial(v.object({constructor:v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())})))',
      ],
      [
        { type: 'object', properties: { int_def: { type: 'integer', default: 20 } } },
        { paramIn: 'query' },
        'v.object({int_def:v.optional(v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger()),"20")})',
      ],
      [
        {
          type: 'object',
          properties: { a: { type: 'string', default: 'x' }, b: { type: 'string' } },
        },
        undefined,
        'v.object({a:v.optional(v.string(),"x"),b:v.optional(v.string())})',
      ],
      [
        { type: 'number' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/),v.transform((input)=>Number(input)),v.number(),v.finite())',
      ],
      [
        { type: 'number', format: 'float32' },
        undefined,
        'v.pipe(v.number(),v.minValue(-3.4028234663852886e38),v.maxValue(3.4028234663852886e38))',
      ],
      [
        { type: 'integer' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())',
      ],
      [
        { type: 'integer', format: 'int32' },
        undefined,
        'v.pipe(v.number(),v.integer(),v.minValue(-2147483648),v.maxValue(2147483647))',
      ],
      [
        { type: 'integer', format: 'uint32' },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger(),v.minValue(0),v.maxValue(4294967295))',
      ],
      [
        { type: 'string', format: 'date' },
        undefined,
        'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$/))',
      ],
      [
        { type: 'string', format: 'date-time', 'x-isoPrecision': 3 },
        { paramIn: 'query' },
        'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{3}(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$/))',
      ],
      [
        { type: 'string', format: 'date-time', 'x-isoOffset': false, 'x-isoLocal': true },
        undefined,
        'v.pipe(v.string(),v.regex(/^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z)|(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?)$/))',
      ],
      [
        { type: 'string', format: 'time', 'x-isoPrecision': -1 },
        undefined,
        'v.pipe(v.string(),v.regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)?$/))',
      ],
      [
        { type: 'string', format: 'time', 'x-isoOffset': false },
        undefined,
        'v.pipe(v.string(),v.regex(/^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?$/))',
      ],
      [
        { type: 'array', items: { type: 'integer' } },
        { paramIn: 'query', explode: false },
        "v.pipe(v.unknown(),v.transform((input)=>{if(typeof input!=='string')return input;const text=input;return (text===''?[]:text.split(\",\"))}),v.unknown(),v.transform((input)=>(input===undefined||Array.isArray(input)?input:[input])),v.array(v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())))",
      ],
      [
        { type: 'object', properties: { age: { type: 'integer' } } },
        { paramIn: 'query', style: 'deepObject' },
        "v.pipe(v.unknown(),v.transform((input)=>{if(typeof input!=='object'||input===null||Array.isArray(input))return input;const out=Object.entries(input).reduce<{[k:string]:unknown}>((acc,[key,value])=>{const name=/^[^[\\]]+\\[([^\\]]+)\\]$/u.exec(key)?.[1];return name===undefined?acc:{...acc,[name]:value}},{});return Object.keys(out).length>0?out:input}),v.partial(v.object({age:v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger())})))",
      ],
      [
        { type: 'object', properties: { id: { type: 'integer' } } },
        { paramIn: 'query', contentType: 'application/json' },
        "v.pipe(v.unknown(),v.transform((input)=>{if(typeof input!=='string')return input;try{return JSON.parse(input)}catch{return input}}),v.partial(v.object({id:v.pipe(v.number(),v.integer())})))",
      ],
      [
        { type: 'string' },
        { paramIn: 'query', allowEmptyValue: true },
        "v.pipe(v.unknown(),v.transform((input)=>(input===''?undefined:input)),v.string())",
      ],
    ])('valibot(%o, %o) → %s', (schema, options, expected) => {
      expect(valibot(schema, 'Schema', false, options)).toBe(expected)
    })
  })

  describe('#105: minLength / maxLength count code points', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        { type: 'string', minLength: 2, maxLength: 4 },
        undefined,
        'v.pipe(v.string(),v.minCodePoints(2),v.maxCodePoints(4))',
      ],
      [
        { type: 'string', minLength: 6, maxLength: 6, 'x-length-message': 'six' },
        undefined,
        'v.pipe(v.string(),v.codePoints(6))',
      ],
    ])('valibot(%o, %o) → %s', (schema, options, expected) => {
      expect(valibot(schema, 'Schema', false, options)).toBe(expected)
    })
  })

  describe('#106: a $ref beside a default is wrapped once', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        {
          type: 'object',
          properties: { ref_def: { $ref: '#/components/schemas/Count', default: 3 } },
        },
        { paramIn: 'query' },
        'v.object({ref_def:v.optional(CountSchema,"3")})',
      ],
      [{ $ref: '#/components/schemas/Count', default: 3 }, undefined, 'v.optional(CountSchema,3)'],
      [
        { $ref: '#/components/schemas/Count', nullable: true },
        undefined,
        'v.nullable(CountSchema)',
      ],
    ])('valibot(%o, %o) → %s', (schema, options, expected) => {
      expect(valibot(schema, 'Schema', false, options)).toBe(expected)
    })
  })
})

describe('allOf keyword members', () => {
  it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
    [
      { allOf: [{ type: 'integer' }, { minimum: 5 }] },
      undefined,
      'v.pipe(v.number(),v.integer(),v.minValue(5))',
    ],
    [
      { allOf: [{ minimum: 5 }] },
      undefined,
      "v.pipe(v.any(),v.check((input) => (typeof input !== 'number' || (input >= 5))))",
    ],
    [
      { allOf: [{ type: 'integer' }, { minimum: 5 }] },
      { paramIn: 'query' },
      'v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)$/),v.transform((input)=>Number(input)),v.number(),v.safeInteger(),v.minValue(5))',
    ],
  ])('valibot(%o, %o) → %s', (schema, options, expected) => {
    expect(valibot(schema, 'Schema', false, options)).toBe(expected)
  })
})
