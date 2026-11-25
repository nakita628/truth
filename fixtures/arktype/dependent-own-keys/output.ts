import { type } from 'arktype'

export const OwnKeys = type({
  'dep?': type({ 'a?': 'string' })
    .narrow((data) => !Object.hasOwn(data, "it's") || Object.hasOwn(data, 'back\\slash'))
    .narrow(
      (data) => !Object.hasOwn(data, 'toString') || type({ x: 'number.integer' }).allows(data),
    ),
  'req?': type({ toString: 'unknown' }),
})

export type OwnKeys = typeof OwnKeys.infer
