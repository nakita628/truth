import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { makeAdapter } from '../../adapter/index.js'
import type { Components, Schema } from '../../openapi/index.js'
import { makeSchemaDeclarations, makeSchemasCode, schemaImportLine } from './schemas.js'

// The generated files are type-checked and imported from the system temporary directory (the
// source tree is read-only when the suite runs under Bazel). They import zod / valibot / ...,
// which resolve from the node_modules directories above them, so the directory gets a link to
// this package's.
const packageDir = path.resolve(import.meta.dirname, '../../..')
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oas-truth-schemas-'))
fs.symlinkSync(path.join(packageDir, 'node_modules'), path.join(tmpRoot, 'node_modules'), 'dir')
const tmpDir = path.join(tmpRoot, 'tmp-schemas')

const zod = makeAdapter('zod')
const arktype = makeAdapter('arktype')
const typebox = makeAdapter('typebox')

const libs = ['zod', 'valibot', 'arktype', 'typebox', 'effect'] as const

const selfCycle = {
  Node: {
    type: 'object',
    properties: { children: { type: 'array', items: { $ref: '#/components/schemas/Node' } } },
  },
} as const

const mutualCycle = {
  A: { type: 'object', properties: { b: { $ref: '#/components/schemas/B' } } },
  B: {
    type: 'object',
    properties: {
      a: { $ref: '#/components/schemas/A' },
      tag: { $ref: '#/components/schemas/Tag' },
    },
  },
  Tag: { type: 'string' },
} as const

const colliding = {
  user: { type: 'string' },
  User: { type: 'integer' },
} as const

describe('makeSchemasCode', () => {
  it('returns an empty string when schemas is missing', () => {
    expect(makeSchemasCode({}, zod)).toBe('')
  })

  it('returns an empty string when schemas is empty', () => {
    expect(makeSchemasCode({ schemas: {} }, zod)).toBe('')
  })

  it('emits a zod schema with a z.infer alias when requested', () => {
    const components = { schemas: { Tag: { type: 'string' } } } as unknown as Components
    expect(makeSchemasCode(components, zod, { exportTypes: true })).toBe(
      "import * as z from 'zod'\n\nexport const TagSchema=z.string()\n\nexport type TagSchema=z.infer<typeof TagSchema>\n",
    )
  })

  it('names the exported type after the OpenAPI key when typeAlias is key', () => {
    const components = { schemas: { Tag: { type: 'string' } } } as unknown as Components
    expect(makeSchemasCode(components, zod, { exportTypes: true, typeAlias: 'key' })).toBe(
      "import * as z from 'zod'\n\nexport const TagSchema=z.string()\n\nexport type Tag=z.infer<typeof TagSchema>\n",
    )
  })

  it('applies wrapDeclaration around each expression', () => {
    const components = { schemas: { Tag: { type: 'string' } } } as unknown as Components
    expect(
      makeSchemasCode(components, zod, {
        wrapDeclaration: (expr, name) => `${expr}.meta({ref:${JSON.stringify(name)}})`,
      }),
    ).toBe('import * as z from \'zod\'\n\nexport const TagSchema=z.string().meta({ref:"Tag"})\n')
  })
})

