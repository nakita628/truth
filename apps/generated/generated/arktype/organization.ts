import { scope, type } from 'arktype'

const types = scope({
  Member: [
    {
      userId: ['string.uuid', '@', 'The unique identifier of the user.'],
      role: ["'admin' | 'member' | 'guest'", '@', 'The role of the user in the organization.'],
      joinedAt: type(
        /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|([+-](?:[01]\d|2[0-3]):[0-5]\d)))$/,
      ).describe('The timestamp when the user joined the organization.'),
      'invitedBy?': ['Member', '@', 'The member who invited this user (recursive reference).'],
      '+': 'reject',
    },
    '@',
    'A person who is a member of the organization.',
  ],
  Organization: [
    {
      id: ['string.uuid', '@', 'The UUID of the organization.'],
      name: type('string')
        .narrow((data, ctx) => [...data].length >= 1 || ctx.mustBe('at least 1 character'))
        .describe('The name of the organization.'),
      'members?': ['Member[]', '@', 'A list of members belonging to the organization.'],
      'parent?': [
        'Organization',
        '@',
        'An optional reference to a parent organization (recursive).',
      ],
      '+': 'reject',
    },
    '@',
    'A recursive schema representing an organization and its members.',
  ],
}).export()

export const Organization = types.Organization
