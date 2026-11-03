import { Type, type Static } from 'typebox'

export const StringOrNumber = Type.Union([Type.String(), Type.Number()], {
  errorMessage: 'Must be string or number',
})

export type StringOrNumber = Static<typeof StringOrNumber>
