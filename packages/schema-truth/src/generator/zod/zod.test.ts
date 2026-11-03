import { describe, expect, it } from 'vite-plus/test'

import type { EmitOptions } from '../../options/index.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { zod } from './zod.js'

describe('zod', () => {
  describe('ref', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/Test' }, 'TestSchema'],
      [
        {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Test',
          },
        },
        'z.array(TestSchema)',
      ],
    ])('zod(%o) → %s', (input, expected) => {
      expect(zod(input)).toBe(expected)
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
        'z.xor([z.object({kind:z.literal("A")}),z.object({kind:z.literal("B")})]).nullable()',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'z.xor([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'z.xor([ASchema,BSchema]).nullable()',
      ],
      [
        {
          type: ['object', 'null'],
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'z.xor([ASchema,BSchema]).nullable()',
      ],
    ])('zod(%o) → %s', (input, expected) => {
      expect(zod(input)).toBe(expected)
    })

    // anyOf
    // not support zod-to-openapi
    describe('anyOf', () => {
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
          'z.xor([z.object({kind:z.literal("A")}),z.object({kind:z.literal("B")})]).nullable()',
        ],
        [
          {
            type: 'object',
            oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          },
          'z.xor([ASchema,BSchema])',
        ],
        [
          {
            type: 'object',
            oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
            nullable: true,
          },
          'z.xor([ASchema,BSchema]).nullable()',
        ],
        [
          {
            type: ['object', 'null'],
            oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          },
          'z.xor([ASchema,BSchema]).nullable()',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    // allOf
    // not support zod
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
          'z.intersection(GeoJsonObjectSchema,z.object({type:z.enum(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon","GeometryCollection"])})).meta({description:"Abstract type for all GeoJSon object except Feature and FeatureCollection\\n",externalDocs:{url:"https://tools.ietf.org/html/rfc7946#section-3"}})',
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
          'z.intersection(GeoJsonObjectSchema,z.object({geometry:GeometrySchema.nullable(),properties:z.object({}).nullable(),id:z.xor([z.number(),z.string()]).exactOptional()})).meta({description:"GeoJSon \'Feature\' object",externalDocs:{url:"https://tools.ietf.org/html/rfc7946#section-3.2"}})',
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
          'z.intersection(z.object({a:z.string()}),z.object({b:z.string()}))',
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
          'z.intersection(z.object({a:z.string()}),z.object({b:z.string()})).nullable()',
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
          'z.intersection(z.object({a:z.string()}),z.object({b:z.string()})).nullable()',
        ],
        // 3+ element allOf is left-folded into nested binary intersections because
        // Zod's `z.intersection(a, b)` API is strictly 2-ary.
        // Flat `z.intersection(a, b, c)` was emitted before but errored at runtime.
        [
          {
            allOf: [
              { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
              { type: 'object', required: ['b'], properties: { b: { type: 'string' } } },
              { type: 'object', required: ['c'], properties: { c: { type: 'string' } } },
            ],
          },
          'z.intersection(z.intersection(z.object({a:z.string()}),z.object({b:z.string()})),z.object({c:z.string()}))',
        ],
        [
          {
            allOf: [
              { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
              { type: 'object', required: ['b'], properties: { b: { type: 'string' } } },
              { type: 'object', required: ['c'], properties: { c: { type: 'string' } } },
              { type: 'object', required: ['d'], properties: { d: { type: 'string' } } },
            ],
          },
          'z.intersection(z.intersection(z.intersection(z.object({a:z.string()}),z.object({b:z.string()})),z.object({c:z.string()})),z.object({d:z.string()}))',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('not', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ not: { type: 'string' } }, "z.any().refine((val) => typeof val !== 'string')"],
        [
          { not: { type: 'integer' } },
          "z.any().refine((val) => typeof val !== 'number' || !Number.isInteger(val))",
        ],
        [{ not: { type: 'boolean' } }, "z.any().refine((val) => typeof val !== 'boolean')"],
        [
          { not: { type: 'string' }, nullable: true },
          "z.any().refine((val) => typeof val !== 'string').nullable()",
        ],
        [
          { not: { type: 'string' }, type: ['null'] },
          "z.null().nullable().refine((val) => typeof val !== 'string')",
        ],
        [{ type: 'integer', not: { const: 0 } }, 'z.int().refine((val) => val !== 0)'],
        [
          { type: 'integer', not: { const: 0 }, 'x-not-message': 'not zero' },
          'z.int().refine((val) => val !== 0,{error:"not zero"})',
        ],
        [{ type: 'integer', not: { format: 'int32' } }, 'z.int()'],
        [{ not: { const: 42 } }, 'z.any().refine((val) => val !== 42)'],
        [{ not: { enum: ['a', 'b'] } }, 'z.any().refine((val) => !["a","b"].includes(val))'],
        [
          { type: 'integer', format: 'int64', not: { enum: [0] } },
          String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).refine((val) => ![0n].includes(val))`,
        ],
        [
          { type: 'integer', format: 'int64', not: { const: 0 } },
          String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).refine((val) => val !== 0n)`,
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('const', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ const: 'fixed' }, 'z.literal("fixed")'],
        [{ const: 'fixed', nullable: true }, 'z.literal("fixed").nullable()'],
        [{ type: ['null'], const: 'fixed' }, 'z.literal("fixed").nullable()'],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('enum', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ enum: ['A', 'B'] }, 'z.enum(["A","B"])'],
        [{ enum: ['A', 'B'], type: ['string'], nullable: true }, 'z.enum(["A","B"]).nullable()'],
        [{ enum: ['A', 'B'], type: ['string', 'null'] }, 'z.enum(["A","B"]).nullable()'],
        [{ enum: [1, 2] }, 'z.union([z.literal(1),z.literal(2)])'],
        [
          { enum: [1, 2], type: ['number'], nullable: true },
          'z.union([z.literal(1),z.literal(2)]).nullable()',
        ],
        [
          { enum: [1, 2], type: ['number', 'null'] },
          'z.union([z.literal(1),z.literal(2)]).nullable()',
        ],
        [{ enum: [true, false] }, 'z.union([z.literal(true),z.literal(false)])'],
        [
          { enum: [true, false], type: ['boolean'], nullable: true },
          'z.union([z.literal(true),z.literal(false)]).nullable()',
        ],
        [
          { enum: [true, false], type: ['boolean', 'null'] },
          'z.union([z.literal(true),z.literal(false)]).nullable()',
        ],
        [{ enum: [null] }, 'z.literal(null)'],
        [{ enum: [null], type: ['null'] }, 'z.literal(null).nullable()'],
        [{ enum: ['abc'] }, `z.literal('abc')`],
        [{ enum: ['abc'], type: ['string'], nullable: true }, `z.literal('abc').nullable()`],
        [{ enum: ['abc'], type: ['string', 'null'] }, `z.literal('abc').nullable()`],
        [{ type: 'array', enum: [[1, 2]] }, 'z.tuple([z.literal(1),z.literal(2)])'],
        [
          { type: 'array', nullable: true, enum: [[1, 2]] },
          'z.tuple([z.literal(1),z.literal(2)]).nullable()',
        ],
        [
          { type: ['array', 'null'], enum: [[1, 2]] },
          'z.tuple([z.literal(1),z.literal(2)]).nullable()',
        ],
        [
          {
            type: 'array',
            enum: [
              [1, 2],
              [3, 4],
            ],
          },
          'z.union([z.tuple([z.literal(1),z.literal(2)]),z.tuple([z.literal(3),z.literal(4)])])',
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
          'z.union([z.tuple([z.literal(1),z.literal(2)]),z.tuple([z.literal(3),z.literal(4)])]).nullable()',
        ],
        [
          {
            type: ['array', 'null'],
            enum: [
              [1, 2],
              [3, 4],
            ],
          },
          'z.union([z.tuple([z.literal(1),z.literal(2)]),z.tuple([z.literal(3),z.literal(4)])]).nullable()',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('string', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'string' }, 'z.string()'],
        [{ type: ['string'], nullable: true }, 'z.string().nullable()'],
        [{ type: ['string', 'null'] }, 'z.string().nullable()'],
        [{ type: 'string', minLength: 1, maxLength: 10 }, 'z.string().min(1).max(10)'],
        [{ type: 'string', pattern: '^\\w+$' }, 'z.string().regex(/^\\w+$/)'],
        [{ type: 'string', default: 'test' }, 'z.string().default("test")'],
        [
          { type: 'string', default: 'test', nullable: true },
          'z.string().nullable().default("test")',
        ],
        [{ type: ['string', 'null'], default: 'test' }, 'z.string().nullable().default("test")'],
        [{ type: 'string', format: 'email' }, 'z.email()'],
        [{ type: 'string', format: 'uuid' }, 'z.uuid()'],
        [{ type: 'string', format: 'uuidv4' }, 'z.uuidv4()'],
        [{ type: 'string', format: 'uuidv7' }, 'z.uuidv7()'],
        [{ type: 'string', format: 'uri' }, 'z.url()'],
        [{ type: 'string', format: 'emoji' }, 'z.emoji()'],
        [{ type: 'string', format: 'base64' }, 'z.base64()'],
        [{ type: 'string', format: 'nanoid' }, 'z.nanoid()'],
        [{ type: 'string', format: 'cuid' }, 'z.cuid()'],
        [{ type: 'string', format: 'cuid2' }, 'z.cuid2()'],
        [{ type: 'string', format: 'ulid' }, 'z.ulid()'],
        [{ type: 'string', format: 'ipv4' }, 'z.ipv4()'],
        [{ type: 'string', format: 'ipv6' }, 'z.ipv6()'],
        [{ type: 'string', format: 'cidrv4' }, 'z.cidrv4()'],
        [{ type: 'string', format: 'cidrv6' }, 'z.cidrv6()'],
        [{ type: 'string', format: 'date' }, 'z.iso.date()'],
        [
          { type: 'string', format: 'time' },
          String.raw`z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)`,
        ],
        [{ type: 'string', format: 'date-time' }, 'z.iso.datetime({offset:true})'],
        [{ type: 'string', format: 'duration' }, 'z.iso.duration()'],
        [{ type: 'string', format: 'binary' }, 'z.file()'],
        [{ type: 'string', format: 'toLowerCase' }, 'z.string().toLowerCase()'],
        [{ type: 'string', format: 'toUpperCase' }, 'z.string().toUpperCase()'],
        [{ type: 'string', format: 'trim' }, 'z.string().trim()'],
        [{ type: 'string', format: 'jwt' }, 'z.jwt()'],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })

      describe('number', () => {
        describe('type: number', () => {
          it.concurrent.each<[JSONSchema, string]>([
            [{ type: 'number' }, 'z.number()'],
            [{ type: ['number'], nullable: true }, 'z.number().nullable()'],
            [{ type: ['number', 'null'] }, 'z.number().nullable()'],
            [
              {
                type: 'number',
                minimum: 0,
                exclusiveMinimum: true,
              },
              'z.number().positive()',
            ],
            [
              {
                type: 'number',
                minimum: 0,
                exclusiveMinimum: false,
              },
              'z.number().nonnegative()',
            ],
            [{ type: 'number', maximum: 0, exclusiveMaximum: true }, 'z.number().negative()'],
            [{ type: 'number', maximum: 0, exclusiveMaximum: false }, 'z.number().nonpositive()'],
            [{ type: 'number', minimum: 100 }, 'z.number().min(100)'],
            [{ type: 'number', minimum: 0 }, 'z.number().min(0)'],
            [{ type: 'number', minimum: 100, exclusiveMinimum: true }, 'z.number().gt(100)'],
            [{ type: 'number', maximum: 100 }, 'z.number().max(100)'],
            [{ type: 'number', maximum: 0 }, 'z.number().max(0)'],
            [{ type: 'number', maximum: 100, exclusiveMaximum: true }, 'z.number().lt(100)'],
            [{ type: 'number', multipleOf: 2 }, 'z.number().multipleOf(2)'],
            [{ type: 'number', default: 100 }, 'z.number().default(100)'],
            [
              { type: 'number', default: 100, nullable: true },
              'z.number().nullable().default(100)',
            ],
            [{ type: ['number', 'null'], default: 100 }, 'z.number().nullable().default(100)'],
          ])('zod(%o) → %s', (input, expected) => {
            expect(zod(input)).toBe(expected)
          })
        })

        describe('type: number, format: float', () => {
          it.concurrent.each<[JSONSchema, string]>([
            [{ type: 'number', format: 'float' }, 'z.float32()'],
            [{ type: 'number', format: 'float', nullable: true }, 'z.float32().nullable()'],
            [
              { type: ['number', 'null'], format: 'float', nullable: true },
              'z.float32().nullable()',
            ],
            [{ type: 'number', format: 'float64' }, 'z.float64()'],
            [{ type: 'number', format: 'float64', nullable: true }, 'z.float64().nullable()'],
            [
              { type: ['number', 'null'], format: 'float64', nullable: true },
              'z.float64().nullable()',
            ],
          ])('zod(%o) → %s', (input, expected) => {
            expect(zod(input)).toBe(expected)
          })
        })
      })

      describe('integer', () => {
        describe('type: integer', () => {
          it.concurrent.each<[JSONSchema, string]>([
            [{ type: 'integer' }, 'z.int()'],
            [{ type: ['integer'], nullable: true }, 'z.int().nullable()'],
            [{ type: ['integer', 'null'] }, 'z.int().nullable()'],
            [{ type: 'integer', minimum: 0, exclusiveMinimum: true }, 'z.int().positive()'],
            [{ type: 'integer', minimum: 0, exclusiveMinimum: false }, 'z.int().nonnegative()'],
            [{ type: 'integer', maximum: 0, exclusiveMaximum: true }, 'z.int().negative()'],
            [{ type: 'integer', maximum: 0, exclusiveMaximum: false }, 'z.int().nonpositive()'],
            [{ type: 'integer', minimum: 100 }, 'z.int().min(100)'],
            [{ type: 'integer', minimum: 0 }, 'z.int().min(0)'],
            [{ type: 'integer', minimum: 100, exclusiveMinimum: true }, 'z.int().gt(100)'],
            [{ type: 'integer', maximum: 100 }, 'z.int().max(100)'],
            [{ type: 'integer', maximum: 0 }, 'z.int().max(0)'],
            [{ type: 'integer', maximum: 100, exclusiveMaximum: true }, 'z.int().lt(100)'],
            [{ type: 'integer', exclusiveMaximum: 100 }, 'z.int().lt(100)'],
            [{ type: 'integer', multipleOf: 2 }, 'z.int().multipleOf(2)'],
            [{ type: 'integer', default: 100 }, 'z.int().default(100)'],
            [{ type: 'integer', default: 100, nullable: true }, 'z.int().nullable().default(100)'],
            [{ type: ['integer', 'null'], default: 100 }, 'z.int().nullable().default(100)'],
          ])('zod(%o) → %s', (input, expected) => {
            expect(zod(input)).toBe(expected)
          })
        })

        describe('type: integer, format: int32', () => {
          it.concurrent.each<[JSONSchema, string]>([
            [{ type: 'integer', format: 'int32' }, 'z.int32()'],
            [{ type: 'integer', format: 'int32', nullable: true }, 'z.int32().nullable()'],
            [{ type: ['integer', 'null'], format: 'int32' }, 'z.int32().nullable()'],
            [
              { type: 'integer', format: 'int32', minimum: 0, exclusiveMinimum: true },
              'z.int32().positive()',
            ],
            [
              { type: 'integer', format: 'int32', minimum: 0, exclusiveMinimum: false },
              'z.int32().nonnegative()',
            ],
            [
              { type: 'integer', format: 'int32', maximum: 0, exclusiveMaximum: true },
              'z.int32().negative()',
            ],
            [
              { type: 'integer', format: 'int32', maximum: 0, exclusiveMaximum: false },
              'z.int32().nonpositive()',
            ],
            [{ type: 'integer', format: 'int32', minimum: 100 }, 'z.int32().min(100)'],
            [{ type: 'integer', format: 'int32', minimum: 0 }, 'z.int32().min(0)'],
            [
              { type: 'integer', format: 'int32', minimum: 100, exclusiveMinimum: true },
              'z.int32().gt(100)',
            ],
            [{ type: 'integer', format: 'int32', maximum: 100 }, 'z.int32().max(100)'],
            [{ type: 'integer', format: 'int32', maximum: 0 }, 'z.int32().max(0)'],
            [
              { type: 'integer', format: 'int32', maximum: 100, exclusiveMaximum: true },
              'z.int32().lt(100)',
            ],
            [{ type: 'integer', format: 'int32', exclusiveMaximum: 100 }, 'z.int32().lt(100)'],
            [{ type: 'integer', format: 'int32', multipleOf: 2 }, 'z.int32().multipleOf(2)'],
            [{ type: 'integer', format: 'int32', default: 100 }, 'z.int32().default(100)'],
            [
              { type: 'integer', format: 'int32', default: 100, nullable: true },
              'z.int32().nullable().default(100)',
            ],
            [
              { type: ['integer', 'null'], format: 'int32', default: 100 },
              'z.int32().nullable().default(100)',
            ],
          ])('zod(%o) → %s', (input, expected) => {
            expect(zod(input)).toBe(expected)
          })
        })

        describe('type: integer, format: int64', () => {
          it.concurrent.each<[JSONSchema, string]>([
            [
              { type: 'integer', format: 'int64' },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64())`,
            ],
            [
              { type: 'integer', format: 'int64', nullable: true },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).nullable()`,
            ],
            [
              { type: ['integer', 'null'], format: 'int64' },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).nullable()`,
            ],
            [
              { type: 'integer', format: 'int64', minimum: 0, exclusiveMinimum: true },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().positive())`,
            ],
            [
              { type: 'integer', format: 'int64', minimum: 0, exclusiveMinimum: false },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().nonnegative())`,
            ],
            [
              { type: 'integer', format: 'int64', maximum: 0, exclusiveMaximum: true },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().negative())`,
            ],
            [
              { type: 'integer', format: 'int64', maximum: 0, exclusiveMaximum: false },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().nonpositive())`,
            ],
            [
              { type: 'integer', format: 'int64', minimum: 100 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().min(100n))`,
            ],
            [
              { type: 'integer', format: 'int64', minimum: 0 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().min(0n))`,
            ],
            [
              { type: 'integer', format: 'int64', minimum: 100, exclusiveMinimum: true },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().gt(100n))`,
            ],
            [
              { type: 'integer', format: 'int64', maximum: 100 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().max(100n))`,
            ],
            [
              { type: 'integer', format: 'int64', maximum: 0 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().max(0n))`,
            ],
            [
              { type: 'integer', format: 'int64', maximum: 100, exclusiveMaximum: true },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().lt(100n))`,
            ],
            [
              { type: 'integer', format: 'int64', exclusiveMaximum: 100 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().lt(100n))`,
            ],
            [
              { type: 'integer', format: 'int64', multipleOf: 2 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64().multipleOf(2n))`,
            ],
            [
              { type: 'integer', format: 'int64', default: 100 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).default(100n)`,
            ],
            [
              { type: 'integer', format: 'int64', default: 100, nullable: true },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).nullable().default(100n)`,
            ],
            [
              { type: ['integer', 'null'], format: 'int64', default: 100 },
              String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).nullable().default(100n)`,
            ],
          ])('zod(%o) → %s', (input, expected) => {
            expect(zod(input)).toBe(expected)
          })
        })

        describe('type: integer, format: bigint', () => {
          it.concurrent.each<[JSONSchema, string]>([
            [{ type: 'integer', format: 'bigint' }, 'z.bigint()'],
            [{ type: 'integer', format: 'bigint', nullable: true }, 'z.bigint().nullable()'],
            [{ type: ['integer', 'null'], format: 'bigint' }, 'z.bigint().nullable()'],
            [
              { type: 'integer', format: 'bigint', minimum: 0, exclusiveMinimum: true },
              'z.bigint().positive()',
            ],
            [
              { type: 'integer', format: 'bigint', minimum: 0, exclusiveMinimum: false },
              'z.bigint().nonnegative()',
            ],
            [
              { type: 'integer', format: 'bigint', maximum: 0, exclusiveMaximum: true },
              'z.bigint().negative()',
            ],
            [
              { type: 'integer', format: 'bigint', maximum: 0, exclusiveMaximum: false },
              'z.bigint().nonpositive()',
            ],
            [{ type: 'integer', format: 'bigint', minimum: 100 }, 'z.bigint().min(BigInt(100))'],
            [{ type: 'integer', format: 'bigint', minimum: 0 }, 'z.bigint().min(BigInt(0))'],
            [
              { type: 'integer', format: 'bigint', minimum: 100, exclusiveMinimum: true },
              'z.bigint().gt(BigInt(100))',
            ],
            [{ type: 'integer', format: 'bigint', maximum: 100 }, 'z.bigint().max(BigInt(100))'],
            [{ type: 'integer', format: 'bigint', maximum: 0 }, 'z.bigint().max(BigInt(0))'],
            [
              { type: 'integer', format: 'bigint', maximum: 100, exclusiveMaximum: true },
              'z.bigint().lt(BigInt(100))',
            ],
            [
              { type: 'integer', format: 'bigint', exclusiveMaximum: 100 },
              'z.bigint().lt(BigInt(100))',
            ],
            [
              { type: 'integer', format: 'bigint', multipleOf: 2 },
              'z.bigint().multipleOf(BigInt(2))',
            ],
            [
              { type: 'integer', format: 'bigint', default: 100 },
              'z.bigint().default(BigInt(100))',
            ],
            [
              { type: 'integer', format: 'bigint', default: 100, nullable: true },
              'z.bigint().nullable().default(BigInt(100))',
            ],
            [
              { type: ['integer', 'null'], format: 'bigint', default: 100 },
              'z.bigint().nullable().default(BigInt(100))',
            ],
          ])('zod(%o) → %s', (input, expected) => {
            expect(zod(input)).toBe(expected)
          })
        })
      })

      describe('boolean', () => {
        it.concurrent.each<[JSONSchema, string]>([
          [{ type: 'boolean' }, 'z.boolean()'],
          [{ type: ['boolean'], nullable: true }, 'z.boolean().nullable()'],
          [{ type: ['boolean', 'null'] }, 'z.boolean().nullable()'],
          [{ type: 'boolean', default: true }, 'z.boolean().default(true)'],
          [{ type: 'boolean', default: false }, 'z.boolean().default(false)'],
          [{ type: 'boolean', nullable: true }, 'z.boolean().nullable()'],
          [{ type: ['boolean', 'null'] }, 'z.boolean().nullable()'],
        ])('zod(%o) → %s', (input, expected) => {
          expect(zod(input)).toBe(expected)
        })
      })
    })

    describe('array', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'array', items: { type: 'string' } }, 'z.array(z.string())'],
        [
          { type: 'array', items: { type: 'string', nullable: true } },
          'z.array(z.string().nullable())',
        ],
        [{ type: 'array', items: { type: ['string', 'null'] } }, 'z.array(z.string().nullable())'],
        [
          { type: 'array', nullable: true, items: { type: ['string', 'null'] } },
          'z.array(z.string().nullable()).nullable()',
        ],
        [{ type: 'array', items: { type: 'number' } }, 'z.array(z.number())'],
        [
          { type: 'array', items: { type: 'number', nullable: true } },
          'z.array(z.number().nullable())',
        ],
        [{ type: 'array', items: { type: ['number', 'null'] } }, 'z.array(z.number().nullable())'],
        [
          { type: 'array', nullable: true, items: { type: ['number', 'null'] } },
          'z.array(z.number().nullable()).nullable()',
        ],
        [{ type: 'array', items: { type: 'boolean' } }, 'z.array(z.boolean())'],
        [
          { type: 'array', items: { type: 'boolean', nullable: true } },
          'z.array(z.boolean().nullable())',
        ],
        [
          { type: 'array', items: { type: ['boolean', 'null'] } },
          'z.array(z.boolean().nullable())',
        ],
        [
          { type: 'array', nullable: true, items: { type: ['boolean', 'null'] } },
          'z.array(z.boolean().nullable()).nullable()',
        ],
        [{ type: 'array', items: { type: 'object' } }, 'z.array(z.object({}))'],
        [{ type: 'array', items: { type: 'object' } }, 'z.array(z.object({}))'],
        [
          { type: 'array', items: { type: 'object', nullable: true } },
          'z.array(z.object({}).nullable())',
        ],
        [
          { type: 'array', items: { type: ['object', 'null'] } },
          'z.array(z.object({}).nullable())',
        ],
        [
          { type: 'array', nullable: true, items: { type: ['object', 'null'] } },
          'z.array(z.object({}).nullable()).nullable()',
        ],
        [
          {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          'z.array(z.array(z.string()))',
        ],
        [{ type: 'array', items: { type: 'string' }, minItems: 1 }, 'z.array(z.string()).min(1)'],
        [{ type: 'array', items: { type: 'string' }, maxItems: 10 }, 'z.array(z.string()).max(10)'],
        [
          { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
          'z.array(z.string()).min(1).max(10)',
        ],
        [
          { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
          'z.array(z.string()).length(5)',
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
          'z.array(z.union([z.string(),z.number(),z.boolean()]))',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })

      describe('object', () => {
        it.concurrent.each<[JSONSchema, string]>([
          [{ type: 'object' }, 'z.object({})'],
          [{ type: 'object', nullable: true }, 'z.object({}).nullable()'],
          [{ type: ['object', 'null'] }, 'z.object({}).nullable()'],
          [
            { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
            'z.object({foo:z.string()})',
          ],
          [
            {
              type: 'object',
              properties: { foo: { type: 'string' } },
              required: ['foo'],
              nullable: true,
            },
            'z.object({foo:z.string()}).nullable()',
          ],
          [
            { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
            'z.object({foo:z.string()})',
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
            'z.object({type:z.enum(["A","B","C"])})',
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
            'z.strictObject({test:z.string()})',
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
            'z.looseObject({test:z.string()})',
          ],
        ])('zod(%o) → %s', (input, expected) => {
          expect(zod(input)).toBe(expected)
        })
      })

      describe('date', () => {
        it.concurrent.each<[JSONSchema, string]>([
          [{ type: 'date' }, 'z.date()'],
          [{ type: 'date', nullable: true }, 'z.date().nullable()'],
          [{ type: ['date', 'null'] }, 'z.date().nullable()'],
          [{ type: 'date', default: '2023-01-01' }, 'z.date().default(new Date("2023-01-01"))'],
        ])('zod(%o) → %s', (input, expected) => {
          expect(zod(input)).toBe(expected)
        })
      })

      describe('null', () => {
        it.concurrent.each<[JSONSchema, string]>([
          [{ type: 'null' }, 'z.null().nullable()'],
          [{ type: 'null', nullable: true }, 'z.null().nullable()'],
          [{ type: ['null'] }, 'z.null().nullable()'],
          [{ type: 'null', default: 'test' }, 'z.null().nullable()'],
          [{ type: ['null'], default: 'test' }, 'z.null().nullable()'],
          [{ type: 'null', nullable: true, default: 'test' }, 'z.null().nullable()'],
        ])('zod(%o) → %s', (input, expected) => {
          expect(zod(input)).toBe(expected)
        })
      })

      describe('any', () => {
        it.concurrent.each<[JSONSchema, string]>([
          [
            {
              type: 'any' as any,
            },
            'z.any()',
          ],

          [
            {
              type: 'any' as any,
              nullable: true,
            },
            'z.any().nullable()',
          ],
          [
            {
              type: ['any', 'null'],
            },
            'z.any().nullable()',
          ],
          [
            {
              type: 'any' as any,
              default: 'test',
            },
            'z.any().default("test")',
          ],
          [
            {
              type: 'any' as any,
              nullable: true,
              default: 'test',
            },
            'z.any().nullable().default("test")',
          ],
          [
            {
              type: ['any', 'null'],
              default: 'test',
            },
            'z.any().nullable().default("test")',
          ],
        ])('zod(%o) → %s', (input, expected) => {
          expect(zod(input)).toBe(expected)
        })
      })
    })
  })

  describe('x-error-message vendor extensions', () => {
    describe('string', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [
          { type: 'string', 'x-error-message': 'Name is required' },
          'z.string({error:"Name is required"})',
        ],
        [
          { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
          'z.email({error:"Invalid email"})',
        ],
        [
          {
            type: 'string',
            pattern: '^[a-z]+$',
            'x-pattern-message': 'Only lowercase letters',
          },
          'z.string().regex(/^[a-z]+$/,{error:"Only lowercase letters"})',
        ],
        [
          {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            'x-minLength-message': 'Min 3 chars',
            'x-maxLength-message': 'Max 20 chars',
          },
          'z.string().min(3,{error:"Min 3 chars"}).max(20,{error:"Max 20 chars"})',
        ],
        [
          {
            type: 'string',
            minLength: 10,
            maxLength: 10,
            'x-minLength-message': 'Must be exactly 10 characters',
            'x-maxLength-message': 'Must be exactly 10 characters',
          },
          'z.string().length(10,{error:"Must be exactly 10 characters"})',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('number', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [
          { type: 'number', 'x-error-message': 'Must be a number' },
          'z.number({error:"Must be a number"})',
        ],
        [
          {
            type: 'number',
            minimum: 0,
            maximum: 100,
            'x-minimum-message': 'Cannot be negative',
            'x-maximum-message': 'Cannot exceed 100',
          },
          'z.number().min(0,{error:"Cannot be negative"}).max(100,{error:"Cannot exceed 100"})',
        ],
        [
          {
            type: 'number',
            minimum: 0,
            exclusiveMinimum: true,
            'x-exclusiveMinimum-message': 'Must be positive',
          },
          'z.number().positive({error:"Must be positive"})',
        ],
        [
          {
            type: 'number',
            multipleOf: 5,
            'x-multipleOf-message': 'Must be a multiple of 5',
          },
          'z.number().multipleOf(5,{error:"Must be a multiple of 5"})',
        ],
        [
          {
            type: 'number',
            format: 'float32',
            'x-error-message': 'Must be a float',
          },
          'z.float32({error:"Must be a float"})',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('integer', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [
          { type: 'integer', 'x-error-message': 'Must be an integer' },
          'z.int({error:"Must be an integer"})',
        ],
        [
          {
            type: 'integer',
            format: 'int32',
            'x-error-message': 'Must be int32',
          },
          'z.int32({error:"Must be int32"})',
        ],
        [
          {
            type: 'integer',
            minimum: 1,
            maximum: 999,
            'x-minimum-message': 'Min 1',
            'x-maximum-message': 'Max 999',
          },
          'z.int().min(1,{error:"Min 1"}).max(999,{error:"Max 999"})',
        ],
        [
          {
            type: 'integer',
            multipleOf: 10,
            'x-multipleOf-message': 'Must be a multiple of 10',
          },
          'z.int().multipleOf(10,{error:"Must be a multiple of 10"})',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
    })

    describe('enum', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [
          {
            enum: ['active', 'inactive'],
            'x-error-message': 'Invalid status',
          },
          'z.enum(["active","inactive"],{error:"Invalid status"})',
        ],
        [
          {
            type: 'number',
            enum: [1, 2, 3],
            'x-error-message': 'Must be 1, 2, or 3',
          },
          'z.union([z.literal(1),z.literal(2),z.literal(3)],{error:"Must be 1, 2, or 3"})',
        ],
      ])('zod(%o) → %s', (input, expected) => {
        expect(zod(input)).toBe(expected)
      })
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
        [{ type: 'array', items: { $ref: '#/components/schemas/Pet' } }, 'z.array(PetSchema)'],
        // definitions/$defs are NOT affected (no OpenAPI suffix)
        [{ $ref: '#/definitions/Address' }, 'AddressSchema'],
        [{ $ref: '#/$defs/Address' }, 'AddressSchema'],
      ])('zod(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(zod(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('ref with openapi and isZod', () => {
      it.concurrent.each<[JSONSchema, string]>([
        // With isZod=true, OpenAPI refs use z.lazy()
        [{ $ref: '#/components/schemas/User' }, 'z.lazy(() => UserSchema)'],
        [{ $ref: '#/components/parameters/UserId' }, 'z.lazy(() => UserIdParamsSchema)'],
        // Self-reference uses z.lazy()
        [{ $ref: '#/components/schemas/Tree' }, 'z.lazy(() => TreeSchema)'],
      ])('zod(%o, "TreeSchema", true, { openapi: true }) → %s', (input, expected) => {
        expect(zod(input, 'TreeSchema', true, { openapi: true })).toBe(expected)
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
        expect(zod(schema, 'Schema', false, { openapi: true })).toBe(
          'z.object({pet:PetSchema,owner:UserProfileSchema.exactOptional()})',
        )
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(zod(schema, 'Schema', false, { openapi: true })).toBe('z.xor([CatSchema,DogSchema])')
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', 'z.lazy(() => UserSchema)'],
        // Nullable ref with openapi (double-wrapped: ref() wraps, then zod() wraps again)
        [
          { $ref: '#/components/schemas/Pet', nullable: true },
          'TestSchema',
          'PetSchema.nullable()',
        ],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', 'BaseSchema'],
        // anyOf with openapi ref and inline
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          'z.union([ASchema,z.string()])',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', 'MySchemaSchema'],
      ])('zod(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(zod(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef)
      [{ $ref: '#SomeRef' }, 'SomeRefSchema'],
      // External file with fragment
      [{ $ref: 'other.json#/definitions/Foo' }, 'z.unknown()'],
      // HTTP URL reference with .json
      [{ $ref: 'https://example.com/schemas/User.json' }, 'User'],
      // HTTP URL without .json
      [{ $ref: 'https://example.com/schemas/User' }, 'User'],
      // Fallback to any (no # and no http)
      [{ $ref: 'relative/path' }, 'z.any()'],
      // Self reference #
      [{ $ref: '#' }, 'z.lazy(() => Schema)'],
    ])('zod(%o) → %s', (input, expected) => {
      expect(zod(input)).toBe(expected)
    })
  })

  describe('deep local JSON Pointer refs', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/Foo/properties/bar' }, 'z.unknown()'],
      [{ $ref: '#/components/schemas/Foo/items' }, 'z.unknown()'],
      [{ $ref: '#/$defs/Foo/properties/bar' }, 'z.unknown()'],
      [{ $ref: '#/definitions/Foo/properties/bar' }, 'z.unknown()'],
    ])('zod(%o) → %s', (input, expected) => {
      expect(zod(input)).toBe(expected)
    })

    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/Foo/properties/bar' }, 'z.unknown()'],
      [{ $ref: '#/$defs/Foo/properties/bar' }, 'z.unknown()'],
    ])('zod(%o, "TestSchema", false, { openapi: true }) → %s', (input, expected) => {
      expect(zod(input, 'TestSchema', false, { openapi: true })).toBe(expected)
    })

    it.concurrent('top-level ref is unchanged', () => {
      expect(zod({ $ref: '#/components/schemas/Foo' })).toBe('FooSchema')
    })
  })

  describe('$ref edge cases', () => {
    it('should handle self reference #', () => {
      expect(zod({ $ref: '#' }, 'Schema')).toBe('z.lazy(() => Schema)')
    })

    it('should handle $ref with array type without items $ref', () => {
      expect(zod({ $ref: '#/components/schemas/Test', type: 'array' })).toBe('TestSchema')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle int64 default format', () => {
      expect(zod({ type: 'integer', format: 'int64', default: 42 })).toBe(
        String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.int64()).default(42n)`,
      )
    })

    it('should handle bigint default format', () => {
      expect(zod({ type: 'integer', format: 'bigint', default: 100 })).toBe(
        'z.bigint().default(BigInt(100))',
      )
    })

    it('should handle date default', () => {
      expect(zod({ type: 'date', default: '2024-01-01' })).toBe(
        'z.date().default(new Date("2024-01-01"))',
      )
    })

    it('omits a null default on a non-nullable schema', () => {
      expect(zod({ type: 'string', default: null })).toBe('z.string()')
    })

    it('keeps a null default on a nullable schema', () => {
      expect(zod({ type: ['string', 'null'], default: null })).toBe(
        'z.string().nullable().default(null)',
      )
    })

    it('coerces a string boolean default to the boolean it spells', () => {
      expect(zod({ type: 'boolean', default: 'true' })).toBe('z.boolean().default(true)')
      expect(zod({ type: 'boolean', default: 'false' })).toBe('z.boolean().default(false)')
    })

    it('should handle nullable via type array with null', () => {
      expect(zod({ type: ['string', 'null'] })).toBe('z.string().nullable()')
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(zod({ oneOf: [] })).toBe('z.any()')
    })

    it('should handle empty anyOf', () => {
      expect(zod({ anyOf: [] })).toBe('z.any()')
    })

    it('should handle empty allOf', () => {
      expect(zod({ allOf: [] })).toBe('z.any()')
    })
  })

  describe('readonly option', () => {
    it('should add .readonly() to object', () => {
      expect(
        zod(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: true },
        ),
      ).toBe('z.object({name:z.string()}).readonly()')
    })

    it('should add .readonly() to array', () => {
      expect(
        zod({ type: 'array', items: { type: 'string' } }, 'Schema', false, { readonly: true }),
      ).toBe('z.array(z.string()).readonly()')
    })

    it('should not add .readonly() to string', () => {
      expect(zod({ type: 'string' }, 'Schema', false, { readonly: true })).toBe('z.string()')
    })

    it('should not add .readonly() when option is false', () => {
      expect(
        zod(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: false },
        ),
      ).toBe('z.object({name:z.string()})')
    })
  })

  describe('x-brand', () => {
    it('should add .brand() for string', () => {
      expect(zod({ type: 'string', 'x-brand': 'UserId' })).toBe('z.string().brand<"UserId">()')
    })

    it('should add .brand() for number with constraints', () => {
      expect(zod({ type: 'number', minimum: 0, 'x-brand': 'Price' })).toBe(
        'z.number().min(0).brand<"Price">()',
      )
    })

    it('should add .brand() after .nullable()', () => {
      expect(zod({ type: 'string', nullable: true, 'x-brand': 'Email' })).toBe(
        'z.string().nullable().brand<"Email">()',
      )
    })

    it('should add .brand() after .default()', () => {
      expect(zod({ type: 'string', default: 'foo', 'x-brand': 'Name' })).toBe(
        'z.string().default("foo").brand<"Name">()',
      )
    })

    it('should add .brand() for integer', () => {
      expect(zod({ type: 'integer', minimum: 0, 'x-brand': 'Quantity' })).toBe(
        'z.int().min(0).brand<"Quantity">()',
      )
    })

    it('should add .brand() for array', () => {
      expect(
        zod({ type: 'array', items: { type: 'string' }, minItems: 1, 'x-brand': 'Tags' }),
      ).toBe('z.array(z.string()).min(1).brand<"Tags">()')
    })
  })

  describe('code-emitting extensions (unsafeCodeExtensions)', () => {
    const unsafe = { unsafeCodeExtensions: true }

    it('appends x-refine chain term after brand', () => {
      expect(
        zod(
          { type: 'string', 'x-refine': '.refine((val) => val.length > 0)' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('z.string().refine((val) => val.length > 0)')
    })

    it('appends x-transform after refine', () => {
      expect(
        zod(
          {
            type: 'string',
            'x-refine': '.refine((val) => val.length > 0)',
            'x-transform': '.transform((val) => val.trim())',
          },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('z.string().refine((val) => val.length > 0).transform((val) => val.trim())')
    })

    it('appends x-pipe last', () => {
      expect(
        zod(
          {
            type: 'string',
            'x-pipe': '.pipe(z.string().toLowerCase())',
          },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('z.string().pipe(z.string().toLowerCase())')
    })

    it('replaces output with x-codec when present', () => {
      expect(
        zod(
          {
            type: 'string',
            format: 'date-time',
            'x-codec':
              'z.codec(z.iso.datetime(), z.date(), { decode: (val) => new Date(val), encode: (val) => val.toISOString() })',
          },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe(
        'z.codec(z.iso.datetime(), z.date(), { decode: (val) => new Date(val), encode: (val) => val.toISOString() })',
      )
    })

    it('silently ignores x-refine when the flag is not set', () => {
      expect(zod({ type: 'string', 'x-refine': '.refine((val) => val.length > 0)' })).toBe(
        'z.string()',
      )
    })

    it('silently ignores values rejected by the denylist even when the flag is set', () => {
      expect(
        zod({ type: 'string', 'x-refine': '.refine(() => eval("x"))' }, 'Schema', false, unsafe),
      ).toBe('z.string()')
    })
  })

  describe('x-prefixItems-message', () => {
    it('wraps tuple with a check that rewrites element-level messages', () => {
      expect(
        zod({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'number' }],
          'x-prefixItems-message': 'bad tuple',
        }),
      ).toBe(
        '(()=>{const Schema=z.tuple([z.string(),z.number()]);return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.code===\'invalid_type\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'too_big\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'too_small\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'invalid_format\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'not_multiple_of\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'unrecognized_keys\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'invalid_union\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'invalid_key\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'invalid_element\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'invalid_value\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}else if(issue.code===\'custom\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad tuple":issue.message})}}}}).pipe(Schema)})()',
      )
    })

    it('falls through to plain tuple when message is absent', () => {
      expect(
        zod({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'number' }],
        }),
      ).toBe('z.tuple([z.string(),z.number()])')
    })
  })

  describe('x-items-message', () => {
    it('wraps array with a check that rewrites element-level messages', () => {
      expect(
        zod({ type: 'array', items: { type: 'string' }, 'x-items-message': 'bad items' }),
      ).toBe(
        '(()=>{const Schema=z.array(z.string());return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.code===\'invalid_type\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'too_big\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'too_small\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_format\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'not_multiple_of\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'unrecognized_keys\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_union\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_key\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_element\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_value\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'custom\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}}}}).pipe(Schema)})()',
      )
    })

    it('preserves min/max chain after wrap', () => {
      expect(
        zod({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 5,
          'x-items-message': 'bad items',
        }),
      ).toBe(
        '(()=>{const Schema=z.array(z.string());return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.code===\'invalid_type\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'too_big\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'too_small\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_format\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'not_multiple_of\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'unrecognized_keys\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_union\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_key\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_element\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'invalid_value\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}else if(issue.code===\'custom\'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?"bad items":issue.message})}}}}).pipe(Schema)})().min(1).max(5)',
      )
    })

    it('accepts arrow expression message', () => {
      expect(
        zod({
          type: 'array',
          items: { type: 'string' },
          'x-items-message': '(issue) => `bad at ${issue.path[0]}`',
        }),
      ).toBe(
        "(()=>{const Schema=z.array(z.string());return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.code==='invalid_type'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='too_big'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='too_small'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='invalid_format'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='not_multiple_of'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='unrecognized_keys'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='invalid_union'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='invalid_key'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='invalid_element'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='invalid_value'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}else if(issue.code==='custom'){ctx.issues.push({...issue,input:issue.input,message:issue.path.length>0?((issue) => `bad at ${issue.path[0]}`)(issue):issue.message})}}}}).pipe(Schema)})()",
      )
    })
  })

  describe('x-unevaluatedProperties-message', () => {
    it('switches to strictObject with the message wired into the unrecognized_keys error', () => {
      expect(
        zod({
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          unevaluatedProperties: false,
          'x-unevaluatedProperties-message': 'no extras',
        }),
      ).toBe(
        'z.strictObject({a:z.string()},{error:(issue)=>issue.code===\'unrecognized_keys\'?"no extras":undefined})',
      )
    })
  })

  describe('x-unevaluatedItems-message (prefixItems tuple)', () => {
    it('embeds the message via the tuple error param when unevaluatedItems: false', () => {
      expect(
        zod({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: false,
          'x-unevaluatedItems-message': 'no extras',
        }),
      ).toBe('z.tuple([z.string(),z.boolean()],{error:"no extras"})')
    })

    it('emits z.tuple with rest argument when unevaluatedItems is a schema', () => {
      expect(
        zod({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: { type: 'integer' },
        }),
      ).toBe('z.tuple([z.string(),z.boolean()],z.int())')
    })
  })

  describe('x-coerce / x-prefault / x-catch (Zod-only)', () => {
    describe('x-coerce', () => {
      it('emits z.coerce.number()', () => {
        expect(zod({ type: 'number', 'x-coerce': true })).toBe('z.coerce.number()')
      })
      it('emits z.coerce.number().int()', () => {
        expect(zod({ type: 'integer', 'x-coerce': true })).toBe('z.coerce.number().int()')
      })
      it('emits z.coerce.boolean()', () => {
        expect(zod({ type: 'boolean', 'x-coerce': true })).toBe('z.coerce.boolean()')
      })
      it('emits z.coerce.date()', () => {
        expect(zod({ type: 'date', 'x-coerce': true })).toBe('z.coerce.date()')
      })
      it('emits z.coerce.string()', () => {
        expect(zod({ type: 'string', 'x-coerce': true })).toBe('z.coerce.string()')
      })
      it('does not coerce when format is set (format-specific API has no coerce variant)', () => {
        expect(zod({ type: 'string', format: 'email', 'x-coerce': true })).toBe('z.email()')
      })
      it('emits z.coerce.number().pipe(z.int32()) for format int32', () => {
        expect(zod({ type: 'integer', format: 'int32', 'x-coerce': true })).toBe(
          'z.coerce.number().pipe(z.int32())',
        )
      })
      it('emits z.coerce.bigint().pipe(z.int64()) for format int64', () => {
        expect(zod({ type: 'integer', format: 'int64', 'x-coerce': true })).toBe(
          'z.coerce.bigint().pipe(z.int64())',
        )
      })
      it('emits z.coerce.bigint() for format bigint', () => {
        expect(zod({ type: 'integer', format: 'bigint', 'x-coerce': true })).toBe(
          'z.coerce.bigint()',
        )
      })
      it('emits z.coerce.number({error}).int({error}) with x-error-message', () => {
        expect(
          zod({ type: 'integer', 'x-coerce': true, 'x-error-message': 'Must be integer' }),
        ).toBe('z.coerce.number({error:"Must be integer"}).int({error:"Must be integer"})')
      })
      it('emits z.coerce.number().int().min(0) with x-coerce + minimum', () => {
        expect(zod({ type: 'integer', 'x-coerce': true, minimum: 0 })).toBe(
          'z.coerce.number().int().min(0)',
        )
      })
      it('x-coerce + int32 + minimum: constraints inside pipe', () => {
        expect(zod({ type: 'integer', format: 'int32', 'x-coerce': true, minimum: 100 })).toBe(
          'z.coerce.number().pipe(z.int32().min(100))',
        )
      })
    })

    describe('x-prefault', () => {
      it('emits .prefault(literal) for string', () => {
        expect(zod({ type: 'string', 'x-prefault': 'hello' })).toBe('z.string().prefault("hello")')
      })
      it('emits .prefault(literal) for number', () => {
        expect(zod({ type: 'number', 'x-prefault': 42 })).toBe('z.number().prefault(42)')
      })
      it('emits .prefault(literal) for boolean', () => {
        expect(zod({ type: 'boolean', 'x-prefault': false })).toBe('z.boolean().prefault(false)')
      })
    })

    describe('x-catch', () => {
      it('emits .catch(literal) for integer', () => {
        expect(zod({ type: 'integer', 'x-catch': 0 })).toBe('z.int().catch(0)')
      })
      it('emits .catch(literal) for string', () => {
        expect(zod({ type: 'string', 'x-catch': 'fallback' })).toBe('z.string().catch("fallback")')
      })
    })

    describe('composition', () => {
      it('chains prefault before catch', () => {
        expect(zod({ type: 'string', 'x-prefault': 'hi', 'x-catch': 'fallback' })).toBe(
          'z.string().prefault("hi").catch("fallback")',
        )
      })
      it('combines coerce + prefault + catch', () => {
        expect(zod({ type: 'number', 'x-coerce': true, 'x-prefault': 0, 'x-catch': -1 })).toBe(
          'z.coerce.number().prefault(0).catch(-1)',
        )
      })
    })
  })

  describe('x-implication-message', () => {
    it('takes precedence over x-anyOf-message on anyOf path', () => {
      expect(
        zod({
          anyOf: [{ type: 'string' }, { type: 'number' }],
          'x-anyOf-message': 'any',
          'x-implication-message': 'if A then B',
        }),
      ).toBe('z.union([z.string(),z.number()],{error:"if A then B"})')
    })

    it('falls back to x-anyOf-message when x-implication-message absent', () => {
      expect(
        zod({
          anyOf: [{ type: 'string' }, { type: 'number' }],
          'x-anyOf-message': 'any failed',
        }),
      ).toBe('z.union([z.string(),z.number()],{error:"any failed"})')
    })

    it('is silently ignored when anyOf is absent', () => {
      expect(zod({ type: 'string', 'x-implication-message': 'unused' })).toBe('z.string()')
    })
  })

  describe('x-length-message', () => {
    it('falls back for minItems when x-minItems-message absent', () => {
      expect(
        zod({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-length-message': 'bad length',
        }),
      ).toBe('z.array(z.string()).min(1,{error:"bad length"})')
    })

    it('falls back for maxItems when x-maxItems-message absent', () => {
      expect(
        zod({
          type: 'array',
          items: { type: 'string' },
          maxItems: 3,
          'x-length-message': 'bad length',
        }),
      ).toBe('z.array(z.string()).max(3,{error:"bad length"})')
    })

    it('does not override x-minItems-message when both present', () => {
      expect(
        zod({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-length-message': 'fallback',
          'x-minItems-message': 'specific',
        }),
      ).toBe('z.array(z.string()).min(1,{error:"specific"})')
    })
  })

  describe('x-if/then/else-message', () => {
    const buildSchema = (overrides: Partial<JSONSchema>): JSONSchema => ({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
      if: { properties: { a: { const: 'x' } } },
      // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
      then: { required: ['b'] },
      ...overrides,
    })

    it('emits then refine with x-then-message', () => {
      expect(zod(buildSchema({ 'x-then-message': 'then failed' }))).toBe(
        'z.looseObject({a:z.string().exactOptional(),b:z.string().exactOptional()}).refine((val)=>!z.object({a:z.literal("x").exactOptional()}).safeParse(val).success||z.any().safeParse(val).success,{error:"then failed"})',
      )
    })

    it('falls back to x-if-message for then when x-then-message absent', () => {
      expect(zod(buildSchema({ 'x-if-message': 'if shared' }))).toBe(
        'z.looseObject({a:z.string().exactOptional(),b:z.string().exactOptional()}).refine((val)=>!z.object({a:z.literal("x").exactOptional()}).safeParse(val).success||z.any().safeParse(val).success,{error:"if shared"})',
      )
    })

    it('emits then + else refines with separate messages', () => {
      expect(
        zod(
          buildSchema({
            else: { required: ['a'] },
            'x-then-message': 'then failed',
            'x-else-message': 'else failed',
          }),
        ),
      ).toBe(
        'z.looseObject({a:z.string().exactOptional(),b:z.string().exactOptional()}).refine((val)=>!z.object({a:z.literal("x").exactOptional()}).safeParse(val).success||z.any().safeParse(val).success,{error:"then failed"}).refine((val)=>z.object({a:z.literal("x").exactOptional()}).safeParse(val).success||z.any().safeParse(val).success,{error:"else failed"})',
      )
    })
  })

  describe('paramIn coercion', () => {
    it('query: integer → z.coerce.number().int()', () => {
      expect(zod({ type: 'integer' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())',
      )
    })

    it('query: number → z.coerce.number()', () => {
      expect(zod({ type: 'number' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'z.string().regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/).transform((val)=>Number(val)).pipe(z.number())',
      )
    })

    it('path: boolean → z.stringbool()', () => {
      expect(zod({ type: 'boolean' }, 'Schema', false, { paramIn: 'path' })).toBe('z.stringbool()')
    })

    it('query: date → z.coerce.date()', () => {
      expect(zod({ type: 'date' }, 'Schema', false, { paramIn: 'query' })).toBe('z.coerce.date()')
    })

    it('no paramIn: integer → z.int() (no coerce)', () => {
      expect(zod({ type: 'integer' })).toBe('z.int()')
    })

    it.concurrent.each<[ParamIn, JSONSchema, string]>([
      [
        'header',
        { type: 'integer' },
        'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())',
      ],
      ['cookie', { type: 'boolean' }, 'z.stringbool()'],
      [
        'formData',
        { type: 'number' },
        'z.string().regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/).transform((val)=>Number(val)).pipe(z.number())',
      ],
    ])('%s: %o is coerced from text', (paramIn, schema, expected) => {
      expect(zod(schema, 'Schema', false, { paramIn })).toBe(expected)
    })

    it('nested in object: properties coerced too', () => {
      expect(
        zod(
          {
            type: 'object',
            properties: { page: { type: 'integer' }, q: { type: 'string' } },
            required: ['page'],
          },
          'Schema',
          false,
          { paramIn: 'query' },
        ),
      ).toBe(
        'z.object({page:z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()),q:z.string().exactOptional()})',
      )
    })

    it('nested in array: items coerced too', () => {
      expect(
        zod({ type: 'array', items: { type: 'integer' } }, 'Schema', false, { paramIn: 'query' }),
      ).toBe(
        'z.preprocess((val)=>(val===undefined||Array.isArray(val)?val:[val]),z.array(z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())))',
      )
    })

    it('integer with min/max: constraints preserved after coerce', () => {
      expect(
        zod({ type: 'integer', minimum: 1, maximum: 100 }, 'Schema', false, { paramIn: 'query' }),
      ).toBe(
        'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int().min(1).max(100))',
      )
    })

    it('x-coerce: false overrides paramIn (user opt-out wins)', () => {
      expect(
        zod({ type: 'integer', 'x-coerce': false }, 'Schema', false, { paramIn: 'query' }),
      ).toBe('z.int()')
    })

    it('paramIn query + format int32 → pipe preserves range constraint', () => {
      expect(zod({ type: 'integer', format: 'int32' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.int32())',
      )
    })

    it('paramIn query + format int64 → pipe preserves BigInt semantics', () => {
      expect(zod({ type: 'integer', format: 'int64' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'z.coerce.bigint().pipe(z.int64())',
      )
    })

    it('paramIn path + format bigint → z.coerce.bigint()', () => {
      expect(zod({ type: 'integer', format: 'bigint' }, 'Schema', false, { paramIn: 'path' })).toBe(
        'z.coerce.bigint()',
      )
    })
  })
})

describe('zod not: $ref / type arrays / combinators / message', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { not: { $ref: '#/components/schemas/Foo' } },
      'z.any().refine((val) => !z.lazy(() => Foo).safeParse(val).success)',
    ],
    [
      { not: { type: ['string', 'number'] } },
      "z.any().refine((val) => (typeof val !== 'string') && (typeof val !== 'number'))",
    ],
    [{ not: { type: 'number' } }, "z.any().refine((val) => typeof val !== 'number')"],
    [{ not: { type: 'array' } }, 'z.any().refine((val) => !Array.isArray(val))'],
    [
      { not: { type: 'object' } },
      "z.any().refine((val) => typeof val !== 'object' || val === null || Array.isArray(val))",
    ],
    [{ not: { type: 'null' } }, 'z.any().refine((val) => val !== null)'],
    [
      { not: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
      'z.any().refine((val) => !z.xor([z.string(),z.number()]).safeParse(val).success)',
    ],
    [
      { not: { type: 'string' }, 'x-not-message': 'no strings' },
      `z.any().refine((val) => typeof val !== 'string',{error:"no strings"})`,
    ],
    [{ not: { format: 'email' } }, 'z.any()'],
  ])('zod(%o) → %s', (input, expected) => {
    expect(zod(input)).toBe(expected)
  })
})

describe('zod contains / minContains / maxContains', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' } },
      'z.array(z.number()).refine((val)=>{const Schema=z.int();return val.some((item)=>Schema.safeParse(item).success)})',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        'x-contains-message': 'need int',
      },
      'z.array(z.number()).refine((val)=>{const Schema=z.int();return val.some((item)=>Schema.safeParse(item).success)},{error:"need int"})',
    ],
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' }, minContains: 2 },
      'z.array(z.number()).refine((val)=>{const Schema=z.int();return val.filter((item)=>Schema.safeParse(item).success).length>=2})',
    ],
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' }, maxContains: 3 },
      'z.array(z.number()).refine((val)=>{const Schema=z.int();return val.filter((item)=>Schema.safeParse(item).success).length>=1}).refine((val)=>{const Schema=z.int();return val.filter((item)=>Schema.safeParse(item).success).length<=3})',
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
      'z.array(z.number()).refine((val)=>{const Schema=z.int();return val.filter((item)=>Schema.safeParse(item).success).length>=1},{error:"few"}).refine((val)=>{const Schema=z.int();return val.filter((item)=>Schema.safeParse(item).success).length<=2},{error:"many"})',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        minContains: 0,
        maxContains: 2,
      },
      'z.array(z.number()).refine((val)=>{const Schema=z.int();return val.filter((item)=>Schema.safeParse(item).success).length<=2})',
    ],
  ])('zod(%o) → %s', (input, expected) => {
    expect(zod(input)).toBe(expected)
  })
})

const WIRE_ARRAY = '(val)=>(val===undefined||Array.isArray(val)?val:[val])'
const WIRE_NULL = `(val)=>(val==='null'?null:val)`
const OWN_PROPERTIES =
  '(val)=>(typeof val==="object"&&val!==null&&!Array.isArray(val)?Object.assign(Object.create(null),val):val)'

describe('zod string wire', () => {
  it.concurrent.each<[JSONSchema, string]>([
    // A wire array sent once arrives as its one element.
    [
      { type: 'array', items: { type: 'string' }, minItems: 1 },
      `z.preprocess(${WIRE_ARRAY},z.array(z.string()).min(1))`,
    ],
    [
      { type: 'array', prefixItems: [{ type: 'integer' }] },
      `z.preprocess(${WIRE_ARRAY},z.tuple([z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())]))`,
    ],
    // A literal is read through the same coercion as its type.
    [
      { type: 'integer', enum: [1, 2, 3] },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.union([z.literal(1),z.literal(2),z.literal(3)]))',
    ],
    [
      { type: 'number', const: 1.5 },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/).transform((val)=>Number(val)).pipe(z.literal(1.5))',
    ],
    [{ type: 'boolean', enum: [true] }, 'z.stringbool().pipe(z.literal(true))'],
    [{ type: 'string', enum: ['a', 'b'] }, 'z.enum(["a","b"])'],
    [
      { type: 'integer', enum: [1, 2, null] },
      `z.preprocess(${WIRE_NULL},z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.union([z.literal(1),z.literal(2)])).nullable())`,
    ],
    [
      { type: 'integer', format: 'int64', enum: [1, 2] },
      'z.coerce.bigint().pipe(z.union([z.literal(1n),z.literal(2n)]))',
    ],
    [{ type: 'integer', format: 'uint64' }, 'z.coerce.bigint().pipe(z.uint64())'],
    // The text `null` is null for a schema that takes null and no string.
    [
      { type: ['integer', 'null'] },
      `z.preprocess(${WIRE_NULL},z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()).nullable())`,
    ],
    [{ type: ['string', 'null'] }, 'z.string().nullable()'],
    [
      { oneOf: [{ type: 'integer' }, { type: 'null' }] },
      `z.preprocess(${WIRE_NULL},z.union([z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()),z.preprocess(${WIRE_NULL},z.null().nullable())]).nullable())`,
    ],
    // A typeless constraint implies its type.
    [
      { minimum: 1 },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/).transform((val)=>Number(val)).pipe(z.number().min(1))',
    ],
    [{ maxLength: 3 }, 'z.string().max(3)'],
    [{ minimum: 1, maxLength: 3 }, 'z.any()'],
    // `not` keeps the declared type.
    [
      { type: 'integer', not: { const: 0 } },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()).refine((val) => val !== 0)',
    ],
    // Coerced members both read `1`; the first wins.
    [
      { oneOf: [{ type: 'integer' }, { type: 'boolean' }] },
      'z.union([z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()),z.stringbool()])',
    ],
    [
      { type: ['number', 'boolean'] },
      'z.union([z.string().regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/).transform((val)=>Number(val)).pipe(z.number()),z.stringbool()])',
    ],
    [
      { type: ['string', 'integer'] },
      'z.union([z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()),z.string()])',
    ],
    // A parameter named like an Object.prototype member is guarded.
    [
      {
        type: 'object',
        // A `constructor` key in an object literal is checked against Object's own member.
        properties: Object.fromEntries([
          ['constructor', { type: 'integer' }],
          ['id', { type: 'string' }],
        ]),
      },
      `z.preprocess(${OWN_PROPERTIES},z.object({constructor:z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()).exactOptional(),id:z.string().exactOptional()}))`,
    ],
    [
      {
        type: 'object',
        properties: Object.fromEntries([['valueOf', { type: 'integer' }]]),
        required: ['valueOf'],
      },
      `z.preprocess(${OWN_PROPERTIES},z.object({valueOf:z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())}))`,
    ],
  ])('zod(%o, query) → %s', (schema, expected) => {
    expect(zod(schema, 'Schema', false, { paramIn: 'query' })).toBe(expected)
  })

  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'array', items: { type: 'string' } }, 'z.array(z.string())'],
    [{ type: 'integer', enum: [1, 2] }, 'z.union([z.literal(1),z.literal(2)])'],
    [{ type: ['integer', 'null'] }, 'z.int().nullable()'],
    [{ minimum: 1 }, 'z.any()'],
    [
      { type: 'object', properties: Object.fromEntries([['constructor', { type: 'integer' }]]) },
      'z.object({constructor:z.int().exactOptional()})',
    ],
    [{ oneOf: [{ type: 'integer' }, { type: 'boolean' }] }, 'z.xor([z.int(),z.boolean()])'],
    [{ type: ['string', 'number'] }, 'z.union([z.string(),z.number()])'],
    [
      { type: 'integer', format: 'int64', const: 1 },
      String.raw`z.union([z.bigint(),z.number().int(),z.string().regex(/^-?\d+$/)]).transform((val)=>BigInt(val)).pipe(z.literal(1n))`,
    ],
  ])('zod(%o) without paramIn → %s', (schema, expected) => {
    expect(zod(schema)).toBe(expected)
  })

  it('x-coerce: false keeps a wire literal as JSON', () => {
    expect(
      zod({ type: 'integer', enum: [1, 2], 'x-coerce': false }, 'Schema', false, {
        paramIn: 'query',
      }),
    ).toBe('z.union([z.literal(1),z.literal(2)])')
  })
})

describe('zod parameter serialization', () => {
  const integers: JSONSchema = { type: 'array', items: { type: 'integer' } }
  const strings: JSONSchema = { type: 'array', items: { type: 'string' } }
  const pair: JSONSchema = {
    type: 'object',
    properties: { a: { type: 'integer' }, b: { type: 'string' } },
  }
  const wireIntegers = `z.preprocess(${WIRE_ARRAY},z.array(z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())))`
  const wireStrings = `z.preprocess(${WIRE_ARRAY},z.array(z.string()))`
  const pairObject =
    'z.object({a:z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()).exactOptional(),b:z.string().exactOptional()})'
  const split = (separator: string, prefix?: string) =>
    `(val)=>{if(typeof val!=='string')return val;const text=${prefix === undefined ? 'val' : `val.replace(${prefix},'')`};return (text===''?[]:text.split(${JSON.stringify(separator)}))}`
  const pairs = (prefix?: string) =>
    `(val)=>{if(typeof val!=='string')return val;const text=${prefix === undefined ? 'val' : `val.replace(${prefix},'')`};return (text===''?[]:text.split(",")).reduce<{[k:string]:string}>((acc,part,i,all)=>i%2===1?{...acc,[all[i-1]??'']:part}:acc,{})}`
  const entries = (parts: string, prefix?: string) =>
    `(val)=>{if(typeof val!=='string')return val;const text=${prefix === undefined ? 'val' : `val.replace(${prefix},'')`};return ${parts}.reduce<{[k:string]:string}>((acc,part)=>{const i=part.indexOf('=');return i<0?{...acc,[part]:''}:{...acc,[part.slice(0,i)]:part.slice(i+1)}},{})}`
  const label = String.raw`/^\./u`
  const matrix = '/^;[^=]*=?/u'

  it.concurrent.each<[JSONSchema, Parameters<typeof zod>[3], string]>([
    // An exploded `form` repeats the name: no reading beyond the wire array.
    [integers, { paramIn: 'query' }, wireIntegers],
    [integers, { paramIn: 'query', style: 'form' }, wireIntegers],
    [integers, { paramIn: 'query', explode: false }, `z.preprocess(${split(',')},${wireIntegers})`],
    [
      integers,
      { paramIn: 'query', style: 'pipeDelimited' },
      `z.preprocess(${split('|')},${wireIntegers})`,
    ],
    [
      integers,
      { paramIn: 'query', style: 'spaceDelimited' },
      `z.preprocess(${split(' ')},${wireIntegers})`,
    ],
    [strings, { paramIn: 'path', style: 'simple' }, `z.preprocess(${split(',')},${wireStrings})`],
    [strings, { paramIn: 'header', explode: true }, `z.preprocess(${split(',')},${wireStrings})`],
    [
      strings,
      { paramIn: 'path', style: 'label' },
      `z.preprocess(${split(',', label)},${wireStrings})`,
    ],
    [
      strings,
      { paramIn: 'path', style: 'label', explode: true },
      `z.preprocess(${split('.', label)},${wireStrings})`,
    ],
    [
      strings,
      { paramIn: 'path', style: 'matrix' },
      `z.preprocess(${split(',', matrix)},${wireStrings})`,
    ],
    [
      strings,
      { paramIn: 'path', style: 'matrix', explode: true },
      `z.preprocess((val)=>{if(typeof val!=='string')return val;const text=val;return text.split(';').filter((part)=>part!=='').map((part)=>part.slice(part.indexOf('=')+1))},${wireStrings})`,
    ],
    // Objects.
    [pair, { paramIn: 'query' }, pairObject],
    [pair, { paramIn: 'query', explode: false }, `z.preprocess(${pairs()},${pairObject})`],
    [pair, { paramIn: 'path', style: 'simple' }, `z.preprocess(${pairs()},${pairObject})`],
    [
      pair,
      { paramIn: 'path', style: 'simple', explode: true },
      `z.preprocess(${entries(`(text===''?[]:text.split(","))`)},${pairObject})`,
    ],
    [
      pair,
      { paramIn: 'path', style: 'label', explode: true },
      `z.preprocess(${entries(`(text===''?[]:text.split("."))`, label)},${pairObject})`,
    ],
    [pair, { paramIn: 'path', style: 'matrix' }, `z.preprocess(${pairs(matrix)},${pairObject})`],
    [
      pair,
      { paramIn: 'path', style: 'matrix', explode: true },
      `z.preprocess(${entries(`text.split(';').filter((part)=>part!=='')`)},${pairObject})`,
    ],
    [
      pair,
      { paramIn: 'query', style: 'deepObject', explode: true },
      `${String.raw`z.preprocess((val)=>{if(typeof val!=='object'||val===null||Array.isArray(val))return val;const out=Object.entries(val).reduce<{[k:string]:unknown}>((acc,[key,value])=>{const name=/^[^[\]]+\[([^\]]+)\]$/u.exec(key)?.[1];return name===undefined?acc:{...acc,[name]:value}},{});return Object.keys(out).length>0?out:val},`}${pairObject})`,
    ],
    // Primitives.
    [
      { type: 'string' },
      { paramIn: 'path', style: 'label' },
      `z.preprocess((val)=>{if(typeof val!=='string')return val;const text=val.replace(${label},'');return text},z.string())`,
    ],
    [
      { type: 'integer' },
      { paramIn: 'path', style: 'matrix' },
      `z.preprocess((val)=>{if(typeof val!=='string')return val;const text=val.replace(${matrix},'');return text},z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()))`,
    ],
    [
      { type: 'integer' },
      { paramIn: 'path', style: 'simple' },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())',
    ],
    // allowEmptyValue and JSON content.
    [
      { type: 'integer', default: 1 },
      { paramIn: 'query', allowEmptyValue: true },
      `z.preprocess((val)=>(val===''?undefined:val),z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int()).default(1))`,
    ],
    [
      { type: 'object', properties: { a: { type: 'integer' } } },
      { paramIn: 'query', contentType: 'application/json' },
      `z.preprocess((val)=>{if(typeof val!=='string')return val;try{return JSON.parse(val)}catch{return val}},z.object({a:z.int().exactOptional()}))`,
    ],
    [
      { type: 'integer' },
      { paramIn: 'query', contentType: 'application/problem+json; charset=utf-8' },
      `z.preprocess((val)=>{if(typeof val!=='string')return val;try{return JSON.parse(val)}catch{return val}},z.int())`,
    ],
    [
      { type: 'integer' },
      { paramIn: 'query', contentType: 'text/plain' },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())',
    ],
  ])('zod(%o, %o) → %s', (schema, options, expected) => {
    expect(zod(schema, 'Schema', false, options)).toBe(expected)
  })

  it('reads a header array property with its own style', () => {
    const wire =
      'z.preprocess((val)=>(val===undefined||Array.isArray(val)?val:[val]),z.array(z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int())))'
    const reader =
      "(val)=>{if(typeof val!=='string')return val;const text=val;return (text===''?[]:text.split(\",\"))}"
    expect(
      zod(
        {
          type: 'object',
          properties: {
            'x-ids': {
              type: 'array',
              items: { type: 'integer' },
              'x-style': 'simple',
              'x-explode': false,
            },
          },
        },
        'Schema',
        false,
        { paramIn: 'header' },
      ),
    ).toBe(`z.object({"x-ids":z.preprocess(${reader},${wire}).exactOptional()})`)
  })

  describe('#106: a $ref beside a default is wrapped once', () => {
    it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
      [
        {
          type: 'object',
          properties: { ref_def: { $ref: '#/components/schemas/Count', default: 3 } },
        },
        undefined,
        'z.object({ref_def:CountSchema.default(3).exactOptional()})',
      ],
      [
        { $ref: '#/components/schemas/Count', default: 3 },
        { paramIn: 'query' },
        'CountSchema.default(3)',
      ],
      [{ type: 'integer', format: 'uint32' }, undefined, 'z.uint32()'],
      [
        {
          $ref: '#/$defs/Filters',
          default: { fetch_user_data: false, fetch_connection_secrets: false },
        },
        {
          definitions: {
            Filters: {
              type: 'object',
              properties: { fetch_connection_secrets: { type: 'boolean' } },
            },
          },
        },
        'FiltersSchema.default({"fetch_connection_secrets":false})',
      ],
    ])('zod(%o, %o) → %s', (schema, options, expected) => {
      expect(zod(schema, 'Schema', false, options)).toBe(expected)
    })
  })
})

describe('allOf keyword members', () => {
  it.concurrent.each<[JSONSchema, EmitOptions | undefined, string]>([
    [{ allOf: [{ type: 'integer' }, { minimum: 5 }] }, undefined, 'z.int().min(5)'],
    [{ allOf: [{ type: 'string' }, { maxLength: 10 }] }, undefined, 'z.string().max(10)'],
    [
      { allOf: [{ minimum: 5 }] },
      undefined,
      "z.any().refine((val) => (typeof val !== 'number' || (val >= 5)))",
    ],
    [
      { allOf: [{ type: 'integer' }, { minimum: 5 }] },
      { paramIn: 'query' },
      'z.string().regex(/^-?(?:0|[1-9]\\d*)$/).transform((val)=>Number(val)).pipe(z.number().int().min(5))',
    ],
  ])('zod(%o, %o) → %s', (schema, options, expected) => {
    expect(zod(schema, 'Schema', false, options)).toBe(expected)
  })
})

describe('object defaults and additionalProperties', () => {
  it('keeps only declared keys of an object default', () => {
    expect(
      zod({
        type: 'object',
        properties: {
          active: { type: 'boolean' },
          fetch_connection_secrets: { type: 'boolean' },
        },
        default: { fetch_user_data: false, fetch_connection_secrets: false },
      }),
    ).toBe(
      'z.object({active:z.boolean().exactOptional(),fetch_connection_secrets:z.boolean().exactOptional()}).default({"fetch_connection_secrets":false})',
    )
  })

  it('emits a record for an additionalProperties-only schema', () => {
    expect(
      zod({
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { additionalProperties: { type: 'number' } },
        ],
      }),
    ).toBe(
      'z.intersection(z.object({a:z.string().exactOptional()}),z.record(z.string(),z.number()))',
    )
  })
})
