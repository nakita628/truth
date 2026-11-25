import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import { foldAllOfMembers, isKeywordOnlyMember } from './all-of.js'

describe('foldAllOfMembers', () => {
  it.concurrent.each<[readonly JSONSchema[], boolean, readonly JSONSchema[]]>([
    [[{ type: 'integer' }, { minimum: 5 }], false, [{ type: 'integer', minimum: 5 }]],
    [[{ type: 'string' }, { maxLength: 10 }], false, [{ type: 'string', maxLength: 10 }]],
    [[{ minimum: 5 }], false, [{ minimum: 5 }]],
    [[{ minimum: 5 }], true, [{ type: 'number', minimum: 5 }]],
    [[{ type: 'integer', minimum: 1 }, { minimum: 5 }], false, [{ type: 'integer', minimum: 5 }]],
    [
      [{ type: 'string', maxLength: 20 }, { maxLength: 10 }],
      false,
      [{ type: 'string', maxLength: 10 }],
    ],
  ])('foldAllOfMembers(%j, %s) → %j', (members, isWire, expected) => {
    expect(foldAllOfMembers(members, isWire)).toStrictEqual(expected)
    expect(isKeywordOnlyMember({ minimum: 5 })).toBe(true)
    expect(isKeywordOnlyMember({ type: 'integer', minimum: 5 })).toBe(false)
  })
})

describe('foldAllOfMembers with both bounds in one member (#69)', () => {
  it.each<[readonly JSONSchema[], readonly JSONSchema[]]>([
    [
      [
        { type: 'number', minimum: 0 },
        { minimum: 10, exclusiveMinimum: 5 },
      ],
      [{ type: 'number', minimum: 10 }],
    ],
    [
      [
        { type: 'number', minimum: 0 },
        { minimum: 3, exclusiveMinimum: 5 },
      ],
      [{ type: 'number', exclusiveMinimum: 5 }],
    ],
    [
      [
        { type: 'number', maximum: 100 },
        { maximum: 10, exclusiveMaximum: 50 },
      ],
      [{ type: 'number', maximum: 10 }],
    ],
    [
      [
        { type: 'number', minimum: 20, exclusiveMinimum: 1 },
        { minimum: 10, exclusiveMinimum: 5 },
      ],
      [{ type: 'number', minimum: 20, exclusiveMinimum: 1 }],
    ],
    [
      [
        { type: 'number' },
        { minimum: 10, exclusiveMinimum: 5, 'x-exclusiveMinimum-message': 'too small' },
      ],
      [{ type: 'number', minimum: 10, 'x-minimum-message': 'too small' }],
    ],
  ])('keeps the stricter bound: %j → %j', (members, expected) => {
    expect(foldAllOfMembers(members, false)).toStrictEqual(expected)
  })
})

describe('foldAllOfMembers keeps a member message (#100)', () => {
  it.each<[readonly JSONSchema[], readonly JSONSchema[]]>([
    [
      [
        { type: 'integer', minimum: 5 },
        { minimum: 5, 'x-minimum-message': 'need 5' },
      ],
      [{ type: 'integer', minimum: 5, 'x-minimum-message': 'need 5' }],
    ],
    [
      [
        { type: 'integer', minimum: 5, 'x-minimum-message': 'own' },
        { minimum: 5, 'x-minimum-message': 'need 5' },
      ],
      [{ type: 'integer', minimum: 5, 'x-minimum-message': 'own' }],
    ],
    [
      [
        { type: 'number', maximum: 9 },
        { maximum: 9, 'x-maximum-message': 'at most 9' },
      ],
      [{ type: 'number', maximum: 9, 'x-maximum-message': 'at most 9' }],
    ],
    [
      [
        { type: 'number', multipleOf: 2 },
        { multipleOf: 2, 'x-multipleOf-message': 'even' },
      ],
      [{ type: 'number', multipleOf: 2, 'x-multipleOf-message': 'even' }],
    ],
    [
      [
        { type: 'string', minLength: 2 },
        { minLength: 2, 'x-minLength-message': 'short' },
      ],
      [{ type: 'string', minLength: 2, 'x-minLength-message': 'short' }],
    ],
    [
      [
        { type: 'string', pattern: '^a' },
        { pattern: '^a', 'x-pattern-message': 'a first' },
      ],
      [{ type: 'string', pattern: '^a', 'x-pattern-message': 'a first' }],
    ],
    [
      [{ type: 'integer' }, { minimum: 5, 'x-error-message': 'bad' }],
      [{ type: 'integer', minimum: 5, 'x-minimum-message': 'bad' }],
    ],
    [
      [{ type: 'string' }, { minLength: 1, maxLength: 3, 'x-error-message': 'bad' }],
      [
        {
          type: 'string',
          minLength: 1,
          'x-minLength-message': 'bad',
          maxLength: 3,
          'x-maxLength-message': 'bad',
        },
      ],
    ],
    [
      [{ minimum: 5, 'x-error-message': 'bad', 'x-minimum-message': 'own' }],
      [{ minimum: 5, 'x-minimum-message': 'own' }],
    ],
    [[{ minimum: 5, 'x-error-message': 'bad' }], [{ minimum: 5, 'x-minimum-message': 'bad' }]],
    [
      [
        { minimum: 5, 'x-error-message': 'a' },
        { maximum: 9, 'x-error-message': 'b' },
      ],
      [
        { minimum: 5, 'x-minimum-message': 'a' },
        { maximum: 9, 'x-maximum-message': 'b' },
      ],
    ],
    [
      [
        { type: 'integer', minimum: 5, 'x-error-message': 'host' },
        { minimum: 5, 'x-minimum-message': 'need 5' },
      ],
      [{ type: 'integer', minimum: 5, 'x-error-message': 'host' }],
    ],
    [
      [
        { type: 'string', minLength: 2, 'x-error-message': 'host' },
        { minLength: 2, 'x-minLength-message': 'short' },
      ],
      [{ type: 'string', minLength: 2, 'x-error-message': 'host' }],
    ],
    [
      [
        { type: 'number', minimum: 3, exclusiveMinimum: 5, 'x-minimum-message': 'min3' },
        { exclusiveMinimum: 5, 'x-exclusiveMinimum-message': 'ex' },
      ],
      [{ type: 'number', exclusiveMinimum: 5, 'x-exclusiveMinimum-message': 'ex' }],
    ],
    [
      [
        { type: 'integer', multipleOf: 2, 'x-multipleOf-message': 'same' },
        { multipleOf: 3, 'x-multipleOf-message': 'same' },
      ],
      [{ type: 'integer', multipleOf: 6, 'x-multipleOf-message': 'same' }],
    ],
    [
      [
        { type: 'integer', multipleOf: 2, 'x-multipleOf-message': 'even' },
        { multipleOf: 3, 'x-multipleOf-message': 'by 3' },
      ],
      [{ type: 'integer', multipleOf: 6 }],
    ],
  ])('foldAllOfMembers(%j) → %j', (members, expected) => {
    expect(foldAllOfMembers(members, false)).toStrictEqual(expected)
  })
})
