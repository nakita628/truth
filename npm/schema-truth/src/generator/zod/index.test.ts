import { describe, expect, it } from 'vite-plus/test'

import { schemaToZod } from './index.js'

describe('schemaToZod', () => {
  it('should generate simple schema without definitions', () => {
    const result = schemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import * as z from 'zod'

export const Schema = z.object({name:z.string(),age:z.number().exactOptional()})

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToZod({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as z from 'zod'

export const User = z.object({name:z.string().exactOptional()})

export type User = z.infer<typeof User>`
    expect(result).toBe(expected)
  })

  it('should generate schema with self-referencing types', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

type _Node = {children?: _Node[]}

export const Node: z.ZodType<_Node> = z.object({children:z.array(z.lazy(() => Node)).exactOptional()})

export type Node = z.infer<typeof Node>`
    expect(result).toBe(expected)
  })

  it('should generate schema with multiple definitions', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

type _A = {b?: _B}

type _C = string

type _B = {c?: _C}

const C: z.ZodType<_C> = z.string()

const B: z.ZodType<_B> = z.object({c:z.lazy(() => C).exactOptional()})

export const A: z.ZodType<_A> = z.object({b:z.lazy(() => B).exactOptional()})

export type A = z.infer<typeof A>`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs instead of definitions', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

type _User = {address?: _Address}

type _Address = {street?: string}

const Address: z.ZodType<_Address> = z.object({street:z.string().exactOptional()})

export const User: z.ZodType<_User> = z.object({address:z.lazy(() => Address).exactOptional()})

export type User = z.infer<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle circular dependencies gracefully', () => {
    const result = schemaToZod({
      title: 'A',
      type: 'object',
      definitions: {
        A: {
          type: 'object',
          properties: {
            b: { $ref: '#/definitions/B' },
          },
        },
        B: {
          type: 'object',
          properties: {
            a: { $ref: '#/definitions/A' },
          },
        },
      },
    })
    const expected = `import * as z from 'zod'

type _A = {b?: _B}

type _B = {a?: _A}

const B: z.ZodType<_B> = z.object({a:z.lazy(() => A).exactOptional()})

export const A: z.ZodType<_A> = z.object({b:z.lazy(() => B).exactOptional()})

export type A = z.infer<typeof A>`
    expect(result).toBe(expected)
  })

  it('should handle schema with direct self reference', () => {
    const result = schemaToZod({
      title: 'Schema',
      type: 'object',
      properties: {
        children: {
          type: 'array',
          items: { $ref: '#' },
        },
      },
    })
    const expected = `import * as z from 'zod'

type _Schema = {children?: z.infer<typeof Schema>[]}

export const Schema: z.ZodType<_Schema> = z.object({children:z.array(z.lazy(() => Schema)).exactOptional()})

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema without title', () => {
    const result = schemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as z from 'zod'

export const Schema = z.object({name:z.string().exactOptional()})

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToZod({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Union = z.object({value:z.xor([z.string(),z.number()]).exactOptional()})

export type Union = z.infer<typeof Union>`
    expect(result).toBe(expected)
  })

  it('should handle schema with anyOf', () => {
    const result = schemaToZod({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const AnyOf = z.object({value:z.union([z.string(),z.number()]).exactOptional()})

export type AnyOf = z.infer<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

export const AllOf = z.object({value:z.intersection(z.object({name:z.string().exactOptional()}),z.object({age:z.number().exactOptional()})).exactOptional()})

export type AllOf = z.infer<typeof AllOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToZod({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Enum = z.object({status:z.enum(["active","inactive"]).exactOptional()})

export type Enum = z.infer<typeof Enum>`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToZod({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Const = z.object({type:z.literal("user").exactOptional()})

export type Const = z.infer<typeof Const>`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToZod({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Array = z.object({items:z.array(z.string()).exactOptional()})

export type Array = z.infer<typeof Array>`
    expect(result).toBe(expected)
  })

  it('should handle schema with nested objects', () => {
    const result = schemaToZod({
      title: 'Nested',
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Nested = z.object({user:z.object({name:z.string().exactOptional(),age:z.number().exactOptional()}).exactOptional()})

export type Nested = z.infer<typeof Nested>`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToZod({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import * as z from 'zod'

export const Required = z.object({name:z.string(),age:z.number()})

export type Required = z.infer<typeof Required>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToZod({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import * as z from 'zod'

export const Additional = z.record(z.string(),z.string())

export type Additional = z.infer<typeof Additional>`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

export const Format = z.object({email:z.email().exactOptional(),uuid:z.uuid().exactOptional()})

export type Format = z.infer<typeof Format>`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToZod({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^d+$',
        },
      },
    })

    const expected = `import * as z from 'zod'

export const Pattern = z.object({phone:z.string().regex(/^d+$/).exactOptional()})

export type Pattern = z.infer<typeof Pattern>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

export const MinMax = z.object({age:z.number().min(0).max(120).exactOptional()})

export type MinMax = z.infer<typeof MinMax>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToZod({
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
    const expected = `import * as z from 'zod'

export const Length = z.object({name:z.string().min(1).max(100).exactOptional()})

export type Length = z.infer<typeof Length>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToZod(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import * as z from 'zod'

export const Schema = z.object({name:z.string().exactOptional()})`
    expect(result).toBe(expected)
  })

  it('should drop a scalar default on an array schema', () => {
    const result = schemaToZod(
      {
        title: 'Criteria',
        type: 'array',
        items: { type: 'string' },
        default: 'eval',
      },
      { exportType: false },
    )
    const expected = `import * as z from 'zod'

export const Criteria = z.array(z.string())`
    expect(result).toBe(expected)
  })

  it('should handle allOf with default value', () => {
    const result = schemaToZod({
      title: 'WithDefault',
      type: 'object',
      properties: {
        status: {
          allOf: [{ type: 'string' }, { default: 'active' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const WithDefault = z.object({status:z.string().default("active").exactOptional()})

export type WithDefault = z.infer<typeof WithDefault>`
    expect(result).toBe(expected)
  })

  it('should handle allOf with nullable and default', () => {
    const result = schemaToZod({
      title: 'NullDefault',
      type: 'object',
      properties: {
        value: {
          allOf: [{ type: 'string' }, { default: 'x' }, { type: 'null' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const NullDefault = z.object({value:z.string().nullable().default("x").exactOptional()})

export type NullDefault = z.infer<typeof NullDefault>`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToZod({
      title: 'D',
      type: 'date',
    })
    const expected = `import * as z from 'zod'

export const D = z.date()

export type D = z.infer<typeof D>`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToZod({
      title: 'N',
      type: 'null',
    })
    const expected = `import * as z from 'zod'

export const N = z.null().nullable()

export type N = z.infer<typeof N>`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToZod({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const AnyOf = z.object({value:z.union([z.string(),z.number()]).exactOptional()})

export type AnyOf = z.infer<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToZod({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import * as z from 'zod'

export const Arr = z.object({tags:z.array(z.string()).min(1).max(10)})

export type Arr = z.infer<typeof Arr>`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToZod({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import * as z from 'zod'

export const Fixed = z.object({pair:z.array(z.number()).length(3)})

export type Fixed = z.infer<typeof Fixed>`
    expect(result).toBe(expected)
  })

  it('should handle default boolean value', () => {
    const result = schemaToZod({
      title: 'Def',
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
      },
    })
    const expected = `import * as z from 'zod'

export const Def = z.object({enabled:z.boolean().default(true).exactOptional()})

export type Def = z.infer<typeof Def>`
    expect(result).toBe(expected)
  })

  it('should handle nullable string', () => {
    const result = schemaToZod({
      title: 'Null',
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
      required: ['value'],
    })
    const expected = `import * as z from 'zod'

export const Null = z.object({value:z.string().nullable()})

export type Null = z.infer<typeof Null>`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToZod({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import * as z from 'zod'

export const Empty = z.object({})

export type Empty = z.infer<typeof Empty>`
    expect(result).toBe(expected)
  })

  describe('openapi option', () => {
    it('should use toIdentifierPascalCase for title with hyphens', () => {
      const result = schemaToZod(
        {
          title: 'user-profile',
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        { openapi: true },
      )
      const expected = `import * as z from 'zod'

export const UserProfile = z.object({name:z.string()})

export type UserProfile = z.infer<typeof UserProfile>`
      expect(result).toBe(expected)
    })

    it('should resolve $ref with OpenAPI component suffixes', () => {
      const result = schemaToZod(
        {
          title: 'Order',
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            status: { type: 'string' },
          },
          required: ['user', 'status'],
        },
        { openapi: true },
      )
      const expected = `import * as z from 'zod'

export const Order = z.object({user:z.lazy(() => UserSchema),status:z.string()})

export type Order = z.infer<typeof Order>`
      expect(result).toBe(expected)
    })

    it('should handle definitions with openapi naming', () => {
      const result = schemaToZod(
        {
          title: 'root-schema',
          type: 'object',
          properties: {
            address: { $ref: '#/$defs/street-address' },
          },
          required: ['address'],
          $defs: {
            'street-address': {
              type: 'object',
              properties: {
                city: { type: 'string' },
              },
              required: ['city'],
            },
          },
        },
        { openapi: true },
      )
      const expected = `import * as z from 'zod'

type _RootSchema = {address: _Street-address}

type _StreetAddress = {city: string}

const StreetAddress: z.ZodType<_StreetAddress> = z.object({city:z.string()})

export const RootSchema: z.ZodType<_RootSchema> = z.object({address:z.lazy(() => StreetAddress)})

export type RootSchema = z.infer<typeof RootSchema>`
      expect(result).toBe(expected)
    })

    it('should not affect output when openapi is false', () => {
      const schema = {
        title: 'user-profile',
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
        },
        required: ['name'] as const,
      }
      const withoutOpenapi = schemaToZod(schema)
      const withOpenapiOff = schemaToZod(schema, { openapi: false })
      expect(withoutOpenapi).toBe(withOpenapiOff)
    })
  })

  describe('readonly option', () => {
    it('should generate readonly object schema', () => {
      const result = schemaToZod(
        {
          title: 'User',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import * as z from 'zod'\n\nexport const User = z.object({name:z.string()}).readonly()`,
      )
    })

    it('should generate readonly array in object', () => {
      const result = schemaToZod(
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
        `import * as z from 'zod'\n\nexport const List = z.object({items:z.array(z.string()).readonly()}).readonly()`,
      )
    })

    it('should generate readonly with definitions', () => {
      const result = schemaToZod(
        {
          title: 'Root',
          type: 'object',
          definitions: {
            Item: {
              type: 'object',
              properties: { id: { type: 'integer' } },
              required: ['id'],
            },
          },
          properties: {
            items: { type: 'array', items: { $ref: '#/definitions/Item' } },
          },
          required: ['items'],
        },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(
        `import * as z from 'zod'\n\ntype _Root = {items: _Item[]}\n\ntype _Item = {id: number}\n\nconst Item: z.ZodType<_Item> = z.object({id:z.int()}).readonly()\n\nexport const Root: z.ZodType<_Root> = z.object({items:z.array(z.lazy(() => Item)).readonly()}).readonly()`,
      )
    })

    it('should not affect primitive types', () => {
      const result = schemaToZod(
        { title: 'Name', type: 'string' },
        { readonly: true, exportType: false },
      )
      expect(result).toBe(`import * as z from 'zod'\n\nexport const Name = z.string()`)
    })
  })

  describe('self-reference and circular schemas', () => {
    it('should handle direct self-reference ($ref: "#")', () => {
      const result = schemaToZod({
        title: 'Tree',
        type: 'object',
        properties: {
          children: { type: 'array', items: { $ref: '#' } },
        },
      })
      const expected = `import * as z from 'zod'

type _Tree = {children?: z.infer<typeof Tree>[]}

export const Tree: z.ZodType<_Tree> = z.object({children:z.array(z.lazy(() => Tree)).exactOptional()})

export type Tree = z.infer<typeof Tree>`
      expect(result).toBe(expected)
    })

    it('should handle circular A→B→A reference', () => {
      const result = schemaToZod(
        {
          title: 'A',
          type: 'object',
          definitions: {
            A: {
              type: 'object',
              properties: { b: { $ref: '#/definitions/B' } },
            },
            B: {
              type: 'object',
              properties: { a: { $ref: '#/definitions/A' } },
            },
          },
        },
        { exportType: false },
      )
      const expected = `import * as z from 'zod'

type _A = {b?: _B}

type _B = {a?: _A}

const B: z.ZodType<_B> = z.object({a:z.lazy(() => A).exactOptional()})

export const A: z.ZodType<_A> = z.object({b:z.lazy(() => B).exactOptional()})`
      expect(result).toBe(expected)
    })

    it('should handle deep $ref chain (A→B→C)', () => {
      const result = schemaToZod(
        {
          title: 'Root',
          type: 'object',
          definitions: {
            Inner: { type: 'string' },
            Middle: {
              type: 'object',
              properties: { inner: { $ref: '#/definitions/Inner' } },
            },
          },
          properties: {
            mid: { $ref: '#/definitions/Middle' },
          },
        },
        { exportType: false },
      )
      const expected = `import * as z from 'zod'

type _Root = {mid?: _Middle}

type _Inner = string

type _Middle = {inner?: _Inner}

const Inner: z.ZodType<_Inner> = z.string()

const Middle: z.ZodType<_Middle> = z.object({inner:z.lazy(() => Inner).exactOptional()})

export const Root: z.ZodType<_Root> = z.object({mid:z.lazy(() => Middle).exactOptional()})`
      expect(result).toBe(expected)
    })

    it('should handle root name in definitions', () => {
      const result = schemaToZod(
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
      const expected = `import * as z from 'zod'

type _Node = {value: string; next?: _Node}

export const Node: z.ZodType<_Node> = z.object({value:z.string(),next:z.lazy(() => Node).exactOptional()})`
      expect(result).toBe(expected)
    })

    it('should handle $defs with nested arrays', () => {
      const result = schemaToZod(
        {
          title: 'Doc',
          type: 'object',
          $defs: {
            Tag: { type: 'string' },
          },
          properties: {
            tags: { type: 'array', items: { $ref: '#/$defs/Tag' } },
          },
          required: ['tags'],
        },
        { exportType: false },
      )
      const expected = `import * as z from 'zod'

type _Doc = {tags: _Tag[]}

type _Tag = string

const Tag: z.ZodType<_Tag> = z.string()

export const Doc: z.ZodType<_Doc> = z.object({tags:z.array(z.lazy(() => Tag))})`
      expect(result).toBe(expected)
    })
  })

  describe('complex schemas', () => {
    it('should handle nullable + default + enum', () => {
      const result = schemaToZod(
        {
          title: 'Status',
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['admin', 'user'], default: 'user' },
            active: { type: 'boolean', nullable: true, default: true },
          },
          required: ['role'],
        },
        { exportType: false },
      )
      const expected = `import * as z from 'zod'

export const Status = z.object({role:z.enum(["admin","user"]).default("user"),active:z.boolean().nullable().default(true).exactOptional()})`
      expect(result).toBe(expected)
    })

    it('should handle allOf with nullable and default', () => {
      const result = schemaToZod(
        {
          title: 'Config',
          type: 'object',
          properties: {
            value: {
              allOf: [{ type: 'string' }, { default: 'hello' }, { type: 'null' }],
            },
          },
          required: ['value'],
        },
        { exportType: false },
      )
      const expected = `import * as z from 'zod'

export const Config = z.object({value:z.string().nullable().default("hello")})`
      expect(result).toBe(expected)
    })

    it('should handle empty schema', () => {
      const result = schemaToZod({}, { exportType: false })
      expect(result).toBe(`import * as z from 'zod'\n\nexport const Schema = z.any()`)
    })

    it('should handle openapi option with title', () => {
      const result = schemaToZod(
        {
          title: 'user-profile',
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        { openapi: true, exportType: false },
      )
      expect(result).toBe(
        `import * as z from 'zod'\n\nexport const UserProfile = z.object({name:z.string()})`,
      )
    })
  })

  describe('x-brand', () => {
    it('should generate branded properties in object', () => {
      const result = schemaToZod({
        title: 'User',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', 'x-brand': 'UserId' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      })
      const expected = `import * as z from 'zod'

export const User = z.object({id:z.uuid().brand<"UserId">(),name:z.string()})

export type User = z.infer<typeof User>`
      expect(result).toBe(expected)
    })

    it('should generate branded number with constraints', () => {
      const result = schemaToZod({
        title: 'Product',
        type: 'object',
        properties: {
          price: { type: 'number', minimum: 0, 'x-brand': 'Price' },
          quantity: { type: 'integer', minimum: 0, 'x-brand': 'Quantity' },
        },
        required: ['price', 'quantity'],
      })
      const expected = `import * as z from 'zod'

export const Product = z.object({price:z.number().min(0).brand<"Price">(),quantity:z.int().min(0).brand<"Quantity">()})

export type Product = z.infer<typeof Product>`
      expect(result).toBe(expected)
    })

    it('should generate branded array', () => {
      const result = schemaToZod({
        title: 'TagList',
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10,
        'x-brand': 'Tags',
      })
      const expected = `import * as z from 'zod'

export const TagList = z.array(z.string()).min(1).max(10).brand<"Tags">()

export type TagList = z.infer<typeof TagList>`
      expect(result).toBe(expected)
    })

    it('should generate branded string with email format', () => {
      const result = schemaToZod({
        title: 'Email',
        type: 'string',
        format: 'email',
        'x-brand': 'Email',
      })
      const expected = `import * as z from 'zod'

export const Email = z.email().brand<"Email">()

export type Email = z.infer<typeof Email>`
      expect(result).toBe(expected)
    })

    it('should generate branded nullable string', () => {
      const result = schemaToZod({
        title: 'NullableId',
        type: 'object',
        properties: {
          id: { type: 'string', nullable: true, 'x-brand': 'NullableId' },
        },
        required: ['id'],
      })
      const expected = `import * as z from 'zod'

export const NullableId = z.object({id:z.string().nullable().brand<"NullableId">()})

export type NullableId = z.infer<typeof NullableId>`
      expect(result).toBe(expected)
    })

    it('should generate branded string with default', () => {
      const result = schemaToZod({
        title: 'Config',
        type: 'object',
        properties: {
          role: { type: 'string', default: 'user', 'x-brand': 'Role' },
        },
        required: ['role'],
      })
      const expected = `import * as z from 'zod'

export const Config = z.object({role:z.string().default("user").brand<"Role">()})

export type Config = z.infer<typeof Config>`
      expect(result).toBe(expected)
    })

    it('should generate branded string with minLength/maxLength', () => {
      const result = schemaToZod({
        title: 'Username',
        type: 'string',
        minLength: 3,
        maxLength: 20,
        'x-brand': 'Username',
      })
      const expected = `import * as z from 'zod'

export const Username = z.string().min(3).max(20).brand<"Username">()

export type Username = z.infer<typeof Username>`
      expect(result).toBe(expected)
    })

    it('should generate branded boolean', () => {
      const result = schemaToZod({
        title: 'Flag',
        type: 'boolean',
        'x-brand': 'Flag',
      })
      const expected = `import * as z from 'zod'

export const Flag = z.boolean().brand<"Flag">()

export type Flag = z.infer<typeof Flag>`
      expect(result).toBe(expected)
    })

    it('should not add brand when x-brand is absent', () => {
      const result = schemaToZod({
        title: 'Plain',
        type: 'string',
      })
      const expected = `import * as z from 'zod'

export const Plain = z.string()

export type Plain = z.infer<typeof Plain>`
      expect(result).toBe(expected)
    })
  })
})
