import { type } from 'arktype'

export const Schema = type({
  'tags?': "('a' | 'b')[]",
  'names?': '(string | null)[]',
  'tuple?': type(['string', '...', "('a' | 'b')[]"]),
  'both?': '(string | number) & (string | number)',
})

export type Schema = typeof Schema.infer
