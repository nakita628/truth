import { type } from 'arktype'

export const Schema = type({
  'none?': type({ 'a?': 'string' }).narrow((data) => Object.keys(data).length === 0),
  'mixed?': type({ 'a?': 'string' }).narrow((data) =>
    Object.keys(data).every((key) => ['a'].includes(key)),
  ),
  'record?': type({ '[string]': 'string' }).narrow((data) => Object.keys(data).length === 0),
  'bare?': type({}).narrow((data) => Object.keys(data).length === 0),
  'pattern?': type({}).narrow((data) =>
    ((re) => Object.keys(data).every((key) => re.test(key)))(new RegExp('^a')),
  ),
  'open?': type({}).narrow((data) =>
    ((re) => Object.keys(data).every((key) => re.test(key)))(new RegExp('^a')),
  ),
  'both?': type({}).narrow(
    (data) =>
      ((re) => Object.keys(data).every((key) => re.test(key)))(new RegExp('^[a-z]+$')) &&
      Object.keys(data).every((key) => ['a', 'B'].includes(key)),
  ),
  'closed?': type({}).narrow((data) => Object.keys(data).length === 0),
  'single?': type({}).narrow((data) => Object.keys(data).every((key) => ['a'].includes(key))),
  'letters?': type({}).narrow((data) =>
    ((re) => Object.keys(data).every((key) => re.test(key)))(new RegExp('^\\p{L}+$', 'u')),
  ),
  'short?': type({}).narrow(
    (data) =>
      Object.keys(data).every((key) => Array.from(key).length >= 1) &&
      Object.keys(data).every((key) => Array.from(key).length <= 2),
  ),
})

export type Schema = typeof Schema.infer
