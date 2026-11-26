import { type } from 'arktype'

export const Schema = type({
  typeArray: type(
    "'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10' | 'v11'",
  ).or('null'),
  nullableType: type(
    "'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10' | 'v11'",
  ).or('null'),
  anyOfNull: type.enumerated(
    'v0',
    'v1',
    'v2',
    'v3',
    'v4',
    'v5',
    'v6',
    'v7',
    'v8',
    'v9',
    'v10',
    'v11',
    null,
  ),
  anyOfStringNull: type(
    "string | 'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10'",
  ).or("'v11' | null"),
  formatUnion:
    "'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10' | string.email",
  longFormatUnion: type(
    "'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10' | 'v11'",
  ).or('string.email | number.integer'),
  tupleRest: type([
    ['string', '?'],
    '...',
    type
      .enumerated('v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', null)
      .array(),
  ]),
  nullableTupleRest: type([
    ['string', '?'],
    '...',
    type("'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8' | 'v9' | 'v10' | 'v11'")
      .or('null')
      .array(),
  ]),
})

export type Schema = typeof Schema.infer
