import { type } from 'arktype'

export const KeyRules = type({ a: 'string', kind: 'unknown' })
  .narrow((data) =>
    Object.entries(data).every(
      ([key, value]) => !new RegExp('^x-').test(key) || type('string').allows(value),
    ),
  )
  .narrow((data) =>
    Object.entries(data).every(
      ([key, value]) =>
        ['a'].includes(key) || new RegExp('^x-').test(key) || type('number.integer').allows(value),
    ),
  )

export type KeyRules = typeof KeyRules.infer