describe('makeSchemaDeclarations', () => {
  it('emits dependencies first and unwraps references outside a cycle', () => {
    const schemas = {
      Pet: {
        type: 'object',
        description: 'A pet',
        required: ['name'],
        properties: { name: { type: 'string' }, tag: { $ref: '#/components/schemas/Tag' } },
      },
      Tag: { type: 'string' },
      ...selfCycle,
    } as unknown as { readonly [k: string]: Schema }
    expect(makeSchemaDeclarations(schemas, zod, { exportTypes: true })).toStrictEqual([
      {
        name: 'Tag',
        varName: 'TagSchema',
        fileName: 'tag',
        importLine: "import * as z from 'zod'",
        code: 'export const TagSchema=z.string()\n\nexport type TagSchema=z.infer<typeof TagSchema>',
      },
      {
        name: 'Pet',
        varName: 'PetSchema',
        fileName: 'pet',
        importLine: "import * as z from 'zod'",
        code: 'export const PetSchema=z.object({name:z.string(),tag:TagSchema.exactOptional()}).meta({description:"A pet"})\n\nexport type PetSchema=z.infer<typeof PetSchema>',
      },
      {
        name: 'Node',
        varName: 'NodeSchema',
        fileName: 'node',
        importLine: "import * as z from 'zod'",
        code: 'type NodeType={"children"?:(NodeType)[]}\n\nexport const NodeSchema:z.ZodType<NodeType>=z.object({children:z.array(z.lazy(() => NodeSchema)).exactOptional()})\n\nexport type NodeSchema=z.infer<typeof NodeSchema>',
      },
    ])
  })

  it.each([
    [
      'valibot',
      'export const PetSchema=v.pipe(v.object({name:v.string(),tag:v.optional(TagSchema)}),v.description("A pet"))',
      'type NodeType={"children"?:(NodeType)[]|undefined}\n\nexport const NodeSchema:v.GenericSchema<NodeType>=v.partial(v.object({children:v.array(v.lazy(() => NodeSchema))}))',
    ],
    [
      'typebox',
      'export const PetSchema=Type.Object({name:Type.String(),tag:Type.Optional(TagSchema)},{description:"A pet"})',
      "export const NodeSchema=Type.Cyclic({\nNodeSchema: Type.Object({children:Type.Optional(Type.Array(Type.Ref('NodeSchema')))})\n},'NodeSchema')",
    ],
    [
      'arktype',
      'export const PetSchema=type({name:"string","tag?":TagSchema}).describe("A pet")',
      'export const NodeSchema=scope({NodeSchema:{"children?":"NodeSchema[]"}}).export().NodeSchema',
    ],
    [
      'effect',
      'export const PetSchema=Schema.Struct({name:Schema.String,tag:Schema.optionalKey(TagSchema)}).annotate({description:"A pet"})',
      'type NodeType={"children"?:readonly (NodeType)[]}\n\nexport const NodeSchema:Schema.Codec<NodeType, unknown>=Schema.Struct({children:Schema.optionalKey(Schema.Array(Schema.suspend(() => NodeSchema)))})',
    ],
  ] as const)('%s: declares a dependency and a self-cycle', (lib, pet, node) => {
    const schemas = {
      Pet: {
        type: 'object',
        description: 'A pet',
        required: ['name'],
        properties: { name: { type: 'string' }, tag: { $ref: '#/components/schemas/Tag' } },
      },
      Tag: { type: 'string' },
      ...selfCycle,
    } as unknown as { readonly [k: string]: Schema }
    expect(
      makeSchemaDeclarations(schemas, makeAdapter(lib))
        .map((d) => d.code)
        .slice(1),
    ).toStrictEqual([pet, node])
  })

  it('carries readonly into the schemas and the recursive type', () => {
    const schemas = {
      Tag: { type: 'string' },
      Pet: {
        type: 'object',
        description: 'A pet',
        required: ['name'],
        properties: { name: { type: 'string' }, tag: { $ref: '#/components/schemas/Tag' } },
      },
      ...selfCycle,
    } as unknown as { readonly [k: string]: Schema }
    expect(
      makeSchemaDeclarations(schemas, zod, { readonly: true }).map((d) => d.code),
    ).toStrictEqual([
      'export const TagSchema=z.string()',
      'export const PetSchema=z.object({name:z.string(),tag:TagSchema.exactOptional()}).readonly().meta({description:"A pet"})',
      'type NodeType={readonly "children"?:readonly (NodeType)[]}\n\nexport const NodeSchema:z.ZodType<NodeType>=z.object({children:z.array(z.lazy(() => NodeSchema)).readonly().exactOptional()}).readonly()',
    ])
  })

  it.each([
    [
      'zod',
      [
        'export const TagSchema=z.string()',
        'type AType={"b"?:z.infer<typeof BSchema>}\n\nexport const ASchema:z.ZodType<AType>=z.object({b:z.lazy(() => BSchema).exactOptional()})',
        'type BType={"a"?:z.infer<typeof ASchema>;"tag"?:z.infer<typeof TagSchema>}\n\nexport const BSchema:z.ZodType<BType>=z.object({a:z.lazy(() => ASchema).exactOptional(),tag:TagSchema.exactOptional()})',
      ],
    ],
    [
      'valibot',
      [
        'export const TagSchema=v.string()',
        'type AType={"b"?:v.InferOutput<typeof BSchema>|undefined}\n\nexport const ASchema:v.GenericSchema<AType>=v.partial(v.object({b:v.lazy(() => BSchema)}))',
        'type BType={"a"?:v.InferOutput<typeof ASchema>|undefined;"tag"?:v.InferOutput<typeof TagSchema>|undefined}\n\nexport const BSchema:v.GenericSchema<BType>=v.partial(v.object({a:v.lazy(() => ASchema),tag:TagSchema}))',
      ],
    ],
    [
      'typebox',
      [
        'export const TagSchema=Type.String()',
        "export const ASchema=Type.Cyclic({\nBSchema: Type.Object({a:Type.Optional(Type.Ref('ASchema')),tag:Type.Optional(TagSchema)}),\nASchema: Type.Object({b:Type.Optional(Type.Ref('BSchema'))})\n},'ASchema')",
        "export const BSchema=Type.Cyclic({\nASchema: Type.Object({b:Type.Optional(Type.Ref('BSchema'))}),\nBSchema: Type.Object({a:Type.Optional(Type.Ref('ASchema')),tag:Type.Optional(TagSchema)})\n},'BSchema')",
      ],
    ],
    [
      'arktype',
      [
        'export const TagSchema=type("string")',
        'export const ASchema=scope({TagSchema:TagSchema,BSchema:{"a?":"ASchema","tag?":"TagSchema"},ASchema:{"b?":"BSchema"}}).export().ASchema',
        'export const BSchema=scope({TagSchema:TagSchema,BSchema:{"a?":"ASchema","tag?":"TagSchema"},ASchema:{"b?":"BSchema"}}).export().BSchema',
      ],
    ],
    [
      'effect',
      [
        'export const TagSchema=Schema.String',
        'type AType={"b"?:Schema.Schema.Type<typeof BSchema>}\n\nexport const ASchema:Schema.Codec<AType, unknown>=Schema.Struct({b:Schema.optionalKey(Schema.suspend(() => BSchema))})',
        'type BType={"a"?:Schema.Schema.Type<typeof ASchema>;"tag"?:Schema.Schema.Type<typeof TagSchema>}\n\nexport const BSchema:Schema.Codec<BType, unknown>=Schema.Struct({a:Schema.optionalKey(Schema.suspend(() => ASchema)),tag:Schema.optionalKey(TagSchema)})',
      ],
    ],
  ] as const)('%s: a mutual cycle shares one container per member', (lib, expected) => {
    expect(
      makeSchemaDeclarations(mutualCycle as never, makeAdapter(lib)).map((d) => d.code),
    ).toStrictEqual(expected)
  })

  it("arktype: a discriminated array inside a cycle keeps the scope aliases and the members' own values", () => {
    const filters = {
      ComparisonFilter: {
        type: 'object',
        required: ['type', 'key'],
        properties: { type: { type: 'string', enum: ['eq', 'ne'] }, key: { type: 'string' } },
      },
      CompoundFilter: {
        type: 'object',
        required: ['type', 'filters'],
        properties: {
          type: { type: 'string', enum: ['and', 'or'] },
          filters: {
            type: 'array',
            items: {
              oneOf: [
                { $ref: '#/components/schemas/ComparisonFilter' },
                { $ref: '#/components/schemas/CompoundFilter' },
              ],
              discriminator: { propertyName: 'type' },
            },
          },
        },
      },
    }
    expect(
      makeSchemaDeclarations(filters as never, makeAdapter('arktype')).map((d) => d.code),
    ).toStrictEqual([
      `export const ComparisonFilterSchema=type({type:"'eq' | 'ne'",key:"string"})`,
      `export const CompoundFilterSchema=scope({ComparisonFilterSchema:ComparisonFilterSchema,CompoundFilterSchema:{type:"'and' | 'or'",filters:[[["ComparisonFilterSchema","&",{"type":"'eq' | 'ne'"}],"|",["CompoundFilterSchema","&",{"type":"'and' | 'or'"}]],"[]"]}}).export().CompoundFilterSchema`,
    ])
  })

  it('zod: an implicit discriminator member takes its own values, outside a cycle too', () => {
    const filters = {
      Eq: {
        type: 'object',
        required: ['type'],
        properties: { type: { type: 'string', enum: ['eq', 'ne'] } },
      },
      Open: { type: 'object', properties: { type: { type: 'string' } } },
      Filter: {
        oneOf: [{ $ref: '#/components/schemas/Eq' }, { $ref: '#/components/schemas/Open' }],
        discriminator: { propertyName: 'type' },
      },
    }
    const code = makeSchemaDeclarations(filters as never, makeAdapter('zod'))
      .map((d) => d.code)
      .join(';')
    expect(code).toContain('z.object({type:z.enum(["eq","ne"])})')
    expect(code).toContain('z.object({type:z.literal("Open")})')
  })

  it('arktype: readonly cycle members also take their own values', () => {
    const filters = {
      ComparisonFilter: {
        type: 'object',
        required: ['type'],
        properties: { type: { type: 'string', enum: ['eq', 'ne'] } },
      },
      CompoundFilter: {
        type: 'object',
        required: ['type', 'filters'],
        properties: {
          type: { type: 'string', enum: ['and', 'or'] },
          filters: {
            type: 'array',
            items: {
              oneOf: [
                { $ref: '#/components/schemas/ComparisonFilter' },
                { $ref: '#/components/schemas/CompoundFilter' },
              ],
              discriminator: { propertyName: 'type' },
            },
          },
        },
      },
    }
    const code = makeSchemaDeclarations(filters as never, makeAdapter('arktype'), {
      readonly: true,
    })
      .map((d) => d.code)
      .join(';')
    expect(code).toContain(`{"type":"'eq' | 'ne'"}`)
    expect(code).toContain(`{"type":"'and' | 'or'"}`)
  })

  it('zod: members that share a discriminator value keep their schema names', () => {
    const pets = {
      Cat: { type: 'object', properties: { petType: { enum: ['Cat', 'Dog'] } } },
      Dog: { type: 'object', properties: { petType: { enum: ['Cat', 'Dog'] } } },
      Pet: {
        oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        discriminator: { propertyName: 'petType' },
      },
    }
    const code = makeSchemaDeclarations(pets as never, makeAdapter('zod'))
      .map((d) => d.code)
      .join(';')
    expect(code).toContain('z.object({petType:z.literal("Cat")})')
    expect(code).toContain('z.object({petType:z.literal("Dog")})')
  })

  it('zod: a member keeps its distinct own values and a fallback name is claimed', () => {
    const pets = {
      Cat: { type: 'object', properties: { petType: { enum: ['cat', 'animal'] } } },
      Dog: { type: 'object', properties: { petType: { enum: ['dog', 'animal'] } } },
      Cmp: { type: 'object', properties: { petType: { const: 'Open' } } },
      Open: { type: 'object', properties: { petType: { type: 'string' } } },
      Pet: {
        oneOf: ['Cat', 'Dog', 'Cmp', 'Open'].map((name) => ({
          $ref: `#/components/schemas/${name}`,
        })),
        discriminator: { propertyName: 'petType' },
      },
    }
    const code = makeSchemaDeclarations(pets as never, makeAdapter('zod'))
      .map((d) => d.code)
      .join(';')
    expect(code).toContain('z.object({petType:z.literal("cat")})')
    expect(code).toContain('z.object({petType:z.literal("dog")})')
    expect(code).toContain('z.object({petType:z.literal("Cmp")})')
    expect(code).toContain('z.object({petType:z.literal("Open")})')
  })

  it('does not throw on a malformed discriminated union', () => {
    const malformed = {
      Odd: { type: 'object', allOf: {}, properties: { type: { enum: 'eq' } } },
      Union: {
        oneOf: [null, { $ref: '#/components/schemas/Odd' }],
        anyOf: {},
        discriminator: { propertyName: 'type' },
      },
    }
    expect(() => makeSchemaDeclarations(malformed as never, makeAdapter('zod'))).not.toThrow()
  })

  it('arktype: an explicit discriminator value is not replaced by a cycle member name', () => {
    const filters = {
      ComparisonFilter: {
        type: 'object',
        required: ['type'],
        properties: { type: { type: 'string' } },
      },
      CompoundFilter: {
        type: 'object',
        required: ['type', 'filters'],
        properties: {
          type: { type: 'string' },
          filters: {
            type: 'array',
            items: {
              oneOf: [
                { $ref: '#/components/schemas/ComparisonFilter' },
                { $ref: '#/components/schemas/CompoundFilter' },
              ],
              discriminator: {
                propertyName: 'type',
                mapping: { CompoundFilter: '#/components/schemas/ComparisonFilter' },
              },
            },
          },
        },
      },
    }
    // The explicit value stays with the schema it names, and the cycle member whose name
    // that value spells is left unconstrained: the scope alias never becomes a value (#74).
    expect(
      makeSchemaDeclarations(filters as never, makeAdapter('arktype')).map((d) => d.code)[1],
    ).toBe(
      `export const CompoundFilterSchema=scope({ComparisonFilterSchema:ComparisonFilterSchema,CompoundFilterSchema:{type:"string",filters:[[["ComparisonFilterSchema","&",{"type":"'CompoundFilter'"}],"|","CompoundFilterSchema"],"[]"]}}).export().CompoundFilterSchema`,
    )
    const cyclic = makeSchemaDeclarations(filters as never, makeAdapter('typebox')).map(
      (d) => d.code,
    )[1]
    expect(cyclic).toContain(
      `Type.Union([Type.Intersect([ComparisonFilterSchema,Type.Object({type:Type.Literal("CompoundFilter")})]),Type.Ref('CompoundFilterSchema')])`,
    )
    expect(cyclic).not.toContain('CompoundFilterSchema")')
    expect(
      makeSchemaDeclarations(filters as never, makeAdapter('zod')).map((d) => d.code)[1],
    ).toContain(
      'z.xor([z.intersection(ComparisonFilterSchema,z.object({type:z.literal("CompoundFilter")})),z.lazy(() => CompoundFilterSchema)])',
    )
  })

  it('arktype: a bare schema name in the mapping names a cycle member', () => {
    const nodes = {
      Leaf: { type: 'object', required: ['type'], properties: { type: { type: 'string' } } },
      Node: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string' },
          children: {
            type: 'array',
            items: {
              oneOf: [{ $ref: '#/components/schemas/Leaf' }, { $ref: '#/components/schemas/Node' }],
              discriminator: { propertyName: 'type', mapping: { Node: 'Node', leaf: 'Leaf' } },
            },
          },
        },
      },
    }
    const code = makeSchemaDeclarations(nodes as never, makeAdapter('arktype')).map(
      (d) => d.code,
    )[1]
    expect(code).toContain(`["LeafSchema","&",{"type":"'leaf'"}]`)
    expect(code).toContain(`["NodeSchema","&",{"type":"'Node'"}]`)
  })

  it.each(['arktype', 'typebox'] as const)(
    '%s: a cycle member keeps its name when the mapping key of that name resolves to no schema',
    (lib) => {
      const nodes = {
        Leaf: { type: 'object', required: ['type'], properties: { type: { type: 'string' } } },
        Node: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string' },
            children: {
              type: 'array',
              items: {
                oneOf: [
                  { $ref: '#/components/schemas/Leaf' },
                  { $ref: '#/components/schemas/Node' },
                ],
                discriminator: {
                  propertyName: 'type',
                  mapping: { Node: 'other.yaml#/components/schemas/Node', leaf: 'Leaf', x: 42 },
                },
              },
            },
          },
        },
      }
      const code = makeSchemaDeclarations(nodes as never, makeAdapter(lib)).map((d) => d.code)[1]
      expect(code).not.toContain(`"type":"'NodeSchema'"`)
      expect(code).not.toContain('Literal("NodeSchema")')
      expect(code).toContain(lib === 'arktype' ? `{"type":"'Node'"}` : 'Type.Literal("Node")')
    },
  )

  it("zod: outside a cycle, a member whose name is another schema's mapping key is unconstrained (#74)", () => {
    const pets = {
      A: { type: 'object', properties: { type: { type: 'string' } } },
      B: { type: 'object', properties: { type: { type: 'string' } } },
      Pet: {
        oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        discriminator: { propertyName: 'type', mapping: { B: '#/components/schemas/A' } },
      },
    }
    expect(makeSchemaDeclarations(pets as never, makeAdapter('zod')).map((d) => d.code)[2]).toBe(
      'export const PetSchema=z.xor([z.intersection(ASchema,z.object({type:z.literal("B")})),BSchema])',
    )
  })

  it.each(libs)('%s: colliding keys get a numeric suffix', (lib) => {
    const declarations = makeSchemaDeclarations(colliding, makeAdapter(lib))
    expect(declarations.map((d) => [d.name, d.varName, d.fileName])).toStrictEqual([
      ['user', 'UserSchema', 'user'],
      ['User', 'User2Schema', 'user2'],
    ])
  })

  it('joins colliding zod declarations with a semicolon', () => {
    expect(makeSchemasCode({ schemas: colliding }, zod)).toBe(
      "import * as z from 'zod'\n\nexport const UserSchema=z.string();export const User2Schema=z.int()\n",
    )
  })

  it('imports scope when arktype needs a cyclic container', () => {
    expect(makeSchemasCode({ schemas: selfCycle }, arktype)).toBe(
      'import { scope } from \'arktype\'\n\nexport const NodeSchema=scope({NodeSchema:{"children?":"NodeSchema[]"}}).export().NodeSchema\n',
    )
  })

  it('returns the arktype scope import on a cyclic declaration and type on the rest', () => {
    const declarations = makeSchemaDeclarations({ Tag: { type: 'string' }, ...selfCycle }, arktype)
    expect(
      declarations.map((d) => [
        d.name,
        d.importLine,
        d.code.includes('type('),
        d.code.includes('scope('),
      ]),
    ).toStrictEqual([
      ['Tag', "import { type } from 'arktype'", true, false],
      ['Node', "import { scope } from 'arktype'", false, true],
    ])
  })

  it('keeps the Zod-shaped helper when cyclicTypeStyle is literal', () => {
    expect(
      makeSchemaDeclarations(selfCycle, makeAdapter('valibot'), { cyclicTypeStyle: 'literal' })[0]
        ?.code,
    ).toBe(
      'type NodeType={"children"?:(NodeType)[]}\n\nexport const NodeSchema:v.GenericSchema<NodeType>=v.partial(v.object({children:v.array(v.lazy(() => NodeSchema))}))',
    )
  })

  it('schemaImportLine upgrades arktype and typebox from the adapter flags', () => {
    expect(schemaImportLine(arktype)).toBe("import { type } from 'arktype'")
    expect(schemaImportLine(arktype, undefined, true)).toBe("import { type, scope } from 'arktype'")
    expect(schemaImportLine(typebox, { exportTypes: true })).toBe(
      "import { Type, type Static } from 'typebox'",
    )
  })

  it('imports Static when typebox exports types', () => {
    expect(
      makeSchemasCode({ schemas: { Tag: { type: 'string' } } } as never, typebox, {
        exportTypes: true,
      }),
    ).toBe(
      "import { Type, type Static } from 'typebox'\n\nexport const TagSchema=Type.String()\n\nexport type TagSchema=Static<typeof TagSchema>\n",
    )
  })

  it('returns nothing for no schemas', () => {
    expect(makeSchemaDeclarations({}, zod)).toStrictEqual([])
  })

  it('resolves a $ref to a later collider through the identifier map', () => {
    const schemas = {
      user: { type: 'string' },
      User: { type: 'integer' },
      'user-profile': {
        type: 'object',
        properties: { owner: { $ref: '#/components/schemas/User' } },
      },
    } as unknown as { readonly [k: string]: Schema }
    const declarations = makeSchemaDeclarations(schemas, zod)
    expect(declarations.map((d) => [d.name, d.varName])).toStrictEqual([
      ['user', 'UserSchema'],
      ['User', 'User2Schema'],
      ['user-profile', 'UserProfileSchema'],
    ])
    expect(declarations[2]?.code).toBe(
      'export const UserProfileSchema=z.object({owner:User2Schema.exactOptional()})',
    )
  })

  it('reserves Compile so typeAlias key does not emit export type Compile', () => {
    const code = makeSchemaDeclarations({ Compile: { type: 'string' } }, typebox, {
      exportTypes: true,
      typeAlias: 'key',
    })[0]?.code
    expect(code).toContain('export type CompileType=Static<typeof CompileSchema>')
    expect(code).not.toContain('export type Compile=')
  })

  it('puts a TypeBox ref in the outermost builder when ref is requested', () => {
    expect(
      makeSchemaDeclarations({ Tag: { type: 'string', minLength: 1 } }, typebox, { ref: true })[0]
        ?.code,
    ).toBe('export const TagSchema=Type.String({ref:"Tag",minLength:1})')
  })

  it('applies withRef as an outer wrap when ref is requested', () => {
    expect(makeSchemaDeclarations({ Tag: { type: 'string' } }, zod, { ref: true })[0]?.code).toBe(
      'export const TagSchema=z.string().meta({ref:"Tag"})',
    )
  })
})

