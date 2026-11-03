import { type } from 'arktype'

export const StringOrNumber = type('string | number').describe('Must be string or number')

export type StringOrNumber = typeof StringOrNumber.infer
