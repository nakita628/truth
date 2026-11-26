import { type } from 'arktype'

export const KeyChecks = type({
  'counted?': type({}).narrow((data) => Object.keys(data).length >= 2),
  'loose?': type({}).narrow((data) => Object.keys(data).length <= 1),
  'dep?': type({}).narrow((data) => !Object.hasOwn(data, 'a') || Object.hasOwn(data, 'b')),
  'open?': type({}),
  'strings?': type({})
    .narrow((data) => Object.keys(data).length >= 1)
    .narrow((data) => Object.values(data).every((value) => type('string').allows(value))),
})

export type KeyChecks = typeof KeyChecks.infer
