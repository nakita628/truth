import { describe, expect, it } from 'vite-plus/test'

import { schemaToValibot } from './index.js'

describe('schemaToValibot', () => {
  it('should drop a scalar default on an array schema', () => {
    const result = schemaToValibot(
      {
        title: 'Criteria',
        type: 'array',
        items: { type: 'string' },
        default: 'eval',
      },
      { exportType: false },
    )
    const expected = `import * as v from 'valibot'

export const Criteria = v.array(v.string())`
    expect(result).toBe(expected)
  })

  it('should generate simple schema without definitions', () => {
    const result = schemaToValibot({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import * as v from 'valibot'

export const Schema = v.object({name:v.string(),age:v.optional(v.number())})

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToValibot({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as v from 'valibot'

export const User = v.partial(v.object({name:v.string()}))

export type UserOutput = v.InferOutput<typeof User>`
    expect(result).toBe(expected)
  })

  it('should generate schema with self-referencing types', () => {
    const result = schemaToValibot({
      title: 'Node',
      type: 'object',
      definitions: {
        Node: {
          type: 'object',
          properties: {
            children: {
              type: 'array',
              items: { $ref: '#/definitions/Node' },
            },
          },
        },
      },
    })
    const expected = `import * as v from 'valibot'

type _Node = {children?: _Node[]}

export const Node: v.GenericSchema<unknown, _Node> = v.partial(v.object({children:v.array(v.lazy(() => Node))}))

export type NodeOutput = v.InferOutput<typeof Node>`
    expect(result).toBe(expected)
  })

  it('should generate schema with multiple definitions', () => {
    const result = schemaToValibot({
      title: 'A',
      type: 'object',
      properties: {
        b: { $ref: '#/definitions/B' },
      },
      definitions: {
        B: {
          type: 'object',
          properties: {
            c: { $ref: '#/definitions/C' },
          },
        },
        C: { type: 'string' },
      },
    })
    const expected = `import * as v from 'valibot'

type _A = {b?: _B}

type _C = string

type _B = {c?: _C}

const C: v.GenericSchema<unknown, _C> = v.string()

const B: v.GenericSchema<unknown, _B> = v.partial(v.object({c:v.lazy(() => C)}))

export const A: v.GenericSchema<unknown, _A> = v.partial(v.object({b:v.lazy(() => B)}))

export type AOutput = v.InferOutput<typeof A>`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs instead of definitions', () => {
    const result = schemaToValibot({
      title: 'User',
      type: 'object',
      $defs: {
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
          },
        },
      },
      properties: {
        address: { $ref: '#/$defs/Address' },
      },
    })
    const expected = `import * as v from 'valibot'

type _User = {address?: _Address}

type _Address = {street?: string}

const Address: v.GenericSchema<unknown, _Address> = v.partial(v.object({street:v.string()}))

export const User: v.GenericSchema<unknown, _User> = v.partial(v.object({address:v.lazy(() => Address)}))

export type UserOutput = v.InferOutput<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle schema with direct self reference', () => {
    const result = schemaToValibot({
      title: 'Schema',
      type: 'object',
      properties: {
        children: {
          type: 'array',
          items: { $ref: '#' },
        },
      },
    })
    const expected = `import * as v from 'valibot'

type _Schema = {children?: v.InferOutput<typeof Schema>[]}

export const Schema: v.GenericSchema<unknown, _Schema> = v.partial(v.object({children:v.array(v.lazy(() => Schema))}))

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToValibot({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Union = v.partial(v.object({value:v.union([v.string(),v.number()])}))

export type UnionOutput = v.InferOutput<typeof Union>`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToValibot({
      title: 'AllOf',
      type: 'object',
      properties: {
        value: {
          allOf: [
            { type: 'object', properties: { name: { type: 'string' } } },
            { type: 'object', properties: { age: { type: 'number' } } },
          ],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const AllOf = v.partial(v.object({value:v.intersect([v.partial(v.object({name:v.string()})),v.partial(v.object({age:v.number()}))])}))

export type AllOfOutput = v.InferOutput<typeof AllOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToValibot({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Enum = v.partial(v.object({status:v.picklist(["active","inactive"])}))

export type EnumOutput = v.InferOutput<typeof Enum>`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToValibot({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Const = v.partial(v.object({type:v.literal("user")}))

export type ConstOutput = v.InferOutput<typeof Const>`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToValibot({
      title: 'Format',
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
        uuid: {
          type: 'string',
          format: 'uuid',
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Format = v.partial(v.object({email:v.pipe(v.string(),v.email()),uuid:v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/))}))

export type FormatOutput = v.InferOutput<typeof Format>`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToValibot({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^d+$',
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Pattern = v.partial(v.object({phone:v.pipe(v.string(),v.regex(/^d+$/))}))

export type PatternOutput = v.InferOutput<typeof Pattern>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToValibot({
      title: 'MinMax',
      type: 'object',
      properties: {
        age: {
          type: 'number',
          minimum: 0,
          maximum: 120,
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const MinMax = v.partial(v.object({age:v.pipe(v.number(),v.minValue(0),v.maxValue(120))}))

export type MinMaxOutput = v.InferOutput<typeof MinMax>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToValibot({
      title: 'Length',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Length = v.partial(v.object({name:v.pipe(v.string(),v.minCodePoints(1),v.maxCodePoints(100))}))

export type LengthOutput = v.InferOutput<typeof Length>`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToValibot({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import * as v from 'valibot'

export const Required = v.object({name:v.string(),age:v.number()})

export type RequiredOutput = v.InferOutput<typeof Required>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToValibot({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import * as v from 'valibot'

export const Additional = v.record(v.string(),v.string())

export type AdditionalOutput = v.InferOutput<typeof Additional>`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToValibot({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import * as v from 'valibot'

export const Int = v.object({count:v.pipe(v.number(),v.integer()),score:v.pipe(v.number(),v.integer(),v.minValue(0),v.maxValue(100))})

export type IntOutput = v.InferOutput<typeof Int>`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToValibot({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Array = v.partial(v.object({items:v.array(v.string())}))

export type ArrayOutput = v.InferOutput<typeof Array>`
    expect(result).toBe(expected)
  })

  it('should handle schema with strictObject', () => {
    const result = schemaToValibot({
      type: 'object',
      properties: { test: { type: 'string' } },
      required: ['test'],
      additionalProperties: false,
    })
    const expected = `import * as v from 'valibot'

export const Schema = v.strictObject({test:v.string()})

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with looseObject', () => {
    const result = schemaToValibot({
      type: 'object',
      properties: { test: { type: 'string' } },
      required: ['test'],
      additionalProperties: true,
    })
    const expected = `import * as v from 'valibot'

export const Schema = v.looseObject({test:v.string()})

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToValibot(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import * as v from 'valibot'

export const Schema = v.partial(v.object({name:v.string()}))`
    expect(result).toBe(expected)
  })

  it('should handle allOf with default value', () => {
    const result = schemaToValibot({
      title: 'WithDefault',
      type: 'object',
      properties: {
        status: {
          allOf: [{ type: 'string' }, { default: 'active' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const WithDefault = v.object({status:v.optional(v.string(),"active")})

export type WithDefaultOutput = v.InferOutput<typeof WithDefault>`
    expect(result).toBe(expected)
  })

  it('should handle allOf with nullable and default', () => {
    const result = schemaToValibot({
      title: 'NullDefault',
      type: 'object',
      properties: {
        value: {
          allOf: [{ type: 'string' }, { default: 'x' }, { type: 'null' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const NullDefault = v.object({value:v.optional(v.nullable(v.string()),"x")})

export type NullDefaultOutput = v.InferOutput<typeof NullDefault>`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToValibot({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const AnyOf = v.partial(v.object({value:v.union([v.string(),v.number()])}))

export type AnyOfOutput = v.InferOutput<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToValibot({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import * as v from 'valibot'

export const Arr = v.object({tags:v.pipe(v.array(v.string()),v.minLength(1),v.maxLength(10))})

export type ArrOutput = v.InferOutput<typeof Arr>`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToValibot({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import * as v from 'valibot'

export const Fixed = v.object({pair:v.pipe(v.array(v.number()),v.length(3))})

export type FixedOutput = v.InferOutput<typeof Fixed>`
    expect(result).toBe(expected)
  })

  it('should handle nullable type', () => {
    const result = schemaToValibot({
      title: 'Null',
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
      required: ['value'],
    })
    const expected = `import * as v from 'valibot'

export const Null = v.object({value:v.nullable(v.string())})

export type NullOutput = v.InferOutput<typeof Null>`
    expect(result).toBe(expected)
  })

  it('should handle default value', () => {
    const result = schemaToValibot({
      title: 'Def',
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
      },
    })
    const expected = `import * as v from 'valibot'

export const Def = v.object({enabled:v.optional(v.boolean(),true)})

export type DefOutput = v.InferOutput<typeof Def>`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToValibot({
      title: 'D',
      type: 'date',
    })
    const expected = `import * as v from 'valibot'

export const D = v.date()

export type DOutput = v.InferOutput<typeof D>`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToValibot({
      title: 'N',
      type: 'null',
    })
    const expected = `import * as v from 'valibot'

export const N = v.nullable(v.null())

export type NOutput = v.InferOutput<typeof N>`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToValibot({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import * as v from 'valibot'

export const Empty = v.object({})

export type EmptyOutput = v.InferOutput<typeof Empty>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with oneOf type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Status: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
      properties: {
        status: { $ref: '#/definitions/Status' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {status?: _Status}\n\ntype _Status = (string | number)\n\nconst Status: v.GenericSchema<unknown, _Status> = v.union([v.string(),v.number()])\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({status:v.lazy(() => Status)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with anyOf type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Value: {
          anyOf: [{ type: 'boolean' }, { type: 'string' }],
        },
      },
      properties: {
        value: { $ref: '#/definitions/Value' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {value?: _Value}\n\ntype _Value = (boolean | string)\n\nconst Value: v.GenericSchema<unknown, _Value> = v.union([v.boolean(),v.string()])\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({value:v.lazy(() => Value)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with allOf type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Combined: {
          allOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'number' } } },
          ],
        },
      },
      properties: {
        data: { $ref: '#/definitions/Combined' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {data?: _Combined}\n\ntype _Combined = ({a?: string} & {b?: number})\n\nconst Combined: v.GenericSchema<unknown, _Combined> = v.intersect([v.partial(v.object({a:v.string()})),v.partial(v.object({b:v.number()}))])\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({data:v.lazy(() => Combined)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with const value', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Version: { const: 'v1' },
      },
      properties: {
        version: { $ref: '#/definitions/Version' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {version?: _Version}\n\ntype _Version = "v1"\n\nconst Version: v.GenericSchema<unknown, _Version> = v.literal("v1")\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({version:v.lazy(() => Version)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with enum', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Color: { enum: ['red', 'green', 'blue'] },
      },
      properties: {
        color: { $ref: '#/definitions/Color' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {color?: _Color}\n\ntype _Color = ("red" | "green" | "blue")\n\nconst Color: v.GenericSchema<unknown, _Color> = v.picklist(["red","green","blue"])\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({color:v.lazy(() => Color)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with single enum', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        SingleVal: { enum: ['only'] },
      },
      properties: {
        val: { $ref: '#/definitions/SingleVal' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {val?: _SingleVal}\n\ntype _SingleVal = "only"\n\nconst SingleVal: v.GenericSchema<unknown, _SingleVal> = v.literal('only')\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({val:v.lazy(() => SingleVal)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with array type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Tags: { type: 'array', items: { type: 'string' } },
      },
      properties: {
        tags: { $ref: '#/definitions/Tags' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {tags?: _Tags}\n\ntype _Tags = string[]\n\nconst Tags: v.GenericSchema<unknown, _Tags> = v.array(v.string())\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({tags:v.lazy(() => Tags)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with date type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Timestamp: { type: 'date' },
      },
      properties: {
        ts: { $ref: '#/definitions/Timestamp' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {ts?: _Timestamp}\n\ntype _Timestamp = Date\n\nconst Timestamp: v.GenericSchema<unknown, _Timestamp> = v.date()\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({ts:v.lazy(() => Timestamp)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with null type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Nothing: { type: 'null' },
      },
      properties: {
        n: { $ref: '#/definitions/Nothing' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {n?: _Nothing}\n\ntype _Nothing = null\n\nconst Nothing: v.GenericSchema<unknown, _Nothing> = v.nullable(v.null())\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({n:v.lazy(() => Nothing)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with boolean type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Flag: { type: 'boolean' },
      },
      properties: {
        flag: { $ref: '#/definitions/Flag' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {flag?: _Flag}\n\ntype _Flag = boolean\n\nconst Flag: v.GenericSchema<unknown, _Flag> = v.boolean()\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({flag:v.lazy(() => Flag)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with integer type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Count: { type: 'integer' },
      },
      properties: {
        count: { $ref: '#/definitions/Count' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {count?: _Count}\n\ntype _Count = number\n\nconst Count: v.GenericSchema<unknown, _Count> = v.pipe(v.number(),v.integer())\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({count:v.lazy(() => Count)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with additionalProperties boolean true', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Loose: { type: 'object', additionalProperties: true },
      },
      properties: {
        l: { $ref: '#/definitions/Loose' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {l?: _Loose}\n\ntype _Loose = { [key: string]: unknown }\n\nconst Loose: v.GenericSchema<unknown, _Loose> = v.any()\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({l:v.lazy(() => Loose)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with additionalProperties schema', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Dict: { type: 'object', additionalProperties: { type: 'number' } },
      },
      properties: {
        d: { $ref: '#/definitions/Dict' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {d?: _Dict}\n\ntype _Dict = { [key: string]: number }\n\nconst Dict: v.GenericSchema<unknown, _Dict> = v.record(v.string(),v.number())\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({d:v.lazy(() => Dict)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with not keyword', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Neg: { not: { type: 'string' } },
      },
      properties: {
        neg: { $ref: '#/definitions/Neg' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {neg?: _Neg}\n\ntype _Neg = unknown\n\nconst Neg: v.GenericSchema<unknown, _Neg> = v.custom<unknown>((input) => typeof input !== 'string')\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({neg:v.lazy(() => Neg)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with key escaping', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Special: {
          type: 'object',
          properties: {
            'x-value': { type: 'string' },
            normal: { type: 'number' },
          },
          required: ['x-value'],
        },
      },
      properties: {
        data: { $ref: '#/definitions/Special' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype _Root = {data?: _Special}\n\ntype _Special = {"x-value": string; normal?: number}\n\nconst Special: v.GenericSchema<unknown, _Special> = v.object({"x-value":v.string(),normal:v.optional(v.number())})\n\nexport const Root: v.GenericSchema<unknown, _Root> = v.partial(v.object({data:v.lazy(() => Special)}))\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  describe('readonly option', () => {
    it('should generate readonly object schema', () => {
      const result = schemaToValibot(
        {
          title: 'User',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import * as v from 'valibot'\n\nexport const User = v.pipe(v.object({name:v.string()}),v.readonly())`,
      )
    })

    it('should generate readonly array in object', () => {
      const result = schemaToValibot(
        {
          title: 'List',
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'string' } },
          },
          required: ['items'],
        },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import * as v from 'valibot'\n\nexport const List = v.pipe(v.object({items:v.pipe(v.array(v.string()),v.readonly())}),v.readonly())`,
      )
    })

    it('should not affect primitive types', () => {
      const result = schemaToValibot(
        { title: 'Name', type: 'string' },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(`import * as v from 'valibot'\n\nexport const Name = v.string()`)
    })
  })

  describe('self-reference and circular schemas', () => {
    it('should handle direct self-reference ($ref: "#")', () => {
      const result = schemaToValibot({
        title: 'Tree',
        type: 'object',
        properties: {
          children: { type: 'array', items: { $ref: '#' } },
        },
      })
      const expected = `import * as v from 'valibot'

type _Tree = {children?: v.InferOutput<typeof Tree>[]}

export const Tree: v.GenericSchema<unknown, _Tree> = v.partial(v.object({children:v.array(v.lazy(() => Tree))}))

export type TreeOutput = v.InferOutput<typeof Tree>`
      expect(result).toBe(expected)
    })

    it('should handle root name in definitions', () => {
      const result = schemaToValibot(
        {
          title: 'Node',
          type: 'object',
          definitions: {
            Node: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                next: { $ref: '#/definitions/Node' },
              },
              required: ['value'],
            },
          },
        },
        { exportType: false },
      )
      const expected = `import * as v from 'valibot'

type _Node = {value: string; next?: _Node}

export const Node: v.GenericSchema<unknown, _Node> = v.object({value:v.string(),next:v.optional(v.lazy(() => Node))})`
      expect(result).toBe(expected)
    })

    it('should handle empty schema', () => {
      const result = schemaToValibot({}, { exportType: false })
      expect(result).toBe(`import * as v from 'valibot'\n\nexport const Schema = v.any()`)
    })

    it('should handle openapi option with title', () => {
      const result = schemaToValibot(
        {
          title: 'user-profile',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        { openapi: true, exportType: false },
      )
      expect(result).toBe(
        `import * as v from 'valibot'\n\nexport const UserProfile = v.object({name:v.string()})`,
      )
    })
  })

  describe('x-brand', () => {
    it('should generate branded properties in object', () => {
      const result = schemaToValibot({
        title: 'User',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', 'x-brand': 'UserId' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      })
      const expected = `import * as v from 'valibot'

export const User = v.object({id:v.pipe(v.pipe(v.string(),v.regex(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/)),v.brand("UserId")),name:v.string()})

export type UserOutput = v.InferOutput<typeof User>`
      expect(result).toBe(expected)
    })

    it('should generate branded number with constraints', () => {
      const result = schemaToValibot({
        title: 'Product',
        type: 'object',
        properties: {
          price: { type: 'number', minimum: 0, 'x-brand': 'Price' },
          quantity: { type: 'integer', minimum: 0, 'x-brand': 'Quantity' },
        },
        required: ['price', 'quantity'],
      })
      const expected = `import * as v from 'valibot'

export const Product = v.object({price:v.pipe(v.pipe(v.number(),v.minValue(0)),v.brand("Price")),quantity:v.pipe(v.pipe(v.number(),v.integer(),v.minValue(0)),v.brand("Quantity"))})

export type ProductOutput = v.InferOutput<typeof Product>`
      expect(result).toBe(expected)
    })

    it('should generate branded array', () => {
      const result = schemaToValibot({
        title: 'TagList',
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10,
        'x-brand': 'Tags',
      })
      const expected = `import * as v from 'valibot'

export const TagList = v.pipe(v.pipe(v.array(v.string()),v.minLength(1),v.maxLength(10)),v.brand("Tags"))

export type TagListOutput = v.InferOutput<typeof TagList>`
      expect(result).toBe(expected)
    })

    it('should generate branded string with email format', () => {
      const result = schemaToValibot({
        title: 'Email',
        type: 'string',
        format: 'email',
        'x-brand': 'Email',
      })
      const expected = `import * as v from 'valibot'

export const Email = v.pipe(v.pipe(v.string(),v.email()),v.brand("Email"))

export type EmailOutput = v.InferOutput<typeof Email>`
      expect(result).toBe(expected)
    })

    it('should generate branded nullable string', () => {
      const result = schemaToValibot({
        title: 'NullableId',
        type: 'object',
        properties: {
          id: { type: 'string', nullable: true, 'x-brand': 'NullableId' },
        },
        required: ['id'],
      })
      const expected = `import * as v from 'valibot'

export const NullableId = v.object({id:v.pipe(v.nullable(v.string()),v.brand("NullableId"))})

export type NullableIdOutput = v.InferOutput<typeof NullableId>`
      expect(result).toBe(expected)
    })

    it('should generate branded string with default', () => {
      const result = schemaToValibot({
        title: 'Config',
        type: 'object',
        properties: {
          role: { type: 'string', default: 'user', 'x-brand': 'Role' },
        },
        required: ['role'],
      })
      const expected = `import * as v from 'valibot'

export const Config = v.object({role:v.pipe(v.optional(v.string(),"user"),v.brand("Role"))})

export type ConfigOutput = v.InferOutput<typeof Config>`
      expect(result).toBe(expected)
    })

    it('should generate branded string with minLength/maxLength', () => {
      const result = schemaToValibot({
        title: 'Username',
        type: 'string',
        minLength: 3,
        maxLength: 20,
        'x-brand': 'Username',
      })
      const expected = `import * as v from 'valibot'

export const Username = v.pipe(v.pipe(v.string(),v.minCodePoints(3),v.maxCodePoints(20)),v.brand("Username"))

export type UsernameOutput = v.InferOutput<typeof Username>`
      expect(result).toBe(expected)
    })

    it('should generate branded boolean', () => {
      const result = schemaToValibot({
        title: 'Flag',
        type: 'boolean',
        'x-brand': 'Flag',
      })
      const expected = `import * as v from 'valibot'

export const Flag = v.pipe(v.boolean(),v.brand("Flag"))

export type FlagOutput = v.InferOutput<typeof Flag>`
      expect(result).toBe(expected)
    })

    it('should not add brand when x-brand is absent', () => {
      const result = schemaToValibot({
        title: 'Plain',
        type: 'string',
      })
      const expected = `import * as v from 'valibot'

export const Plain = v.string()

export type PlainOutput = v.InferOutput<typeof Plain>`
      expect(result).toBe(expected)
    })
  })
})
