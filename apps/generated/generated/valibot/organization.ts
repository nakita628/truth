import * as v from 'valibot'

type _Organization = {
  id: string
  name: string
  members?: _Member[]
  parent?: v.InferOutput<typeof Organization>
}

type _Member = {
  userId: string
  role: 'admin' | 'member' | 'guest'
  joinedAt: string
  invitedBy?: _Member
}

const Member: v.GenericSchema<unknown, _Member> = v.pipe(
  v.strictObject({
    userId: v.pipe(
      v.pipe(
        v.string(),
        v.regex(
          /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
        ),
      ),
      v.description('The unique identifier of the user.'),
    ),
    role: v.pipe(
      v.picklist(['admin', 'member', 'guest']),
      v.description('The role of the user in the organization.'),
    ),
    joinedAt: v.pipe(
      v.pipe(
        v.string(),
        v.regex(
          /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
        ),
      ),
      v.description('The timestamp when the user joined the organization.'),
    ),
    invitedBy: v.optional(
      v.pipe(
        v.lazy(() => Member),
        v.description('The member who invited this user (recursive reference).'),
      ),
    ),
  }),
  v.description('A person who is a member of the organization.'),
)

export const Organization: v.GenericSchema<unknown, _Organization> = v.pipe(
  v.strictObject({
    id: v.pipe(
      v.pipe(
        v.string(),
        v.regex(
          /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
        ),
      ),
      v.description('The UUID of the organization.'),
    ),
    name: v.pipe(
      v.pipe(v.string(), v.minCodePoints(1)),
      v.description('The name of the organization.'),
    ),
    members: v.optional(
      v.pipe(
        v.array(v.lazy(() => Member)),
        v.description('A list of members belonging to the organization.'),
      ),
    ),
    parent: v.optional(
      v.pipe(
        v.lazy(() => Organization),
        v.description('An optional reference to a parent organization (recursive).'),
      ),
    ),
  }),
  v.description('A recursive schema representing an organization and its members.'),
)
