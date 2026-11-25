import { type } from 'arktype'

export const Schema = type({ 'a?': 'number', 'kind?': 'string' })
  .narrow((data) => !('a' in data) || type({ 'b?': 'number' }).allows(data))
  .narrow((data) =>
    Object.keys(data).every(
      (key) =>
        ['a', 'kind'].includes(key) ||
        (type({ kind: "'x'", 'flag?': 'true' }).allows(data) && ['flag', 'x'].includes(key)) ||
        (!type({ kind: "'x'", 'flag?': 'true' }).allows(data) && ['y'].includes(key)) ||
        ('a' in data && ['b'].includes(key)),
    ),
  )
  .narrow(
    (data) =>
      !type({ kind: "'x'", 'flag?': 'true' }).allows(data) || type({ 'x?': 'number' }).allows(data),
  )
  .narrow(
    (data) =>
      type({ kind: "'x'", 'flag?': 'true' }).allows(data) || type({ 'y?': 'number' }).allows(data),
  )

export type Schema = typeof Schema.infer
