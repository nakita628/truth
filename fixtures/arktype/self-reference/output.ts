import { type } from 'arktype'

export const Schema = type({ 'children?': 'Schema[]' })

export type Schema = typeof Schema.infer
