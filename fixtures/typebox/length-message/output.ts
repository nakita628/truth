import { Type, type Static } from 'typebox'

export const Code = Type.Object({
  code: Type.String({
    minLength: 6,
    maxLength: 6,
    errorMessage: {
      minLength: 'Code must be exactly 6 characters',
      maxLength: 'Code must be exactly 6 characters',
    },
  }),
})

export type Code = Static<typeof Code>
