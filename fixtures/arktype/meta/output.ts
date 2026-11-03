import { type } from 'arktype'

export const User = type({
  id: type('number.integer').describe('unique id'),
  email: type('string.email').describe('email address'),
  'role?': type('string').describe('legacy role'),
}).describe('A user account')

export type User = typeof User.infer
