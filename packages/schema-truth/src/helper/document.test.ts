import { describe, expect, it } from 'vite-plus/test'

import {
  emitOptionsOf,
  missingDefinitionComment,
  planDocument,
  renderDefinitions,
  rootNameOf,
  schemaNamer,
} from './document.js'

describe('emitOptionsOf', () => {
  it('defaults every flag and leaves an unset paramIn out', () => {
    expect(emitOptionsOf(undefined)).toStrictEqual({
      openapi: false,
      readonly: false,
      unsafeCodeExtensions: false,
    })
    expect(emitOptionsOf({ exportType: false, openapi: true, paramIn: 'query' })).toStrictEqual({
      openapi: true,
      readonly: false,
      unsafeCodeExtensions: false,
      paramIn: 'query',
    })
  })
})

describe('schemaNamer / rootNameOf', () => {
  it('keeps hyphens for a plain title and makes an identifier for an OpenAPI component', () => {
    expect(schemaNamer(false)('user-profile')).toBe('User-profile')
    expect(schemaNamer(true)('user-profile')).toBe('UserProfile')
  })

  it('names the root after the title, or the fallback', () => {
    expect(rootNameOf({ title: 'user' }, schemaNamer(false))).toBe('User')
    expect(rootNameOf({}, schemaNamer(false))).toBe('Schema')
    expect(rootNameOf({}, schemaNamer(false), 'Schema_')).toBe('Schema_')
  })
})

describe('planDocument', () => {
  it('orders definitions after what they refer to and keeps the document as root', () => {
    const schema = {
      title: 'Zoo',
      type: 'object',
      $defs: {
        zoo: { type: 'object', properties: { animals: { $ref: '#/$defs/animal' } } },
        animal: { type: 'object' },
      },
    } as const
    const plan = planDocument(schema, 'Zoo')
    expect(plan.rootName).toBe('Zoo')
    expect(plan.hasDefinitions).toBe(true)
    expect(plan.orderedNames).toStrictEqual(['animal', 'zoo'])
    expect(plan.nonRootNames).toStrictEqual(['animal', 'zoo'])
    expect(plan.rootDefinition).toBeUndefined()
    expect(plan.root).toBe(schema)
  })

  it('lifts the definition that shares the root name out of the list', () => {
    const schema = {
      title: 'Animal',
      $defs: { Animal: { type: 'object' }, Zoo: { $ref: '#/$defs/Animal' } },
    } as const
    const plan = planDocument(schema, 'Animal')
    expect(plan.orderedNames).toStrictEqual(['Animal', 'Zoo'])
    expect(plan.nonRootNames).toStrictEqual(['Zoo'])
    expect(plan.root).toBe(schema.$defs.Animal)
  })

  it('plans a document without definitions as its root alone', () => {
    const plan = planDocument({ type: 'string' }, 'Schema')
    expect(plan.hasDefinitions).toBe(false)
    expect(plan.orderedNames).toStrictEqual([])
    expect(plan.nonRootNames).toStrictEqual([])
  })
})

describe('renderDefinitions', () => {
  it('renders every non-root definition and comments on a missing one', () => {
    const plan = planDocument(
      { $defs: { A: { type: 'string' }, B: { $ref: '#/$defs/Missing' } } },
      'Schema',
    )
    expect(
      renderDefinitions(
        { ...plan, nonRootNames: [...plan.nonRootNames, 'Missing'] },
        (name) => name.toLowerCase(),
        (definition, name) =>
          `${name}:${typeof definition.type === 'string' ? definition.type : 'ref'}`,
      ),
    ).toBe(['a:string', 'b:ref', missingDefinitionComment('Missing')].join('\n\n'))
  })

  it('writes the missing-definition comment with the name', () => {
    expect(missingDefinitionComment('User')).toBe('// ⚠️ missing definition for User')
  })
})
