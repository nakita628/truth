import { type } from 'arktype'

export const Schema = type({
  'none?': type({ 'a?': 'string' }).narrow((data) => Object.keys(data).length === 0),
  'mixed?': type({ 'a?': 'string' }).narrow((data) =>
    Object.keys(data).every((key) => ['a'].includes(key)),
  ),
  'record?': type({ '[string]': 'string' }).narrow((data) => Object.keys(data).length === 0),
})

export type Schema = typeof Schema.infer
