import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as NodeServices from '@effect/platform-node/NodeServices'
import { Console, Effect, Exit } from 'effect'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { schemaToAjv } from '../generator/ajv/index.js'
import { schemaToArktype } from '../generator/arktype/index.js'
import { schemaToEffect } from '../generator/effect/index.js'
import { schemaToTypebox } from '../generator/typebox/index.js'
import { schemaToValibot } from '../generator/valibot/index.js'
import { schemaToYup } from '../generator/yup/index.js'
import { schemaToZod } from '../generator/zod/index.js'
import { runCli } from './index.js'
import type { Generator } from './index.js'

/** Colour codes the CLI writes; stripped so assertions compare the words. */
// eslint-disable-next-line no-control-regex
const ANSI = /\u001B\[[0-9;]*m/g

const GENERATORS = {
  zod: { name: 'schema-truth-zod', generator: schemaToZod },
  valibot: { name: 'schema-truth-valibot', generator: schemaToValibot },
  effect: { name: 'schema-truth-effect', generator: schemaToEffect },
  typebox: { name: 'schema-truth-typebox', generator: schemaToTypebox },
  arktype: { name: 'schema-truth-arktype', generator: schemaToArktype },
  ajv: { name: 'schema-truth-ajv', generator: schemaToAjv },
  yup: { name: 'schema-truth-yup', generator: schemaToYup },
} as const

/**
 * Runs one `schema-truth-*` command the way its binary does, capturing what a user
 * would see.
 *
 * Help, the version banner, the rendered `ERROR` block and the "Generated" line all
 * go through `Console`, so the recorder catches every one of them.
 */
async function runBin(
  bin: { readonly name: string; readonly generator: Generator },
  argv: readonly string[],
) {
  const stdout: string[] = []
  const stderr: string[] = []
  const recorder: Console.Console = Object.assign(Object.create(console), {
    log: (...args: readonly unknown[]) => stdout.push(args.map(String).join(' ')),
    error: (...args: readonly unknown[]) => stderr.push(args.map(String).join(' ')),
  })
  const exit = await Effect.runPromiseExit(
    runCli({ ...bin, description: 'test', version: '0.0.0-test' }, argv).pipe(
      Effect.provideService(Console.Console, recorder),
      Effect.provide(NodeServices.layer),
    ),
  )
  return {
    ok: Exit.isSuccess(exit),
    stdout: stdout.join('\n').replaceAll(ANSI, ''),
    stderr: stderr.join('\n').replaceAll(ANSI, ''),
  }
}

let tmpDir = ''

/** Fresh temp directory, removed after the test that made it. */
function useTmpDir(prefix: string) {
  tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)))
  return tmpDir
}

afterEach(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = ''
})

/** Writes `schema` to a temp file, runs the command, and answers with what it wrote. */
async function generate(
  bin: { readonly name: string; readonly generator: Generator },
  schema: unknown,
  flags: readonly string[] = [],
) {
  const dir = useTmpDir('schema-truth-cli-')
  const input = path.join(dir, 'schema.json')
  const output = path.join(dir, 'out.ts')
  fs.writeFileSync(input, JSON.stringify(schema))
  const result = await runBin(bin, [input, '-o', output, ...flags])
  return {
    ...result,
    output,
    code: fs.existsSync(output) ? fs.readFileSync(output, 'utf-8') : undefined,
  }
}

const schema = {
  title: 'User',
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
  required: ['name'],
}

const schemaWithMessages = {
  title: 'UserForm',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, 'x-error-message': 'Name is required' },
    email: { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
    age: { type: 'integer', minimum: 0, maximum: 150, 'x-error-message': 'Invalid age' },
    role: { enum: ['admin', 'user'], 'x-error-message': 'Invalid role' },
  },
  required: ['name', 'email'],
}

