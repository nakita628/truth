import { describe, expect, it } from 'vite-plus/test'

import { schemaToArktype } from './index.js'

describe('schemaToArktype', () => {
  it('should drop a scalar default on an array schema', () => {
    const result = schemaToArktype(
      {
        title: 'Criteria',
        type: 'array',
        items: { type: 'string' },
        default: 'eval',
      },
      { exportType: false },
    )
    const expected = `import { type } from "arktype"

export const Criteria = type("string[]")`
    expect(result).toBe(expected)
  })

  it('should generate simple schema without definitions', () => {
    const result = schemaToArktype({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import { type } from "arktype"

export const Schema = type({name:"string","age?":"number"})

export type Schema = typeof Schema.infer`
    expect(result).toBe(expected)
  })

  it('emits standalone cross-schema $refs as value references, not scope-DSL strings', () => {
    // Without definitions the output is a bare `const`, so refs to sibling components must be
    // value references (`PetSchema`) that resolve against imports — quoted DSL strings would only
    // resolve inside scope({...}) and throw 'PetSchema is unresolvable' at runtime.
    const result = schemaToArktype(
      {
        title: 'Owner',
        type: 'object',
        required: ['pet'],
        properties: {
          pet: { $ref: '#/components/schemas/Pet' },
          tags: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
        },
      },
      { openapi: true },
    )
    const expected = `import { type } from "arktype"

export const Owner = type({pet:PetSchema,"tags?":type(TagSchema).array()})

export type Owner = typeof Owner.infer`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToArktype({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import { type } from "arktype"

export const User = type({"name?":"string"})

export type User = typeof User.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToArktype({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Enum = type({"status?":"'active' | 'inactive'"})

export type Enum = typeof Enum.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToArktype({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Const = type({"type?":"'user'"})

export type Const = typeof Const.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToArktype({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import { type } from "arktype"

export const Required = type({name:"string",age:"number"})

export type Required = typeof Required.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToArktype({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import { type } from "arktype"

export const Int = type({count:"number.integer",score:"number.integer >= 0 & number.integer <= 100"})

export type Int = typeof Int.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToArktype({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Array = type({"items?":"string[]"})

export type Array = typeof Array.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToArktype({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Union = type({"value?":"string | number"})

export type Union = typeof Union.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with nullable', () => {
    const result = schemaToArktype({
      title: 'Nullable',
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
      },
    })
    const expected = `import { type } from "arktype"

export const Nullable = type({"name?":"string | null"})

export type Nullable = typeof Nullable.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with definitions using scope', () => {
    const result = schemaToArktype({
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
    const expected = `import { scope } from "arktype"

const types = scope({B:{"name?":"string"},A:{"b?":"B"}}).export()

export const A = types.A

export type A = typeof A.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToArktype({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import { type } from "arktype"

export const Additional = type({"[string]":"string"})

export type Additional = typeof Additional.infer`
    expect(result).toBe(expected)
  })

  it('should handle number with minimum/maximum', () => {
    const result = schemaToArktype({
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
    const expected = `import { type } from "arktype"

export const MinMax = type({"age?":"number >= 0 & number <= 120"})

export type MinMax = typeof MinMax.infer`
    expect(result).toBe(expected)
  })

  it('should handle boolean type', () => {
    const result = schemaToArktype({
      title: 'Bool',
      type: 'boolean',
    })
    const expected = `import { type } from "arktype"

export const Bool = type("boolean")

export type Bool = typeof Bool.infer`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToArktype(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import { type } from "arktype"

export const Schema = type({"name?":"string"})`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToArktype({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { type } from "arktype"

export const AnyOf = type({"value?":"string | number"})

export type AnyOf = typeof AnyOf.infer`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToArktype({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import { type } from "arktype"

export const Arr = type({tags:type("string[]").and(type("1 <= unknown[] <= 10"))})

export type Arr = typeof Arr.infer`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToArktype({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import { type } from "arktype"

export const Fixed = type({pair:type("number[]").and(type("unknown[] == 3"))})

export type Fixed = typeof Fixed.infer`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems only', () => {
    const result = schemaToArktype({
      title: 'MinOnly',
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' }, minItems: 1 },
      },
      required: ['items'],
    })
    const expected = `import { type } from "arktype"

export const MinOnly = type({items:type("string[]").and(type("unknown[] >= 1"))})

export type MinOnly = typeof MinOnly.infer`
    expect(result).toBe(expected)
  })

  it('should handle allOf combinator', () => {
    const result = schemaToArktype({
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
    const expected = `import { type } from "arktype"

export const AllOf = type({"value?":type(type({"name?":"string"})).and(type({"age?":"number"}))})

export type AllOf = typeof AllOf.infer`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToArktype({
      title: 'D',
      type: 'date',
    })
    const expected = `import { type } from "arktype"

export const D = type("Date")

export type D = typeof D.infer`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToArktype({
      title: 'N',
      type: 'null',
    })
    const expected = `import { type } from "arktype"

export const N = type("null | null")

export type N = typeof N.infer`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToArktype({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import { type } from "arktype"

export const Empty = type({})

export type Empty = typeof Empty.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs using scope', () => {
    const result = schemaToArktype({
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
    const expected = `import { scope } from "arktype"

const types = scope({Address:{"street?":"string"},User:{"address?":"Address"}}).export()

export const User = types.User

export type User = typeof User.infer`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: false', () => {
    const result = schemaToArktype({
      type: 'object',
      properties: { test: { type: 'string' } },
      required: ['test'],
      additionalProperties: false,
    })
    const expected = `import { type } from "arktype"

export const Schema = type({test:"string","+":"reject"})

export type Schema = typeof Schema.infer`
    expect(result).toBe(expected)
  })

  it('should handle string type at root', () => {
    const result = schemaToArktype({
      title: 'Name',
      type: 'string',
    })
    const expected = `import { type } from "arktype"

export const Name = type("string")

export type Name = typeof Name.infer`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: true with properties', () => {
    const result = schemaToArktype({
      title: 'Loose',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: true,
    })
    const expected = `import { type } from "arktype"

export const Loose = type({name:"string","+":"delete"})

export type Loose = typeof Loose.infer`
    expect(result).toBe(expected)
  })

  it('should handle special key escaping in properties', () => {
    const result = schemaToArktype({
      title: 'Special',
      type: 'object',
      properties: {
        'x-value': { type: 'string' },
        normal: { type: 'number' },
      },
      required: ['x-value'],
    })
    const expected = `import { type } from "arktype"

export const Special = type({"x-value":"string","normal?":"number"})

export type Special = typeof Special.infer`
    expect(result).toBe(expected)
  })

  it('should handle array with maxItems only', () => {
    const result = schemaToArktype({
      title: 'MaxOnly',
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'string' }, maxItems: 5 },
      },
      required: ['items'],
    })
    const expected = `import { type } from "arktype"

export const MaxOnly = type({items:type("string[]").and(type("unknown[] <= 5"))})

export type MaxOnly = typeof MaxOnly.infer`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: true boolean without properties', () => {
    const result = schemaToArktype({
      title: 'AnyObj',
      type: 'object',
      additionalProperties: true,
    })
    const expected = `import { type } from "arktype"

export const AnyObj = type("unknown")

export type AnyObj = typeof AnyObj.infer`
    expect(result).toBe(expected)
  })

  describe('readonly option', () => {
    it('should generate readonly object schema', () => {
      const result = schemaToArktype(
        {
          title: 'User',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import { type } from "arktype"\n\nexport const User = type({name:"string"}).readonly()`,
      )
    })

    it('should not affect primitive types', () => {
      const result = schemaToArktype(
        { title: 'Name', type: 'string' },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(`import { type } from "arktype"\n\nexport const Name = type("string")`)
    })
  })

  describe('self-reference and complex schemas', () => {
    it('should handle empty schema', () => {
      const result = schemaToArktype({}, { exportType: false })
      expect(result).toBe(`import { type } from "arktype"\n\nexport const Schema = type("unknown")`)
    })

    it('should handle definitions with scope', () => {
      const result = schemaToArktype(
        {
          title: 'Root',
          type: 'object',
          definitions: {
            Tag: { type: 'string' },
          },
          properties: {
            tag: { $ref: '#/definitions/Tag' },
          },
        },
        { exportType: false },
      )
      const expected = `import { scope } from "arktype"

const types = scope({Tag:"string",Root:{"tag?":"Tag"}}).export()

export const Root = types.Root`
      expect(result).toBe(expected)
    })
  })

  describe('x-brand', () => {
    it('should generate branded properties in object', () => {
      const result = schemaToArktype({
        title: 'User',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', 'x-brand': 'UserId' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      })
      const expected = `import { type } from "arktype"

export const User = type({id:type("string.uuid").brand("UserId"),name:"string"})

export type User = typeof User.infer`
      expect(result).toBe(expected)
    })

    it('should generate branded number with constraints', () => {
      const result = schemaToArktype({
        title: 'Product',
        type: 'object',
        properties: {
          price: { type: 'number', minimum: 0, 'x-brand': 'Price' },
          quantity: { type: 'integer', minimum: 0, 'x-brand': 'Quantity' },
        },
        required: ['price', 'quantity'],
      })
      const expected = `import { type } from "arktype"

export const Product = type({price:type("number >= 0").brand("Price"),quantity:type("number.integer >= 0").brand("Quantity")})

export type Product = typeof Product.infer`
      expect(result).toBe(expected)
    })

    it('should generate branded array', () => {
      const result = schemaToArktype({
        title: 'TagList',
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10,
        'x-brand': 'Tags',
      })
      const expected = `import { type } from "arktype"

export const TagList = type("string[]").and(type("1 <= unknown[] <= 10")).brand("Tags")

export type TagList = typeof TagList.infer`
      expect(result).toBe(expected)
    })

    it('should generate branded string with email format', () => {
      const result = schemaToArktype({
        title: 'Email',
        type: 'string',
        format: 'email',
        'x-brand': 'Email',
      })
      const expected = `import { type } from "arktype"

export const Email = type("string.email").brand("Email")

export type Email = typeof Email.infer`
      expect(result).toBe(expected)
    })

    it('should generate branded nullable string', () => {
      const result = schemaToArktype({
        title: 'NullableId',
        type: 'object',
        properties: {
          id: { type: 'string', nullable: true, 'x-brand': 'NullableId' },
        },
        required: ['id'],
      })
      const expected = `import { type } from "arktype"

export const NullableId = type({id:type("string | null").brand("NullableId")})

export type NullableId = typeof NullableId.infer`
      expect(result).toBe(expected)
    })

    it('should generate branded string with constraints', () => {
      const result = schemaToArktype({
        title: 'Username',
        type: 'string',
        minLength: 3,
        maxLength: 20,
        'x-brand': 'Username',
      })
      const expected = `import { type } from "arktype"

export const Username = type("string").narrow((data, ctx) => [...data].length >= 3 || ctx.mustBe("at least 3 characters")).narrow((data, ctx) => [...data].length <= 20 || ctx.mustBe("at most 20 characters")).brand("Username")

export type Username = typeof Username.infer`
      expect(result).toBe(expected)
    })

    it('should generate branded object', () => {
      const result = schemaToArktype({
        title: 'Config',
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        'x-brand': 'Config',
      })
      const expected = `import { type } from "arktype"

export const Config = type({name:"string"}).brand("Config")

export type Config = typeof Config.infer`
      expect(result).toBe(expected)
    })

    it('should not add brand when x-brand is absent', () => {
      const result = schemaToArktype({
        title: 'Plain',
        type: 'string',
      })
      const expected = `import { type } from "arktype"

export const Plain = type("string")

export type Plain = typeof Plain.infer`
      expect(result).toBe(expected)
    })
  })
})
