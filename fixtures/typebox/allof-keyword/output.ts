import { Type, type Static } from 'typebox'

export const Bounded = Type.Integer({ minimum: 5 })

export type Bounded = Static<typeof Bounded>
