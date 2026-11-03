import { Schema } from 'effect'

type _Organization = {
  readonly id: string
  readonly name: string
  readonly members?: readonly _Member[]
  readonly parent?: typeof Organization.Type
}

type _Member = {
  readonly userId: string
  readonly role: 'admin' | 'member' | 'guest'
  readonly joinedAt: string
  readonly invitedBy?: _Member
}

const Member: Schema.Schema<_Member> = Schema.StructWithRest(
  Schema.Struct({
    userId: Schema.String.check(Schema.isUUID()).annotate({
      description: 'The unique identifier of the user.',
    }),
    role: Schema.Literals(['admin', 'member', 'guest']).annotate({
      description: 'The role of the user in the organization.',
    }),
    joinedAt: Schema.String.check(
      Schema.isPattern(
        /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
      ),
    ).annotate({ description: 'The timestamp when the user joined the organization.' }),
    invitedBy: Schema.optional(
      Schema.suspend(() => Member).annotate({
        description: 'The member who invited this user (recursive reference).',
      }),
    ),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)
  .check(
    Schema.makeFilter((input) =>
      Object.keys(input).every((key) => ['userId', 'role', 'joinedAt', 'invitedBy'].includes(key)),
    ),
  )
  .annotate({ description: 'A person who is a member of the organization.' })

export const Organization: Schema.Schema<_Organization> = Schema.StructWithRest(
  Schema.Struct({
    id: Schema.String.check(Schema.isUUID()).annotate({
      description: 'The UUID of the organization.',
    }),
    name: Schema.String.check(
      Schema.makeFilter((input) => [...input].length >= 1, {
        expected: 'a string of at least 1 character',
      }),
    ).annotate({ description: 'The name of the organization.' }),
    members: Schema.optional(
      Schema.Array(Schema.suspend(() => Member)).annotate({
        description: 'A list of members belonging to the organization.',
      }),
    ),
    parent: Schema.optional(
      Schema.suspend(() => Organization).annotate({
        description: 'An optional reference to a parent organization (recursive).',
      }),
    ),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)
  .check(
    Schema.makeFilter((input) =>
      Object.keys(input).every((key) => ['id', 'name', 'members', 'parent'].includes(key)),
    ),
  )
  .annotate({ description: 'A recursive schema representing an organization and its members.' })
