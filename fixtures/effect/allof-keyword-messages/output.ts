import { Schema } from 'effect'

export const Messaged = Schema.Struct({
  n: Schema.optionalKey(
    Schema.Unknown.check(
      Schema.makeFilter((input) => typeof input !== 'number' || input >= 5, { message: 'low' }),
      Schema.makeFilter((input) => typeof input !== 'number' || input <= 9, { message: 'high' }),
    ),
  ),
})

export type Messaged = typeof Messaged.Type
