import { Type, type Static } from 'typebox'

export const User = Type.Object({
  name: Type.String({
    pattern: '^[a-zA-Z]+$',
    minLength: 3,
    maxLength: 20,
    errorMessage: {
      pattern: 'Only alphabetic characters',
      minLength: 'Name too short',
      maxLength: 'Name too long',
      _: 'Invalid name',
    },
  }),
  age: Type.Integer({
    minimum: 0,
    maximum: 120,
    multipleOf: 1,
    errorMessage: {
      minimum: 'Age must be positive',
      maximum: 'Age too large',
      multipleOf: 'Age must be integer',
      _: 'Invalid age',
    },
  }),
  tags: Type.Array(Type.String(), {
    minItems: 1,
    maxItems: 5,
    errorMessage: { minItems: 'Need at least one tag', maxItems: 'Too many tags' },
  }),
})

export type User = Static<typeof User>
