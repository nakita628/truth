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