const schemaWithGranularMessages = {
  title: 'Product',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      'x-minLength-message': 'Name cannot be empty',
      'x-maxLength-message': 'Name too long',
    },
    sku: {
      type: 'string',
      pattern: '^[A-Z]{3}-[0-9]{4}$',
      'x-pattern-message': 'SKU must be like ABC-1234',
    },
    price: {
      type: 'number',
      minimum: 0,
      'x-minimum-message': 'Price cannot be negative',
    },
    quantity: {
      type: 'integer',
      minimum: 0,
      multipleOf: 1,
      'x-minimum-message': 'Quantity cannot be negative',
      'x-multipleOf-message': 'Quantity must be whole number',
    },
  },
  required: ['name', 'sku', 'price'],
}

const arraySchema = {
  title: 'Config',
  type: 'object',
  properties: {
    tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
    enabled: { type: 'boolean', default: true },
    count: { type: 'integer', nullable: true },
    label: { type: 'string', default: 'untitled' },
  },
  required: ['tags'],
}

const oneOfSchema = {
  title: 'Shape',
  type: 'object',
  properties: {
    kind: { type: 'string' },
    value: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
  },
  required: ['kind', 'value'],
}

describe('schema-truth-zod', () => {
  it('should generate zod schema', async () => {
    const result = await generate(GENERATORS.zod, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as z from 'zod'

export const User = z.object({ name: z.string(), age: z.int().exactOptional() })
`)
  })
})

describe('schema-truth-zod --export-type', () => {
  it('should generate zod schema with type export', async () => {
    const result = await generate(GENERATORS.zod, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as z from 'zod'

export const User = z.object({ name: z.string(), age: z.int().exactOptional() })

export type User = z.infer<typeof User>
`)
  })
})

describe('schema-truth-valibot', () => {
  it('should generate valibot schema', async () => {
    const result = await generate(GENERATORS.valibot, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as v from 'valibot'

export const User = v.object({ name: v.string(), age: v.optional(v.pipe(v.number(), v.integer())) })
`)
  })
})

describe('schema-truth-valibot --export-type', () => {
  it('should generate valibot schema with type export', async () => {
    const result = await generate(GENERATORS.valibot, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as v from 'valibot'

export const User = v.object({ name: v.string(), age: v.optional(v.pipe(v.number(), v.integer())) })

export type UserOutput = v.InferOutput<typeof User>
`)
  })
})

describe('schema-truth-effect', () => {
  it('should generate effect schema', async () => {
    const result = await generate(GENERATORS.effect, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  age: Schema.optionalKey(Schema.Number.check(Schema.isInt())),
})
`)
  })
})

describe('schema-truth-effect --export-type', () => {
  it('should generate effect schema with type export', async () => {
    const result = await generate(GENERATORS.effect, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  age: Schema.optionalKey(Schema.Number.check(Schema.isInt())),
})

export type User = typeof User.Type
`)
  })
})

describe('schema-truth-typebox', () => {
  it('should generate typebox schema', async () => {
    const result = await generate(GENERATORS.typebox, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Type, type Static } from 'typebox'

export const User = Type.Object({ name: Type.String(), age: Type.Optional(Type.Integer()) })
`)
  })
})

describe('schema-truth-typebox --export-type', () => {
  it('should generate typebox schema with type export', async () => {
    const result = await generate(GENERATORS.typebox, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Type, type Static } from 'typebox'

export const User = Type.Object({ name: Type.String(), age: Type.Optional(Type.Integer()) })

export type User = Static<typeof User>
`)
  })
})

describe('schema-truth-arktype', () => {
  it('should generate arktype schema', async () => {
    const result = await generate(GENERATORS.arktype, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { type } from 'arktype'

export const User = type({ name: 'string', 'age?': 'number.integer' })
`)
  })
})

describe('schema-truth-arktype --export-type', () => {
  it('should generate arktype schema with type export', async () => {
    const result = await generate(GENERATORS.arktype, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { type } from 'arktype'

export const User = type({ name: 'string', 'age?': 'number.integer' })

export type User = typeof User.infer
`)
  })
})

describe('schema-truth-ajv', () => {
  it('should generate an Ajv schema object and compile wrapper', async () => {
    const result = await generate(GENERATORS.ajv, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: { name: { type: 'string' }, age: { type: 'integer' } },
  required: ['name'],
}

export const validate = ajv.compile(schema)
`)
  })
})

describe('schema-truth-yup', () => {
  it('should generate yup schema', async () => {
    const result = await generate(GENERATORS.yup, schema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as yup from 'yup'

export const User = yup.object({ name: yup.string().required(), age: yup.number().integer() })
`)
  })
})

