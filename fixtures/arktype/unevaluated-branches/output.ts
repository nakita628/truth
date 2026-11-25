import { type } from 'arktype'

export const Schema = type({ 'a?': 'number', 'kind?': 'string' })
  .narrow((data) => !('a' in data) || type({ 'b?': 'number' }).allows(data))
  .narrow((data) => Object.keys(data).every((key) => ['a', 'kind', 'x', 'y', 'b'].includes(key)))
  .narrow((data) => !type({ kind: "'x'" }).allows(data) || type({ 'x?': 'number' }).allows(data))
  .narrow((data) => type({ kind: "'x'" }).allows(data) || type({ 'y?': 'number' }).allows(data))

export type Schema = typeof Schema.infer
