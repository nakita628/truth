import { type } from 'arktype'

export const Schema = type({
  'none?': type({ 'a?': 'string' }).narrow((data) => Object.keys(data).length === 0),
  'mixed?': type({ 'a?': 'string' }).narrow((data) =>
    Object.keys(data).every((key) => ['a'].includes(key)),
  ),
  'record?': type({ '[string]': 'string' }).narrow((data) => Object.keys(data).length === 0),
  'bare?': type({}).narrow((data) => Object.keys(data).length === 0),
  'pattern?': type({}).narrow((data) => Object.keys(data).every((key) => /^a/.test(key))),
  'open?': type({}).narrow((data) => Object.keys(data).every((key) => /^a/.test(key))),
  'both?': type({}).narrow(
    (data) =>
      Object.keys(data).every((key) => /^[a-z]+$/.test(key)) &&
      Object.keys(data).every((key) => ['a', 'B'].includes(key)),
  ),
  'closed?': type({}).narrow((data) => Object.keys(data).length === 0),
  'single?': type({}).narrow((data) => Object.keys(data).every((key) => ['a'].includes(key))),
  'letters?': type({}).narrow((data) => Object.keys(data).every((key) => /^\p{L}+$/u.test(key))),
})

export type Schema = typeof Schema.infer
