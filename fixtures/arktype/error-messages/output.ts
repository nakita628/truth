import { type } from 'arktype'

export const User = type({
  name: type('string')
    .narrow(
      (data, ctx) =>
        new RegExp('^[a-zA-Z]+$').test(data) || ctx.mustBe('Only alphabetic characters'),
    )
    .narrow((data, ctx) => [...data].length >= 3 || ctx.mustBe('Name too short'))
    .narrow((data, ctx) => [...data].length <= 20 || ctx.mustBe('Name too long'))
    .describe('Invalid name'),
  age: type('number.integer')
    .narrow((data, ctx) => data >= 0 || ctx.mustBe('Age must be positive'))
    .narrow((data, ctx) => data <= 120 || ctx.mustBe('Age too large'))
    .narrow((data, ctx) => data % 1 === 0 || ctx.mustBe('Age must be integer'))
    .describe('Invalid age'),
  tags: type('string[]')
    .narrow((data: unknown[], ctx) => data.length >= 1 || ctx.mustBe('Need at least one tag'))
    .narrow((data: unknown[], ctx) => data.length <= 5 || ctx.mustBe('Too many tags')),
})

export type User = typeof User.infer
