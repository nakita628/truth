import { describe, expect, it } from 'vite-plus/test'

import { resolveSchemaDependenciesFromSchema } from './resolve-schema-dependencies-from-schema.js'

describe('resolveSchemaDependenciesFromSchema', () => {
  it('should return empty array for schema without definitions', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      }),
    ).toStrictEqual([])
  })

  it('should return sorted definition names for simple schema', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        definitions: {
          B: { type: 'string' },
          A: { type: 'number' },
          C: { type: 'boolean' },
        },
      }),
    ).toStrictEqual(['A', 'B', 'C'])
  })

  it('should handle schema with $defs instead of definitions', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        $defs: {
          B: { type: 'string' },
          A: { type: 'number' },
        },
      }),
    ).toStrictEqual(['A', 'B'])
  })

  it('should resolve dependencies in correct order', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        definitions: {
          A: {
            type: 'object',
            properties: {
              ref: { $ref: '#/definitions/B' },
            },
          },
          B: {
            type: 'object',
            properties: {
              ref: { $ref: '#/definitions/C' },
            },
          },
          C: { type: 'string' },
        },
      }),
    ).toStrictEqual(['C', 'B', 'A'])
  })

  it('should handle circular dependencies gracefully', () => {
    const result = resolveSchemaDependenciesFromSchema({
      type: 'object',
      definitions: {
        A: {
          type: 'object',
          properties: {
            ref: { $ref: '#/definitions/B' },
          },
        },
        B: {
          type: 'object',
          properties: {
            ref: { $ref: '#/definitions/A' },
          },
        },
      },
    })
    expect(result).toStrictEqual(['B', 'A'])
  })

  it('should handle self-references', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
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
      }),
    ).toStrictEqual(['Node'])
  })

  it('should handle complex nested references', () => {
    const result = resolveSchemaDependenciesFromSchema({
      type: 'object',
      definitions: {
        A: {
          type: 'object',
          properties: {
            b: { $ref: '#/definitions/B' },
            c: { $ref: '#/definitions/C' },
          },
        },
        B: {
          type: 'object',
          properties: {
            d: { $ref: '#/definitions/D' },
          },
        },
        C: {
          type: 'object',
          properties: {
            d: { $ref: '#/definitions/D' },
          },
        },
        D: { type: 'string' },
      },
    })
    expect(result).toStrictEqual(['D', 'B', 'C', 'A'])
  })

  it('should ignore invalid references', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        definitions: {
          A: {
            type: 'object',
            properties: {
              ref: { $ref: '#/definitions/NonExistent' },
            },
          },
          B: { type: 'string' },
        },
      }),
    ).toStrictEqual(['A', 'B'])
  })

  it('should handle oneOf with references', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        definitions: {
          A: {
            type: 'object',
            oneOf: [{ $ref: '#/definitions/B' }, { $ref: '#/definitions/C' }],
          },
          B: { type: 'string' },
          C: { type: 'number' },
        },
      }),
    ).toStrictEqual(['B', 'C', 'A'])
  })

  it('should handle anyOf with references', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        definitions: {
          A: {
            type: 'object',
            anyOf: [{ $ref: '#/definitions/B' }, { $ref: '#/definitions/C' }],
          },
          B: { type: 'string' },
          C: { type: 'number' },
        },
      }),
    ).toStrictEqual(['B', 'C', 'A'])
  })

  it('should handle allOf with references', () => {
    expect(
      resolveSchemaDependenciesFromSchema({
        type: 'object',
        definitions: {
          A: {
            type: 'object',
            allOf: [{ $ref: '#/definitions/B' }, { $ref: '#/definitions/C' }],
          },
          B: { type: 'string' },
          C: { type: 'number' },
        },
      }),
    ).toStrictEqual(['B', 'C', 'A'])
  })
})
