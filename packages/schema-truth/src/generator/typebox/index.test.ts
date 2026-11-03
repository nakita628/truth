import { describe, expect, it } from 'vite-plus/test'

import { schemaToTypebox } from './index.js'

describe('schemaToTypebox', () => {
  it('should drop a scalar default on an array schema', () => {
    const result = schemaToTypebox(
      {
        title: 'Criteria',
        type: 'array',
        items: { type: 'string' },
        default: 'eval',
      },
      { exportType: false },
    )
    const expected = `import { Type, type Static } from 'typebox'

export const Criteria = Type.Array(Type.String())`
    expect(result).toBe(expected)
  })

  it('should emit Type.Null for a null const and Type.Any for a composite const', () => {
    expect(schemaToTypebox({ title: 'C', const: null }, { exportType: false })).toBe(
      `import { Type, type Static } from 'typebox'

export const C = Type.Null()`,
    )
    expect(
      schemaToTypebox({ title: 'D', const: { nested: { value: 42 } } }, { exportType: false }),
    ).toBe(
      `import { Type, type Static } from 'typebox'

export const D = Type.Any()`,
    )
  })

  it('should generate simple schema without definitions', () => {
    const result = schemaToTypebox({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Schema = Type.Object({name:Type.String(),age:Type.Optional(Type.Number())})

export type Schema = Static<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToTypebox({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const User = Type.Object({name:Type.Optional(Type.String())})

export type User = Static<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToTypebox({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Enum = Type.Object({status:Type.Optional(Type.Union([Type.Literal("active"),Type.Literal("inactive")]))})

export type Enum = Static<typeof Enum>`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToTypebox({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Const = Type.Object({type:Type.Optional(Type.Literal("user"))})

export type Const = Static<typeof Const>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from 'typebox'

export const MinMax = Type.Object({age:Type.Optional(Type.Number({minimum:0,maximum:120}))})

export type MinMax = Static<typeof MinMax>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from 'typebox'

export const Length = Type.Object({name:Type.Optional(Type.String({minLength:1,maxLength:100}))})

export type Length = Static<typeof Length>`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToTypebox({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Required = Type.Object({name:Type.String(),age:Type.Number()})

export type Required = Static<typeof Required>`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToTypebox({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Int = Type.Object({count:Type.Integer(),score:Type.Integer({minimum:0,maximum:100})})

export type Int = Static<typeof Int>`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToTypebox({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Array = Type.Object({items:Type.Optional(Type.Array(Type.String()))})

export type Array = Static<typeof Array>`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToTypebox({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Union = Type.Object({value:Type.Optional(Type.Union([Type.String(),Type.Number()]))})

export type Union = Static<typeof Union>`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from 'typebox'

export const AllOf = Type.Object({value:Type.Optional(Type.Intersect([Type.Object({name:Type.Optional(Type.String())}),Type.Object({age:Type.Optional(Type.Number())})]))})

export type AllOf = Static<typeof AllOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToTypebox({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Additional = Type.Record(Type.String(),Type.String())

export type Additional = Static<typeof Additional>`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToTypebox({
      title: 'Format',
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Format = Type.Object({email:Type.Optional(Type.String({format:"email"}))})

export type Format = Static<typeof Format>`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToTypebox({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^\\d+$',
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Pattern = Type.Object({phone:Type.Optional(Type.String({pattern:"^\\\\d+$"}))})

export type Pattern = Static<typeof Pattern>`
    expect(result).toBe(expected)
  })

  it('should handle schema with nullable', () => {
    const result = schemaToTypebox({
      title: 'Nullable',
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Nullable = Type.Object({name:Type.Optional(Type.Union([Type.String(),Type.Null()]))})

export type Nullable = Static<typeof Nullable>`
    expect(result).toBe(expected)
  })

  it('should handle schema with multiple definitions', () => {
    const result = schemaToTypebox({
      title: 'A',
      type: 'object',
      properties: {
        b: { $ref: '#/definitions/B' },
      },
      definitions: {
        B: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

const B = Type.Object({name:Type.Optional(Type.String())})

export const A = Type.Object({b:Type.Optional(B)})

export type A = Static<typeof A>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToTypebox(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import { Type, type Static } from 'typebox'

export const Schema = Type.Object({name:Type.Optional(Type.String())})`
    expect(result).toBe(expected)
  })

  it('should handle allOf with default value', () => {
    const result = schemaToTypebox({
      title: 'WithDefault',
      type: 'object',
      properties: {
        status: {
          allOf: [{ type: 'string' }, { default: 'active' }],
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const WithDefault = Type.Object({status:Type.Optional(Type.Intersect([Type.String()],{default:"active"}))})

export type WithDefault = Static<typeof WithDefault>`
    expect(result).toBe(expected)
  })

  it('should handle allOf with nullable and default', () => {
    const result = schemaToTypebox({
      title: 'NullDefault',
      type: 'object',
      properties: {
        value: {
          allOf: [{ type: 'string' }, { default: 'x' }, { type: 'null' }],
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const NullDefault = Type.Object({value:Type.Optional(Type.Union([Type.Intersect([Type.String()],{default:"x"}),Type.Null()]))})

export type NullDefault = Static<typeof NullDefault>`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToTypebox({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const AnyOf = Type.Object({value:Type.Optional(Type.Union([Type.String(),Type.Number()]))})

export type AnyOf = Static<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToTypebox({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Arr = Type.Object({tags:Type.Array(Type.String(),{minItems:1,maxItems:10})})

export type Arr = Static<typeof Arr>`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToTypebox({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Fixed = Type.Object({pair:Type.Array(Type.Number(),{minItems:3,maxItems:3})})

export type Fixed = Static<typeof Fixed>`
    expect(result).toBe(expected)
  })

  it('should handle default value', () => {
    const result = schemaToTypebox({
      title: 'Def',
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Def = Type.Object({enabled:Type.Optional(Type.Boolean({default:true}))})

export type Def = Static<typeof Def>`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToTypebox({
      title: 'D',
      type: 'date',
    })
    const expected = `import { Codec, Type, type Static } from 'typebox'

export const D = Codec(Type.String()).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString())

export type D = Static<typeof D>`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToTypebox({
      title: 'N',
      type: 'null',
    })
    const expected = `import { Type, type Static } from 'typebox'

export const N = Type.Union([Type.Null(),Type.Null()])

export type N = Static<typeof N>`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from 'typebox'

const Address = Type.Object({street:Type.Optional(Type.String())})

export const User = Type.Object({address:Type.Optional(Address)})

export type User = Static<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle strictObject (additionalProperties: false)', () => {
    const result = schemaToTypebox({
      type: 'object',
      properties: { test: { type: 'string' } },
      required: ['test'],
      additionalProperties: false,
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Schema = Type.Object({test:Type.String()},{additionalProperties:false})

export type Schema = Static<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToTypebox({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Empty = Type.Object({})

export type Empty = Static<typeof Empty>`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: true with properties', () => {
    const result = schemaToTypebox({
      title: 'Loose',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: true,
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Loose = Type.Object({name:Type.String()})

export type Loose = Static<typeof Loose>`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: true boolean without properties', () => {
    const result = schemaToTypebox({
      title: 'AnyObj',
      type: 'object',
      additionalProperties: true,
    })
    const expected = `import { Type, type Static } from 'typebox'

export const AnyObj = Type.Any()

export type AnyObj = Static<typeof AnyObj>`
    expect(result).toBe(expected)
  })

  it('should handle special key escaping', () => {
    const result = schemaToTypebox({
      title: 'Special',
      type: 'object',
      properties: {
        'x-value': { type: 'string' },
      },
      required: ['x-value'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Special = Type.Object({"x-value":Type.String()})

export type Special = Static<typeof Special>`
    expect(result).toBe(expected)
  })

  it('should handle default string value', () => {
    const result = schemaToTypebox({
      title: 'Def',
      type: 'object',
      properties: {
        label: { type: 'string', default: 'untitled' },
      },
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Def = Type.Object({label:Type.Optional(Type.String({default:"untitled"}))})

export type Def = Static<typeof Def>`
    expect(result).toBe(expected)
  })

  it('should handle nullable type', () => {
    const result = schemaToTypebox({
      title: 'Null',
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
      required: ['value'],
    })
    const expected = `import { Type, type Static } from 'typebox'

export const Null = Type.Object({value:Type.Union([Type.String(),Type.Null()])})

export type Null = Static<typeof Null>`
    expect(result).toBe(expected)
  })

  describe('readonly option', () => {
    it('should generate readonly object schema', () => {
      const result = schemaToTypebox(
        {
          title: 'User',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const User = Type.Readonly(Type.Object({name:Type.String()}))`,
      )
    })

    it('should generate readonly array in object', () => {
      const result = schemaToTypebox(
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
        `import { Type, type Static } from 'typebox'\n\nexport const List = Type.Readonly(Type.Object({items:Type.Readonly(Type.Array(Type.String()))}))`,
      )
    })

    it('should not affect primitive types', () => {
      const result = schemaToTypebox(
        { title: 'Name', type: 'string' },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Name = Type.String()`,
      )
    })
  })

  describe('ref option', () => {
    it('puts ref on Type.String options', () => {
      expect(schemaToTypebox({ type: 'string' }, { exportType: false, ref: 'X' })).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Schema = Type.String({ref:"X"})`,
      )
    })

    it('puts ref first on Type.String when other options are present', () => {
      expect(
        schemaToTypebox(
          { title: 'Name', type: 'string', minLength: 1 },
          { exportType: false, ref: 'Name' },
        ),
      ).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Name = Type.String({ref:"Name",minLength:1})`,
      )
    })

    it('puts ref in the same Type.Object options as description', () => {
      expect(
        schemaToTypebox(
          { type: 'object', properties: { a: { type: 'string' } }, description: 'd' },
          { exportType: false, ref: 'X' },
        ),
      ).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Schema = Type.Object({a:Type.Optional(Type.String())},{ref:"X",description:"d"})`,
      )
    })

    it('keeps ref on the inner Type.Object, not on Type.Readonly from x-readonly', () => {
      expect(
        schemaToTypebox(
          { type: 'object', properties: { a: { type: 'string' } }, 'x-readonly': true },
          { exportType: false, openapi: true, ref: 'X' },
        ),
      ).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Schema = Type.Readonly(Type.Object({a:Type.Optional(Type.String())},{ref:"X"}))`,
      )
    })

    it('keeps ref on the inner Type.Object, not on Type.Readonly from the readonly option', () => {
      expect(
        schemaToTypebox(
          {
            title: 'Pet',
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
          { exportType: false, readonly: true, ref: 'Pet' },
        ),
      ).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Pet = Type.Readonly(Type.Object({name:Type.String()},{ref:"Pet"}))`,
      )
    })

    it('puts ref on the Type.String inside Codec, not on Codec', () => {
      expect(
        schemaToTypebox(
          { title: 'Name', type: 'string', 'x-trim': true },
          { exportType: false, ref: 'Name' },
        ),
      ).toBe(
        `import { Codec, Type, type Static } from 'typebox'\n\nexport const Name = Codec(Type.String({ref:"Name"})).Decode((value: string) => value.trim()).Encode((value: string) => value)`,
      )
    })

    it('puts ref on the Type.String inside a date Codec', () => {
      expect(schemaToTypebox({ title: 'D', type: 'date' }, { exportType: false, ref: 'D' })).toBe(
        `import { Codec, Type, type Static } from 'typebox'\n\nexport const D = Codec(Type.String({ref:"D"})).Decode((value)=>new Date(value)).Encode((value)=>value.toISOString())`,
      )
    })

    it('puts ref as the third argument of Type.Cyclic, not on members', () => {
      expect(
        schemaToTypebox(
          {
            title: 'Node',
            type: 'object',
            properties: { next: { $ref: '#' } },
          },
          { exportType: false, ref: 'Node' },
        ),
      ).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Node = Type.Cyclic({\nNode: Type.Object({next:Type.Optional(Type.Ref('Node'))})\n},'Node',{ref:"Node"})`,
      )
    })

    it('does not put the host ref on named $defs members', () => {
      expect(
        schemaToTypebox(
          {
            title: 'User',
            type: 'object',
            $defs: {
              Address: {
                type: 'object',
                properties: { street: { type: 'string' } },
              },
            },
            properties: { address: { $ref: '#/$defs/Address' } },
          },
          { exportType: false, ref: 'User' },
        ),
      ).toBe(
        `import { Type, type Static } from 'typebox'\n\nconst Address = Type.Object({street:Type.Optional(Type.String())})\n\nexport const User = Type.Object({address:Type.Optional(Address)},{ref:"User"})`,
      )
    })

    it("omitting ref is today's output", () => {
      expect(schemaToTypebox({ type: 'string' }, { exportType: false })).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Schema = Type.String()`,
      )
    })
  })

  describe('self-reference and complex schemas', () => {
    it('should handle empty schema', () => {
      const result = schemaToTypebox({}, { exportType: false })
      expect(result).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Schema = Type.Any()`,
      )
    })

    it('should handle root name in definitions', () => {
      const result = schemaToTypebox(
        {
          title: 'Node',
          type: 'object',
          definitions: {
            Node: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
              required: ['value'],
            },
          },
        },
        { exportType: false },
      )
      expect(result).toBe(
        `import { Type, type Static } from 'typebox'\n\nexport const Node = Type.Object({value:Type.String()})`,
      )
    })
  })
})