const tscBin = path.join(packageDir, 'node_modules/typescript/bin/tsc')

function typecheck(fileName: string, source: string, extraArgs: readonly string[] = []) {
  fs.mkdirSync(tmpDir, { recursive: true })
  const file = path.join(tmpDir, fileName)
  fs.writeFileSync(file, source)
  try {
    execFileSync(
      tscBin,
      [
        '--pretty',
        'false',
        '--ignoreConfig',
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--target',
        'es2022',
        ...extraArgs,
        file,
      ],
      { encoding: 'utf8', cwd: path.resolve(tmpDir, '..') },
    )
    return ''
  } catch (error) {
    return error instanceof Error && 'stdout' in error ? String(error.stdout) : String(error)
  }
}

const exactOptional = ['--exactOptionalPropertyTypes', '--noUncheckedIndexedAccess'] as const

const commentCycle = {
  Comment: {
    type: 'object',
    required: ['body'],
    properties: {
      body: { type: 'string' },
      replies: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
    },
  },
} as const

const helperLibs = ['zod', 'valibot', 'effect'] as const

describe('generated schemas type-check and run', () => {
  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it.each(libs)('%s: a self-cycle type-checks', { timeout: 30_000 }, (lib) => {
    const code = makeSchemasCode({ schemas: selfCycle }, makeAdapter(lib), {
      exportTypes: true,
    })
    expect(typecheck(`${lib}-self.ts`, code)).toBe('')
  })

  it.each(libs)(
    '%s: a mutual cycle that references the outside type-checks',
    { timeout: 30_000 },
    (lib) => {
      const code = makeSchemasCode({ schemas: mutualCycle }, makeAdapter(lib), {
        exportTypes: true,
      })
      expect(typecheck(`${lib}-mutual.ts`, code)).toBe('')
    },
  )

  it('zod without the cyclic annotation fails TS7022', () => {
    const code = makeSchemasCode({ schemas: selfCycle }, zod).replace(':z.ZodType<NodeType>', '')
    expect(typecheck('zod-no-annotation.ts', code)).toContain('TS7022')
  })

  it.each(helperLibs)(
    '%s: a self-cycle type-checks under exactOptionalPropertyTypes',
    { timeout: 30_000 },
    (lib) => {
      const code = makeSchemasCode({ schemas: selfCycle }, makeAdapter(lib), {
        exportTypes: true,
      })
      expect(typecheck(`${lib}-self-exact.ts`, code, exactOptional)).toBe('')
    },
  )

  it.each(helperLibs)(
    '%s: a mutual cycle type-checks under exactOptionalPropertyTypes',
    { timeout: 30_000 },
    (lib) => {
      const code = makeSchemasCode({ schemas: mutualCycle }, makeAdapter(lib), {
        exportTypes: true,
      })
      expect(typecheck(`${lib}-mutual-exact.ts`, code, exactOptional)).toBe('')
    },
  )

  it('effect: a recursive Comment is Schema.Codec<CommentType, unknown> and rejects a bad body', () => {
    const code = makeSchemasCode({ schemas: commentCycle }, makeAdapter('effect'), {
      exportTypes: true,
    })
    expect(code).toContain('Schema.Codec<CommentType, unknown>')
    expect(typecheck('effect-comment.ts', code, exactOptional)).toBe('')
    expect(
      typecheck(
        'effect-comment-bad.ts',
        `${code}\nconst _bad: CommentSchema = { body: 123 }\n`,
        exactOptional,
      ),
    ).toContain('TS2322')
  })

  // Hosts bridge a declaration to Standard Schema (hono-openapi's `resolver`, Hono's validators),
  // which takes a schema with no decoding services.
  it.each([
    ['a self-cycle', selfCycle, ['NodeSchema']],
    ['a mutual cycle', mutualCycle, ['ASchema', 'BSchema']],
  ] as const)(
    'effect: %s can be passed to Schema.toStandardSchemaV1',
    { timeout: 30_000 },
    (label, schemas, names) => {
      const code = makeSchemasCode({ schemas }, makeAdapter('effect'), { exportTypes: true })
      const bridges = names.map(
        (name) => `export const ${name}Standard = Schema.toStandardSchemaV1(Schema.Array(${name}))`,
      )
      const fileName = `effect-standard-${label.replaceAll(' ', '-')}.ts`
      expect(typecheck(fileName, [code, ...bridges].join('\n'), exactOptional)).toBe('')
    },
  )

  it('arktype accepts a tree and rejects a bad child', async () => {
    const file = path.join(tmpDir, 'arktype-run.mts')
    fs.writeFileSync(file, makeSchemasCode({ schemas: selfCycle }, arktype))
    const { NodeSchema: parseNode } = (await import(pathToFileURL(file).href)) as {
      NodeSchema: (value: unknown) => unknown
    }
    const { type } = await import('arktype')
    expect(parseNode({ children: [] }) instanceof type.errors).toBe(false)
    expect(parseNode({ children: 'nope' }) instanceof type.errors).toBe(true)
  })

  it('typebox accepts a tree and rejects a bad child', async () => {
    const source = `${makeSchemasCode({ schemas: selfCycle }, typebox)}
import { Value } from 'typebox/value'
export const ok = Value.Check(NodeSchema, { children: [] })
export const bad = Value.Check(NodeSchema, { children: 'nope' })
`
    const file = path.join(tmpDir, 'typebox-run.mts')
    fs.writeFileSync(file, source)
    const { ok, bad } = (await import(pathToFileURL(file).href)) as {
      ok: boolean
      bad: boolean
    }
    expect(ok).toBe(true)
    expect(bad).toBe(false)
  })
})

