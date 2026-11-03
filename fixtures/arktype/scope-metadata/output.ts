import { scope, type } from 'arktype'

const types = scope({
  Member: [
    {
      userId: ['string.uuid', '@', "The user's id."],
      'invitedBy?': ['Member', '@', 'The member who invited this user.'],
    },
    '@',
    'A person who is a member of the organization.',
  ],
  Organization: [
    {
      name: type('string')
        .narrow((data, ctx) => [...data].length >= 1 || ctx.mustBe('at least 1 character'))
        .describe('The organization name.'),
      'members?': [['Member[]', '&', 'unknown[] >= 1'], '@', 'The members of the organization.'],
      'parent?': ['Organization', '@', 'An optional parent organization.'],
      'audited?': ['Member', '&', { 'note?': 'string' }],
    },
    '@',
    'An organization and its members.',
  ],
}).export()

export const Organization = types.Organization

export type Organization = typeof Organization.infer
