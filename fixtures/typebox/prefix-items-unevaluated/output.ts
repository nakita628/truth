import { Type, type Static } from 'typebox'

export const Pair = Type.Tuple([Type.String(), Type.Number()])

export type Pair = Static<typeof Pair>
