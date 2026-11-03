import { Type, type Static } from 'typebox'

export const Payment = Type.Object({ method: Type.String() })

export type Payment = Static<typeof Payment>
