import { Type, type Static } from 'typebox'

export const Schema = Type.Object({
  finish_reason: Type.Union([
    Type.Union([Type.Literal('stop'), Type.Literal('length')]),
    Type.Null(),
  ]),
  status: Type.Optional(
    Type.Union([Type.Union([Type.Literal('active'), Type.Literal('inactive')]), Type.Null()]),
  ),
})

export type Schema = Static<typeof Schema>