describe('declarations that carry more than the default import', () => {
  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  const notSchemas = {
    Target: {
      type: 'object',
      properties: {
        target: { anyOf: [{ type: 'string', not: { pattern: '[^A-Za-z0-9]' } }, { type: 'null' }] },
      },
    },
  } as const

  it('typebox: writes the `not` marker above one declaration', () => {
    expect(makeSchemaDeclarations(notSchemas, typebox)).toStrictEqual([
      {
        name: 'Target',
        varName: 'TargetSchema',
        fileName: 'target',
        importLine: "import { Type } from 'typebox'",
        code: '// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (the schema is generated without it)\nexport const TargetSchema=Type.Object({target:Type.Optional(Type.Union([Type.String(),Type.Null()]))})',
      },
    ])
  })

  it('typebox: a schema with `not` type-checks', { timeout: 30_000 }, () => {
    const code = makeSchemasCode({ schemas: notSchemas }, typebox, { exportTypes: true })
    expect(typecheck('typebox-not.ts', code)).toBe('')
  })

  it('typebox: an inline `not` keeps no marker in the expression', () => {
    expect(typebox.toExpression({ type: 'string', not: { const: 'x' } })).toBe('Type.String()')
  })

  const int64Schemas = {
    Pet: { type: 'object', properties: { id: { type: 'integer', format: 'int64' } } },
  } as const

  it('effect: the import line names SchemaTransformation when the code uses it', () => {
    const [pet] = makeSchemaDeclarations(int64Schemas, makeAdapter('effect'))
    expect(pet?.importLine).toBe("import { Schema, SchemaTransformation } from 'effect'")
  })

  it('effect: a declaration written with its import line type-checks', { timeout: 30_000 }, () => {
    const [pet] = makeSchemaDeclarations(int64Schemas, makeAdapter('effect'))
    expect(typecheck('effect-int64.ts', `${pet?.importLine}\n\n${pet?.code}\n`)).toBe('')
  })

  const defaultCycle = {
    Leaf: {
      type: 'object',
      properties: { op: { type: 'string', enum: ['eq', 'ne'], default: 'eq' } },
      required: ['op'],
    },
    Node: {
      type: 'object',
      properties: {
        children: {
          type: 'array',
          items: {
            anyOf: [{ $ref: '#/components/schemas/Leaf' }, { $ref: '#/components/schemas/Node' }],
          },
        },
      },
      required: ['children'],
    },
  } as const

  it('effect: each declaration imports what it names', () => {
    expect(
      makeSchemaDeclarations(defaultCycle, makeAdapter('effect')).map((d) => d.importLine),
    ).toStrictEqual(["import { Effect, Schema } from 'effect'", "import { Schema } from 'effect'"])
  })

  it(
    'effect: a recursive schema whose encoded side differs (a `default`) type-checks',
    { timeout: 30_000 },
    () => {
      const code = makeSchemasCode({ schemas: defaultCycle }, makeAdapter('effect'), {
        exportTypes: true,
      })
      expect(code.split('\n')[0]).toBe("import { Effect, Schema } from 'effect'")
      expect(code).toContain('export const NodeSchema:Schema.Codec<NodeType, unknown>=')
      expect(typecheck('effect-default-cycle.ts', code, exactOptional)).toBe('')
    },
  )

  it(
    'effect: a recursive schema whose encoded side differs is still a Standard Schema',
    { timeout: 30_000 },
    () => {
      const code = makeSchemasCode({ schemas: defaultCycle }, makeAdapter('effect'), {
        exportTypes: true,
      })
      const source = [
        code,
        'export const standard = Schema.toStandardSchemaV1(Schema.Array(NodeSchema))',
        'export const decoded = Schema.decodeUnknownSync(NodeSchema)({ children: [] })',
      ].join('\n')
      expect(typecheck('effect-default-cycle-standard.ts', source, exactOptional)).toBe('')
    },
  )
})

