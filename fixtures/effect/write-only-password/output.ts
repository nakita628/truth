import { Schema } from 'effect'

export const Login = Schema.Struct({
  email: Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  password: Schema.String.check(
    Schema.makeFilter((input) => [...input].length >= 8, {
      expected: 'a string of at least 8 characters',
    }),
  ).annotate({ writeOnly: true }),
})

export type Login = typeof Login.Type
