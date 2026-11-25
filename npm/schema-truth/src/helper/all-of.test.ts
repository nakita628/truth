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
