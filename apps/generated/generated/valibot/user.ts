import * as v from 'valibot'

export const User = v.strictObject({
  id: v.pipe(
    v.pipe(
      v.string(),
      v.regex(
        /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
      ),
    ),
    v.description('Unique identifier for the user'),
  ),
  name: v.pipe(v.pipe(v.string(), v.minCodePoints(1)), v.description('Name of the user')),
  age: v.optional(
    v.pipe(v.pipe(v.number(), v.integer(), v.minValue(0)), v.description('Age of the user')),
  ),
  email: v.pipe(v.pipe(v.string(), v.email()), v.description('Email address')),
  isActive: v.pipe(v.optional(v.boolean(), true), v.description('Whether the user is active')),
})
