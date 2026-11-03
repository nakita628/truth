import { Schema } from 'effect'

export const StringOrNumber = Schema.Union([Schema.String, Schema.Number]).annotate({
  message: 'Must be string or number',
})

export type StringOrNumber = typeof StringOrNumber.Type
