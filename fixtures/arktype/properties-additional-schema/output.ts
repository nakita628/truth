import { type } from 'arktype'

export const Tagged = type({ name: 'string' })
  .narrow((data) =>
    Object.entries(data).every(
      ([key, value]) => !new RegExp('^x-').test(key) || type('string').allows(value),
    ),
  )
  .narrow((data) =>
    Object.entries(data).every(
      ([key, value]) =>
        ['name'].includes(key) ||
        new RegExp('^x-').test(key) ||
        type('number.integer').allows(value),
    ),
  )

export type Tagged = typeof Tagged.infer
