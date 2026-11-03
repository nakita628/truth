import { Elysia, t } from 'elysia'

export const User = t.Object({
  name: t.String({
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z]+$',
    error: 'Invalid name',
  }),
  age: t.Integer({
    minimum: 0,
    maximum: 120,
    error: 'Invalid age',
  }),
})

export const app = new Elysia().post('/users', () => 'ok', {
  body: User,
})
