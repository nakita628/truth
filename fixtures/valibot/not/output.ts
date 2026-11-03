import * as v from 'valibot'

export const NotString = v.custom<unknown>(
  (input) => typeof input !== 'string',
  'Must not be a string',
)

export type NotStringOutput = v.InferOutput<typeof NotString>