describe('schema-truth-ajv --export-type', () => {
  it('should not throw and should omit JSONSchemaType', async () => {
    const result = await generate(GENERATORS.ajv, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import Ajv from 'ajv'

const ajv = new Ajv()

export const schema = {
  type: 'object',
  properties: { name: { type: 'string' }, age: { type: 'integer' } },
  required: ['name'],
}

export const validate = ajv.compile(schema)
`)
  })
})

describe('schema-truth-yup --export-type', () => {
  it('should generate yup schema with type export', async () => {
    const result = await generate(GENERATORS.yup, schema, ['--export-type'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as yup from 'yup'

export const User = yup.object({ name: yup.string().required(), age: yup.number().integer() })

export type User = yup.InferType<typeof User>
`)
  })
})

describe('x-error-message: schema-truth-zod', () => {
  it('should generate zod schema with x-error-message', async () => {
    const result = await generate(GENERATORS.zod, schemaWithMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as z from 'zod'

export const UserForm = z.object({
  name: z.string({ error: 'Name is required' }).min(1),
  email: z.email({ error: 'Invalid email' }),
  age: z
    .int({ error: 'Invalid age' })
    .min(0, { error: 'Invalid age' })
    .max(150, { error: 'Invalid age' })
    .exactOptional(),
  role: z.enum(['admin', 'user'], { error: 'Invalid role' }).exactOptional(),
})
`)
  })
})

describe('x-error-message: schema-truth-valibot', () => {
  it('should generate valibot schema with x-error-message', async () => {
    const result = await generate(GENERATORS.valibot, schemaWithMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as v from 'valibot'

export const UserForm = v.object({
  name: v.pipe(v.string('Name is required'), v.minCodePoints(1)),
  email: v.pipe(v.string('Invalid email'), v.email('Invalid email')),
  age: v.optional(
    v.pipe(v.number('Invalid age'), v.integer('Invalid age'), v.minValue(0), v.maxValue(150)),
  ),
  role: v.optional(v.picklist(['admin', 'user'], 'Invalid role')),
})
`)
  })
})

describe('x-error-message: schema-truth-effect', () => {
  it('should generate effect schema with x-error-message', async () => {
    const result = await generate(GENERATORS.effect, schemaWithMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Schema } from 'effect'

export const UserForm = Schema.Struct({
  name: Schema.String.check(
    Schema.makeFilter((input) => [...input].length >= 1, {
      expected: 'a string of at least 1 character',
    }),
  ).annotate({ message: 'Name is required' }),
  email: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/),
  ).annotate({ message: 'Invalid email' }),
  age: Schema.optionalKey(
    Schema.Number.check(
      Schema.isInt({ message: 'Invalid age' }),
      Schema.isGreaterThanOrEqualTo(0),
      Schema.isLessThanOrEqualTo(150),
    ),
  ),
  role: Schema.optionalKey(
    Schema.Literals(['admin', 'user']).annotate({ message: 'Invalid role' }),
  ),
})
`)
  })
})

describe('x-error-message: schema-truth-typebox', () => {
  it('should generate typebox schema with x-error-message', async () => {
    const result = await generate(GENERATORS.typebox, schemaWithMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Type, type Static } from 'typebox'

export const UserForm = Type.Object({
  name: Type.String({ minLength: 1, errorMessage: 'Name is required' }),
  email: Type.String({ format: 'email', errorMessage: 'Invalid email' }),
  age: Type.Optional(Type.Integer({ minimum: 0, maximum: 150, errorMessage: 'Invalid age' })),
  role: Type.Optional(
    Type.Union([Type.Literal('admin'), Type.Literal('user')], { errorMessage: 'Invalid role' }),
  ),
})
`)
  })
})