describe('discriminators across collision renames and cycles (#103)', () => {
  const renamed = {
    'Foo-Bar': { type: 'object', properties: { type: { type: 'string' } } },
    FooBar: { type: 'object', properties: { type: { type: 'string' } } },
  }

  it('arktype: a renamed member outside the cycle takes its schema key as the implicit value', () => {
    const schemas = {
      ...renamed,
      C: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          f: {
            type: 'array',
            items: {
              oneOf: [{ $ref: '#/components/schemas/FooBar' }, { $ref: '#/components/schemas/C' }],
              discriminator: { propertyName: 'type' },
            },
          },
        },
      },
    }
    const code = makeSchemaDeclarations(schemas as never, makeAdapter('arktype')).map(
      (d) => d.code,
    )[2]
    expect(code).toContain(`["FooBar2Schema","&",{"type":"'FooBar'"}]`)
    expect(code).not.toContain(`'FooBar2'`)
  })

  it('zod: a mapping target follows the collision rename of the schema it names', () => {
    const schemas = {
      ...renamed,
      U: {
        oneOf: [{ $ref: '#/components/schemas/FooBar' }, { $ref: '#/components/schemas/Foo-Bar' }],
        discriminator: { propertyName: 'type', mapping: { x: '#/components/schemas/FooBar' } },
      },
    }
    expect(makeSchemaDeclarations(schemas as never, makeAdapter('zod')).map((d) => d.code)[2]).toBe(
      'export const USchema=z.xor([z.intersection(FooBar2Schema,z.object({type:z.literal("x")})),z.intersection(FooBarSchema,z.object({type:z.literal("Foo-Bar")}))])',
    )
  })

  it("zod: a renamed member whose name is another schema's mapping key is unconstrained", () => {
    const schemas = {
      ...renamed,
      Other: { type: 'object', properties: { type: { type: 'string' } } },
      U: {
        oneOf: [{ $ref: '#/components/schemas/FooBar' }, { $ref: '#/components/schemas/Other' }],
        discriminator: { propertyName: 'type', mapping: { FooBar: '#/components/schemas/Other' } },
      },
    }
    const code = makeSchemaDeclarations(schemas as never, makeAdapter('zod')).map((d) => d.code)[3]
    expect(code).not.toContain('FooBar2"')
    expect(code).toContain('z.literal("FooBar")')
  })

  it('renames a mapping target once inside a cycle, beside an outside $ref', () => {
    const seen: unknown[] = []
    const capturing = {
      ...typebox,
      toExpressionParts: undefined,
      toExpression: (...args: Parameters<typeof typebox.toExpression>) => {
        seen.push(args[0])
        return typebox.toExpression(...args)
      },
    }
    const schemas = {
      'Foo-Bar': { type: 'object' },
      FooBar: { type: 'object', properties: { type: { type: 'string' } } },
      FooBar2: { type: 'object' },
      A: { type: 'object', properties: { next: { $ref: '#/components/schemas/U' } } },
      U: {
        $ref: '#/components/schemas/FooBar2',
        oneOf: [{ $ref: '#/components/schemas/FooBar' }, { $ref: '#/components/schemas/A' }],
        discriminator: { propertyName: 'type', mapping: { f: '#/components/schemas/FooBar' } },
      },
    }
    makeSchemaDeclarations(schemas as never, capturing)
    const text = JSON.stringify(seen)
    expect(text).toContain('"f":"#/components/schemas/FooBar2"')
    expect(text).not.toContain('"f":"#/components/schemas/FooBar22"')
  })

  it('arktype: a type call spelled inside a string literal does not import type', () => {
    expect(
      makeAdapter('arktype').renderImport({
        cyclic: true,
        code: `export const ESchema=scope({ESchema:"'type.created'|'type(x)'"}).export().ESchema`,
      }),
    ).toBe("import { scope } from 'arktype'")
  })

  it('localizes the discriminator of a node that has a $ref beside its oneOf, inside a cycle', () => {
    const seen: unknown[] = []
    const capturing = {
      ...typebox,
      toExpressionParts: undefined,
      toExpression: (...args: Parameters<typeof typebox.toExpression>) => {
        seen.push(args[0])
        return typebox.toExpression(...args)
      },
    }
    const schemas = {
      A: {
        type: 'object',
        properties: { type: { type: 'string' }, next: { $ref: '#/components/schemas/U' } },
      },
      U: {
        $ref: '#/components/schemas/Base',
        oneOf: [{ $ref: '#/components/schemas/A' }],
        discriminator: { propertyName: 'type' },
      },
      Base: { type: 'object' },
    }
    makeSchemaDeclarations(schemas as never, capturing)
    expect(JSON.stringify(seen)).toContain('"mapping":{"A":"#/$defs/ASchema"}')
  })
})
