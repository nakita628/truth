import { Type, type Static } from 'typebox'

export const SelfReferencingEntities = Type.Cyclic(
  {
    Animal: Type.Object(
      {
        name: Type.String(),
        species: Type.String(),
        offspring: Type.Optional(Type.Array(Type.Ref('Animal'))),
      },
      { additionalProperties: false },
    ),
    Comment: Type.Object(
      {
        author: Type.String(),
        text: Type.String(),
        replies: Type.Optional(Type.Array(Type.Ref('Comment'))),
      },
      { additionalProperties: false },
    ),
    Folder: Type.Object(
      { name: Type.String(), children: Type.Optional(Type.Array(Type.Ref('Folder'))) },
      { additionalProperties: false },
    ),
    Person: Type.Object(
      {
        name: Type.String(),
        position: Type.String(),
        subordinates: Type.Optional(Type.Array(Type.Ref('Person'))),
      },
      { additionalProperties: false },
    ),
    SelfReferencingEntities: Type.Object(
      {
        animal: Type.Optional(Type.Ref('Animal')),
        person: Type.Optional(Type.Ref('Person')),
        folder: Type.Optional(Type.Ref('Folder')),
        comment: Type.Optional(Type.Ref('Comment')),
      },
      {
        additionalProperties: false,
        description:
          'Examples of animal, person, folder, and comment structures with self-references.',
      },
    ),
  },
  'SelfReferencingEntities',
)
