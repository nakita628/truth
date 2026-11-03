import { type } from 'arktype'

export const MaybeString = type('string | null')

export type MaybeString = typeof MaybeString.infer
