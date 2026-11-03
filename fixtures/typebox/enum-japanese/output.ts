import { Type, type Static } from 'typebox'

export const Color = Type.Union([Type.Literal('赤'), Type.Literal('青'), Type.Literal('緑')])

export type Color = Static<typeof Color>
