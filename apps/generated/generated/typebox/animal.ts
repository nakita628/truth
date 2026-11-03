import { Type, type Static } from 'typebox'

export const Schema = Type.Cyclic(
  {
    Animal: Type.Object(
      {
        name: Type.String({ description: 'The name of the animal' }),
        species: Type.String({ description: 'The species of the animal' }),
        offspring: Type.Optional(
          Type.Array(Type.Ref('Animal'), { description: 'List of child animals' }),
        ),
      },
      { additionalProperties: false, description: 'An animal that can have offspring' },
    ),
    Schema: Type.Ref('Animal'),
  },
  'Schema',
)
