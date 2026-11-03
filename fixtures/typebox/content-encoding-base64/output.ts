import { Type, type Static } from 'typebox'

export const Blob = Type.String()

export type Blob = Static<typeof Blob>