describe('x-error-message: schema-truth-arktype', () => {
  it('should generate arktype schema with x-error-message', async () => {
    const result = await generate(GENERATORS.arktype, schemaWithMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { type } from 'arktype'

export const UserForm = type({
  name: type('string')
    .narrow((data, ctx) => [...data].length >= 1 || ctx.mustBe('Name is required'))
    .describe('Name is required'),
  email: type('string.email').describe('Invalid email'),
  'age?': type('number.integer >= 0 & number.integer <= 150').describe('Invalid age'),
  'role?': type("'admin' | 'user'").describe('Invalid role'),
})
`)
  })
})

describe('granular messages: schema-truth-zod', () => {
  it('should generate zod schema with granular messages', async () => {
    const result = await generate(GENERATORS.zod, schemaWithGranularMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as z from 'zod'

export const Product = z.object({
  name: z.string().min(1, { error: 'Name cannot be empty' }).max(100, { error: 'Name too long' }),
  sku: z.string().regex(/^[A-Z]{3}-[0-9]{4}$/, { error: 'SKU must be like ABC-1234' }),
  price: z.number().min(0, { error: 'Price cannot be negative' }),
  quantity: z
    .int()
    .min(0, { error: 'Quantity cannot be negative' })
    .multipleOf(1, { error: 'Quantity must be whole number' })
    .exactOptional(),
})
`)
  })
})

describe('granular messages: schema-truth-valibot', () => {
  it('should generate valibot schema with granular messages', async () => {
    const result = await generate(GENERATORS.valibot, schemaWithGranularMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as v from 'valibot'

export const Product = v.object({
  name: v.pipe(
    v.string(),
    v.minCodePoints(1, 'Name cannot be empty'),
    v.maxCodePoints(100, 'Name too long'),
  ),
  sku: v.pipe(v.string(), v.regex(/^[A-Z]{3}-[0-9]{4}$/, 'SKU must be like ABC-1234')),
  price: v.pipe(v.number(), v.minValue(0, 'Price cannot be negative')),
  quantity: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(0, 'Quantity cannot be negative'),
      v.multipleOf(1, 'Quantity must be whole number'),
    ),
  ),
})
`)
  })
})

describe('granular messages: schema-truth-effect', () => {
  it('should generate effect schema with granular messages', async () => {
    const result = await generate(GENERATORS.effect, schemaWithGranularMessages)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Schema } from 'effect'

export const Product = Schema.Struct({
  name: Schema.String.check(
    Schema.makeFilter((input) => [...input].length >= 1, {
      expected: 'a string of at least 1 character',
      message: 'Name cannot be empty',
    }),
    Schema.makeFilter((input) => [...input].length <= 100, {
      expected: 'a string of at most 100 characters',
      message: 'Name too long',
    }),
  ),
  sku: Schema.String.check(
    Schema.isPattern(/^[A-Z]{3}-[0-9]{4}$/, { message: 'SKU must be like ABC-1234' }),
  ),
  price: Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0, { message: 'Price cannot be negative' }),
  ),
  quantity: Schema.optionalKey(
    Schema.Number.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(0, { message: 'Quantity cannot be negative' }),
      Schema.isMultipleOf(1, { message: 'Quantity must be whole number' }),
    ),
  ),
})
`)
  })
})

describe('array/nullable/default: schema-truth-zod', () => {
  it('should generate zod schema with array/nullable/default', async () => {
    const result = await generate(GENERATORS.zod, arraySchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as z from 'zod'

export const Config = z.object({
  tags: z.array(z.string()).min(1),
  enabled: z.boolean().default(true).exactOptional(),
  count: z.int().nullable().exactOptional(),
  label: z.string().default('untitled').exactOptional(),
})
`)
  })
})

describe('array/nullable/default: schema-truth-valibot', () => {
  it('should generate valibot schema with array/nullable/default', async () => {
    const result = await generate(GENERATORS.valibot, arraySchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as v from 'valibot'

export const Config = v.object({
  tags: v.pipe(v.array(v.string()), v.minLength(1)),
  enabled: v.optional(v.boolean(), true),
  count: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
  label: v.optional(v.string(), 'untitled'),
})
`)
  })
})

