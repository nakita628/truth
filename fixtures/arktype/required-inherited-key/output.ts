import { type } from 'arktype'

export const Inherited = type({ constructor: 'unknown', toString: 'unknown' }).narrow(
  (data) => Object.hasOwn(data, 'toString') && Object.hasOwn(data, 'constructor'),
)

export type Inherited = typeof Inherited.infer
