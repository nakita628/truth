import { type } from 'arktype'

export const Config = type({
  name: 'string',
  tags: 'string[]',
  'count?': 'number.integer',
}).readonly()

export type Config = typeof Config.infer