describe('array/nullable/default: schema-truth-effect', () => {
  it('should generate effect schema with array/nullable/default', async () => {
    const result = await generate(GENERATORS.effect, arraySchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Effect, Schema } from 'effect'

export const Config = Schema.Struct({
  tags: Schema.Array(Schema.String).check(Schema.isMinLength(1)),
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true))),
  count: Schema.optionalKey(Schema.NullOr(Schema.Number.check(Schema.isInt()))),
  label: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed('untitled'))),
})
`)
  })
})

describe('array/nullable/default: schema-truth-typebox', () => {
  it('should generate typebox schema with array/nullable/default', async () => {
    const result = await generate(GENERATORS.typebox, arraySchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Type, type Static } from 'typebox'

export const Config = Type.Object({
  tags: Type.Array(Type.String(), { minItems: 1 }),
  enabled: Type.Optional(Type.Boolean({ default: true })),
  count: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
  label: Type.Optional(Type.String({ default: 'untitled' })),
})
`)
  })
})

describe('array/nullable/default: schema-truth-arktype', () => {
  it('should generate arktype schema with array/nullable/default', async () => {
    const result = await generate(GENERATORS.arktype, arraySchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { type } from 'arktype'

export const Config = type({
  tags: type('string[]').and(type('unknown[] >= 1')),
  'enabled?': 'boolean',
  'count?': 'number.integer | null',
  'label?': 'string',
})
`)
  })
})

describe('oneOf: schema-truth-zod', () => {
  it('should generate zod schema with oneOf', async () => {
    const result = await generate(GENERATORS.zod, oneOfSchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as z from 'zod'

export const Shape = z.object({
  kind: z.string(),
  value: z.xor([z.string(), z.number(), z.boolean()]),
})
`)
  })
})

describe('oneOf: schema-truth-valibot', () => {
  it('should generate valibot schema with oneOf', async () => {
    const result = await generate(GENERATORS.valibot, oneOfSchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import * as v from 'valibot'

export const Shape = v.object({
  kind: v.string(),
  value: v.union([v.string(), v.number(), v.boolean()]),
})
`)
  })
})

describe('oneOf: schema-truth-effect', () => {
  it('should generate effect schema with oneOf', async () => {
    const result = await generate(GENERATORS.effect, oneOfSchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Schema } from 'effect'

export const Shape = Schema.Struct({
  kind: Schema.String,
  value: Schema.Union([Schema.String, Schema.Number, Schema.Boolean]),
})
`)
  })
})

