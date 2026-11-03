import { Type, type Static } from 'typebox'

export const Config = Type.Record(Type.String(), Type.String())

export type Config = Static<typeof Config>
