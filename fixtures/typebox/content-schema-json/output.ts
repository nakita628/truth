import { Type, type Static } from 'typebox'

export const JsonString = Type.String()

export type JsonString = Static<typeof JsonString>
