import { Schema } from 'effect'

export const Bounded = Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(5))

export type Bounded = typeof Bounded.Type
