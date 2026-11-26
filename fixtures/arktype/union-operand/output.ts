import { type } from 'arktype'

export const Schema = type({
  'tags?': type("'a' | 'b'").array(),
  'names?': type('string | null').array(),
  'tuple?': type([['string', '?'], '...', ["'a' | 'b'", '[]']]),
  'both?': type('string | number').and('string | number'),
  'longNullable?': type(
    type(
      "'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p'",
    ).array(),
  ).or('null'),
  'longAllOf?': type(
    type(
      "'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p'",
    ).and(
      "'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p'",
    ),
  ).or('null'),
  'longArrayOrNull?': type(
    type(
      "'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p'",
    ).array(),
  ).or('null'),
  'boundaryArray?': type(
    type("'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k'").array(),
  ).or('null'),
  'boundaryAllOf?': type(
    type("'a' | 'b' | 'c' | 'd' | 'e' | 'f'").and("'a' | 'b' | 'c' | 'd' | 'e'"),
  ).or('null'),
  'boundaryUnion?': type(
    type(
      type(type("'a' | 'b' | 'c' | 'd' | 'e'").array()).or(
        type("'a' | 'b' | 'c' | 'd' | 'e'").array(),
      ),
    ).or('string'),
  ).or('null'),
})

export type Schema = typeof Schema.infer
