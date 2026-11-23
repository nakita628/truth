import { Type, type Static } from 'typebox'

export const Amount = Type.BigInt({ minimum: 1, exclusiveMaximum: 100, multipleOf: 5 })

export type Amount = Static<typeof Amount>
