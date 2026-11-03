import { Type, type Static } from 'typebox'

export const Organization = Type.Cyclic(
  {
    Member: Type.Object(
      {
        userId: Type.String({ format: 'uuid', description: 'The unique identifier of the user.' }),
        role: Type.Union([Type.Literal('admin'), Type.Literal('member'), Type.Literal('guest')], {
          description: 'The role of the user in the organization.',
        }),
        joinedAt: Type.String({
          format: 'date-time',
          description: 'The timestamp when the user joined the organization.',
        }),
        invitedBy: Type.Optional(
          Type.Ref('Member', {
            description: 'The member who invited this user (recursive reference).',
          }),
        ),
      },
      { additionalProperties: false, description: 'A person who is a member of the organization.' },
    ),
    Organization: Type.Object(
      {
        id: Type.String({ format: 'uuid', description: 'The UUID of the organization.' }),
        name: Type.String({ minLength: 1, description: 'The name of the organization.' }),
        members: Type.Optional(
          Type.Array(Type.Ref('Member'), {
            description: 'A list of members belonging to the organization.',
          }),
        ),
        parent: Type.Optional(
          Type.Ref('Organization', {
            description: 'An optional reference to a parent organization (recursive).',
          }),
        ),
      },
      {
        additionalProperties: false,
        description: 'A recursive schema representing an organization and its members.',
      },
    ),
  },
  'Organization',
)
