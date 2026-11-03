import { Elysia, t } from 'elysia'

export const Code = t.Object({
  code: t.String({
    minLength: 6,
    maxLength: 6,
    error: 'Code must be exactly 6 characters',
  }),
})

export const app = new Elysia().post('/users', () => 'ok', {
  body: Code,
})