describe('oneOf: schema-truth-typebox', () => {
  it('should generate typebox schema with oneOf', async () => {
    const result = await generate(GENERATORS.typebox, oneOfSchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { Type, type Static } from 'typebox'

export const Shape = Type.Object({
  kind: Type.String(),
  value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
})
`)
  })
})

describe('oneOf: schema-truth-arktype', () => {
  it('should generate arktype schema with oneOf', async () => {
    const result = await generate(GENERATORS.arktype, oneOfSchema)

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe(`Generated: ${result.output}`)
    expect(result.code).toBe(`import { type } from 'arktype'

export const Shape = type({ kind: 'string', value: 'string | number | boolean' })
`)
  })
})

describe('--help', () => {
  it.each(Object.values(GENERATORS))('renders the usage block for $name', async (bin) => {
    const result = await runBin(bin, ['--help'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toContain(`${bin.name} [flags] <input>`)
    expect(result.stdout).toContain('--export-type')
    expect(result.stdout).toContain('--readonly')
  })

  it('is also spelled -h', async () => {
    const result = await runBin(GENERATORS.zod, ['-h'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toContain('schema-truth-zod [flags] <input>')
  })
})

describe('--version', () => {
  it('reports the package version', async () => {
    const result = await runBin(GENERATORS.zod, ['--version'])

    expect(result.ok).toBe(true)
    expect(result.stdout).toContain('0.0.0-test')
  })
})

describe('argument validation', () => {
  it('rejects an input that is not .json or .yaml', async () => {
    const dir = useTmpDir('schema-truth-cli-ext-')
    const input = path.join(dir, 'schema.txt')
    fs.writeFileSync(input, JSON.stringify(schema))

    const result = await runBin(GENERATORS.zod, [input, '-o', path.join(dir, 'out.ts')])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('a JSON Schema document ending in .json or .yaml')
  })

  it('rejects an output that is not .ts', async () => {
    const dir = useTmpDir('schema-truth-cli-out-')
    const input = path.join(dir, 'schema.json')
    fs.writeFileSync(input, JSON.stringify(schema))

    const result = await runBin(GENERATORS.zod, [input, '-o', path.join(dir, 'out.js')])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('a TypeScript file path ending in .ts')
  })

  it('rejects a missing --output', async () => {
    const dir = useTmpDir('schema-truth-cli-no-out-')
    const input = path.join(dir, 'schema.json')
    fs.writeFileSync(input, JSON.stringify(schema))

    const result = await runBin(GENERATORS.zod, [input])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('Missing required flag: --output')
  })

  it('rejects a missing <input>', async () => {
    const dir = useTmpDir('schema-truth-cli-no-in-')

    const result = await runBin(GENERATORS.zod, ['-o', path.join(dir, 'out.ts')])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('input')
  })

  it('rejects an input file that does not exist', async () => {
    const dir = useTmpDir('schema-truth-cli-missing-')

    const result = await runBin(GENERATORS.zod, [
      path.join(dir, 'nope.json'),
      '-o',
      path.join(dir, 'out.ts'),
    ])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('Path does not exist')
  })
})

describe('failure paths', () => {
  it('reports a schema it cannot parse', async () => {
    const dir = useTmpDir('schema-truth-cli-parse-')
    const input = path.join(dir, 'schema.json')
    fs.writeFileSync(input, 'not json{{{')

    const result = await runBin(GENERATORS.zod, [input, '-o', path.join(dir, 'out.ts')])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('Failed to parse schema')
  })

  it('reports code it cannot format', async () => {
    const dir = useTmpDir('schema-truth-cli-fmt-')
    const input = path.join(dir, 'schema.json')
    fs.writeFileSync(input, JSON.stringify(schema))

    const result = await runBin({ name: 'schema-truth-zod', generator: () => 'const x = {' }, [
      input,
      '-o',
      path.join(dir, 'out.ts'),
    ])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('Expected `}` but found `EOF`')
  })

  it('reports an output directory it cannot create', async () => {
    const dir = useTmpDir('schema-truth-cli-mkdir-')
    const input = path.join(dir, 'schema.json')
    const blocker = path.join(dir, 'blocker')
    fs.writeFileSync(input, JSON.stringify(schema))
    fs.writeFileSync(blocker, '')

    const result = await runBin(GENERATORS.zod, [input, '-o', path.join(blocker, 'sub', 'out.ts')])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('ENOTDIR')
  })

  it('reports an output path it cannot write', async () => {
    const dir = useTmpDir('schema-truth-cli-write-')
    const input = path.join(dir, 'schema.json')
    const output = path.join(dir, 'out.ts')
    fs.writeFileSync(input, JSON.stringify(schema))
    fs.mkdirSync(output, { recursive: true })

    const result = await runBin(GENERATORS.zod, [input, '-o', output])

    expect(result.ok).toBe(false)
    expect(result.stderr).toContain('EISDIR')
  })
})

describe('syntax validation', () => {
  const schemas = [
    { name: 'basic', schema },
    { name: 'messages', schema: schemaWithMessages },
    { name: 'granular', schema: schemaWithGranularMessages },
    { name: 'array', schema: arraySchema },
    { name: 'oneOf', schema: oneOfSchema },
  ] as const

  const cases = schemas.flatMap((s) =>
    Object.entries(GENERATORS).map(([library, bin]) => ({
      shape: s.name,
      library,
      bin,
      schema: s.schema,
    })),
  )

  it.each(cases)(
    '$shape \u00D7 $library generates balanced TypeScript',
    async ({ bin, schema: input }) => {
      const result = await generate(bin, input)

      expect(result.ok).toBe(true)
      const code = result.code ?? ''
      expect(code.length).toBeGreaterThan(0)
      expect(code.startsWith('import')).toBe(true)
      expect(code.includes('export const')).toBe(true)
      expect((code.match(/[({[]/g) ?? []).length).toBe((code.match(/[)}\]]/g) ?? []).length)
    },
  )
})
