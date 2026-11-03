import { type } from 'arktype'

export const User = type({
  name: type('string').narrow(
    (data, ctx) => [...data].length >= 1 || ctx.mustBe('at least 1 character'),
  ),
  email: 'string.email',
  'address?': type({ 'city?': 'string', 'zip?': type('string').and(/^\d{3}-\d{4}$/) }),
})

export type User = typeof User.infer
