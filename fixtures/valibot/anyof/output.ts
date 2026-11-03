import * as v from 'valibot'

export const StringOrNumber = v.union([v.string(), v.number()], 'Must be string or number')

export type StringOrNumberOutput = v.InferOutput<typeof StringOrNumber>
