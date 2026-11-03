import { Schema } from 'effect'

export const Code = Schema.Struct({
  code: Schema.String.check(
    Schema.makeFilter((input) => [...input].length === 6, {
      expected: 'a string of 6 characters',
      message: 'Code must be exactly 6 characters',
    }),
  ),
})

export type Code = typeof Code.Type
