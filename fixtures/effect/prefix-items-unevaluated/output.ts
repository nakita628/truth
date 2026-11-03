import { Schema } from 'effect'

export const Pair = Schema.Tuple([Schema.String, Schema.Number.check(Schema.isInt())])

export type Pair = typeof Pair.Type
