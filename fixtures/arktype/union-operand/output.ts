import { type } from 'arktype'

export const Schema = type({
  'tags?': "('a' | 'b')[]",
  'names?': '(string | null)[]',
  'tuple?': type(['string', '...', "('a' | 'b')[]"]),
  'both?': '(string | number) & (string | number)',
  'longNullable?': type(
    "('a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p')[]",
  ).or('null'),
  'longAllOf?': type(
    type(
      "'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p'",
    ).and(
      "'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p'",
    ),
  ).or('null'),
  'longArrayOrNull?': type(
    "('a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p')[]",
  ).or('null'),
})

export type Schema = typeof Schema.infer
