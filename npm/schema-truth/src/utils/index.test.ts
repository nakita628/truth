import { describe, expect, it } from 'vite-plus/test'

import {
  coerceDefault,
  effectError,
  normalizeTypes,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
  valibotError,
  zodError,
} from './index.js'

describe('helper', () => {
  describe('toPascalCase', () => {
    it('should return the pascal case of the given string', () => {
      expect(toPascalCase('foo')).toBe('Foo')
    })
  })

  describe('normalizeTypes', () => {
    it('should return empty array if type is undefined', () => {
      expect(normalizeTypes(undefined)).toStrictEqual([])
    })

    it('should wrap string type in array', () => {
      expect(normalizeTypes('string')).toStrictEqual(['string'])
    })

    it('should return the array as is if already array', () => {
      expect(normalizeTypes(['string', 'null'])).toStrictEqual(['string', 'null'])
    })

    it('should wrap number type in array', () => {
      expect(normalizeTypes('number')).toStrictEqual(['number'])
    })

    it('should handle "null" as string', () => {
      expect(normalizeTypes('null')).toStrictEqual(['null'])
    })

    it('should handle mixed type array', () => {
      expect(normalizeTypes(['integer', 'null'])).toStrictEqual(['integer', 'null'])
    })
  })

  describe('zodError', () => {
    it('should wrap string message in Zod v4 error format', () => {
      expect(zodError('Name is required')).toBe('{error:"Name is required"}')
    })

    it('should handle message with special characters', () => {
      expect(zodError('Must be 3-20 characters')).toBe('{error:"Must be 3-20 characters"}')
    })

    it('should handle arrow function expression as-is', () => {
      expect(zodError('(val) => `Expected ${val}`')).toBe('{error:(val) => `Expected ${val}`}')
    })

    it('should handle arrow function with spaces', () => {
      expect(zodError('  (val) => val.toString()')).toBe('{error:  (val) => val.toString()}')
    })

    it('should escape quotes in string messages', () => {
      expect(zodError('Must be "valid"')).toBe('{error:"Must be \\"valid\\""}')
    })
  })

  describe('valibotError', () => {
    it('should wrap plain string in JSON.stringify', () => {
      expect(valibotError('Must be valid')).toBe('"Must be valid"')
    })

    it('should pass through arrow function expression', () => {
      expect(valibotError('(issue) => issue.message')).toBe('(issue) => issue.message')
    })

    it('should detect arrow function with spaces', () => {
      expect(valibotError('  (val) => val.toString()')).toBe('  (val) => val.toString()')
    })
  })

  describe('effectError', () => {
    it('should wrap a plain string in a message annotation', () => {
      expect(effectError('Required field')).toBe('{message:"Required field"}')
    })

    it('should emit a string literal, since v4 types `message` as a string', () => {
      expect(effectError('(issue) => `Error: ${issue}`')).toBe(
        '{message:"(issue) => `Error: ${issue}`"}',
      )
    })

    it('should escape quotes and newlines', () => {
      expect(effectError('say "hi"\nnow')).toBe('{message:"say \\"hi\\"\\nnow"}')
    })
  })

  describe('toIdentifierPascalCase', () => {
    it.concurrent.each<[string, string]>([
      ['user', 'User'],
      ['userProfile', 'UserProfile'],
      ['user-name', 'UserName'],
      ['hello_world', 'HelloWorld'],
      ['user.name', 'UserName'],
      ['user name', 'UserName'],
      ['123value', '_123Value'],
      ['a-b-c', 'ABC'],
      ['already-PascalCase', 'AlreadyPascalCase'],
      ['', 'Schema'],
      ['---', 'Schema'],
      ['foo--bar', 'FooBar'],
      ['user_name_test', 'UserNameTest'],
      ['a', 'A'],
      ['ABC', 'ABC'],
      ['123', '_123'],
      ['v2-api-user', 'V2ApiUser'],
      ['com.example.User', 'ComExampleUser'],
      ['foo---bar___baz', 'FooBarBaz'],
      // Non-ASCII names are encoded injectively instead of collapsing to `Schema`
      ['日本語スキーマ', 'U65e5u672cu8a9eu30b9u30adu30fcu30de'],
      ['中文', 'U4e2du6587'],
      ['Схема_Русский', 'U421u445u435u43cu430U420u443u441u441u43au438u439'],
      ['café', 'Cafue9'],
    ])('toIdentifierPascalCase(%s) → %s', (input, expected) => {
      expect(toIdentifierPascalCase(input)).toBe(expected)
    })

    it.concurrent('maps distinct non-ASCII names to distinct identifiers (no collapse)', () => {
      expect(toIdentifierPascalCase('日本語')).not.toBe(toIdentifierPascalCase('中文'))
    })
  })

  describe('resolveOpenAPIRef', () => {
    it.concurrent.each<[string, string | null]>([
      ['#/components/schemas/User', 'UserSchema'],
      ['#/components/schemas/user-profile', 'UserProfileSchema'],
      ['#/components/parameters/UserId', 'UserIdParamsSchema'],
      ['#/components/headers/X-Request-Id', 'XRequestIdHeaderSchema'],
      ['#/components/securitySchemes/Bearer', 'BearerSecurityScheme'],
      ['#/components/requestBodies/CreateUser', 'CreateUserRequestBody'],
      ['#/components/responses/NotFound', 'NotFoundResponse'],
      ['#/components/examples/UserExample', 'UserExampleExample'],
      ['#/components/links/GetUser', 'GetUserLink'],
      ['#/components/callbacks/OnEvent', 'OnEventCallback'],
      ['#/components/pathItems/UserPath', 'UserPathPathItem'],
      ['#/components/mediaTypes/JsonMedia', 'JsonMediaMediaTypeSchema'],
      ['#/definitions/Address', null],
      ['#/$defs/Address', null],
      ['#', null],
      // URL-encoded $ref
      ['#/components/schemas/My%20Schema', 'MySchemaSchema'],
      // Empty component name
      ['#/components/schemas/', 'SchemaSchema'],
      // Non-ASCII component names: a percent-encoded $ref resolves to the same
      // identifier as the decoded name, so declaration and reference stay aligned.
      ['#/components/schemas/中文', 'U4e2du6587Schema'],
      ['#/components/schemas/%E4%B8%AD%E6%96%87', 'U4e2du6587Schema'],
    ])('resolveOpenAPIRef(%s) → %s', (input, expected) => {
      expect(resolveOpenAPIRef(input)).toBe(expected)
    })
  })

  describe('coerceDefault', () => {
    it('drops a composite default on a scalar schema', () => {
      expect(coerceDefault({ type: 'string' }, [])).toStrictEqual({ keep: false, value: [] })
      expect(coerceDefault({ type: 'integer' }, {})).toStrictEqual({ keep: false, value: {} })
    })

    it('keeps a composite default when the schema allows it', () => {
      expect(coerceDefault({ type: 'array' }, [])).toStrictEqual({ keep: true, value: [] })
      expect(coerceDefault({ type: 'object' }, {})).toStrictEqual({ keep: true, value: {} })
      expect(coerceDefault({}, [])).toStrictEqual({ keep: true, value: [] })
    })

    it('drops a scalar default on a composite-only schema', () => {
      expect(coerceDefault({ type: 'array' }, 'eval')).toStrictEqual({
        keep: false,
        value: 'eval',
      })
      expect(coerceDefault({ type: 'object' }, 'x')).toStrictEqual({ keep: false, value: 'x' })
      expect(coerceDefault({ type: ['array', 'null'] }, 'eval')).toStrictEqual({
        keep: false,
        value: 'eval',
      })
    })

    it('keeps a scalar default when any scalar type is allowed or type is absent', () => {
      expect(coerceDefault({ type: ['array', 'string'] }, 'eval')).toStrictEqual({
        keep: true,
        value: 'eval',
      })
      expect(coerceDefault({}, 'eval')).toStrictEqual({ keep: true, value: 'eval' })
      expect(coerceDefault({ type: ['string', 'null'] }, null)).toStrictEqual({
        keep: true,
        value: null,
      })
    })

    it('drops a null default unless the schema is nullable', () => {
      expect(coerceDefault({ type: 'string' }, null)).toStrictEqual({ keep: false, value: null })
      expect(coerceDefault({ type: 'string', nullable: true }, null)).toStrictEqual({
        keep: true,
        value: null,
      })
    })

    it('coerces stringified booleans for boolean schemas', () => {
      expect(coerceDefault({ type: 'boolean' }, 'true')).toStrictEqual({ keep: true, value: true })
    })

    it('drops object keys the schema does not declare', () => {
      expect(
        coerceDefault(
          { type: 'object', properties: { fetch_connection_secrets: { type: 'boolean' } } },
          { fetch_user_data: false, fetch_connection_secrets: false },
        ),
      ).toStrictEqual({ keep: true, value: { fetch_connection_secrets: false } })
    })

    it('reads text that spells a value of the type as that value (#394)', () => {
      expect(coerceDefault({ type: 'number' }, '7')).toStrictEqual({ keep: true, value: 7 })
      expect(coerceDefault({ type: 'integer' }, '1.5')).toStrictEqual({
        keep: false,
        value: '1.5',
      })
      expect(coerceDefault({ type: 'string' }, 1)).toStrictEqual({ keep: true, value: '1' })
    })

    it('drops a scalar default that is not a value of the type (#403)', () => {
      expect(coerceDefault({ type: 'integer', nullable: true }, 'null')).toStrictEqual({
        keep: false,
        value: 'null',
      })
    })

    it('keeps only what an enum or const lists', () => {
      expect(coerceDefault({ type: 'string', enum: ['a', 'b'] }, "'a'")).toStrictEqual({
        keep: false,
        value: "'a'",
      })
      expect(coerceDefault({ enum: ['a', 'b'] }, 'b')).toStrictEqual({ keep: true, value: 'b' })
      expect(coerceDefault({ const: 1 }, 2)).toStrictEqual({ keep: false, value: 2 })
    })

    it('reads a $ref or an allOf member as the definition it names (#394)', () => {
      const definitions = {
        Precision: { type: 'number' },
        Mode: { type: 'string', enum: ['coerce', 'strict'] },
      }
      expect(
        coerceDefault({ allOf: [{ $ref: '#/$defs/Precision' }] }, '7', definitions),
      ).toStrictEqual({ keep: true, value: 7 })
      expect(
        coerceDefault({ allOf: [{ $ref: '#/$defs/Mode' }] }, "'strict'", definitions),
      ).toStrictEqual({ keep: false, value: "'strict'" })
      expect(coerceDefault({ $ref: '#/$defs/Mode' }, 'strict', definitions)).toStrictEqual({
        keep: true,
        value: 'strict',
      })
      expect(coerceDefault({ $ref: '#/$defs/Unknown' }, 'x', definitions)).toStrictEqual({
        keep: true,
        value: 'x',
      })
    })

    it('keeps a default a union member takes, whatever type sits beside it (#396)', () => {
      expect(
        coerceDefault(
          { type: 'string', oneOf: [{ type: 'string', enum: ['cover'] }, { type: 'boolean' }] },
          false,
        ),
      ).toStrictEqual({ keep: true, value: false })
    })

    it('checks array items and required object keys', () => {
      expect(
        coerceDefault({ type: 'array', items: { type: 'boolean' } }, ['true', false]),
      ).toStrictEqual({ keep: true, value: [true, false] })
      expect(coerceDefault({ type: 'array', items: { type: 'boolean' } }, ['x'])).toStrictEqual({
        keep: false,
        value: ['x'],
      })
      expect(
        coerceDefault(
          { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
          {},
        ),
      ).toStrictEqual({ keep: false, value: {} })
    })

    it('keeps undeclared keys when additional properties are allowed', () => {
      expect(
        coerceDefault(
          {
            type: 'object',
            additionalProperties: true,
            properties: { a: { type: 'boolean' } },
          },
          { a: true, extra: 1 },
        ),
      ).toStrictEqual({ keep: true, value: { a: true, extra: 1 } })
    })
  })
})
