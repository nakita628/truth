import { Type, type Static } from 'typebox'

export const User = Type.Object(
  {
    id: Type.String({ format: 'uuid', description: 'Unique identifier for the user' }),
    name: Type.String({ minLength: 1, description: 'Name of the user' }),
    age: Type.Optional(Type.Integer({ minimum: 0, description: 'Age of the user' })),
    email: Type.String({ format: 'email', description: 'Email address' }),
    isActive: Type.Optional(
      Type.Boolean({ description: 'Whether the user is active', default: true }),
    ),
  },
  { additionalProperties: false },
)
