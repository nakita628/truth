import { Type, type Static } from 'typebox'

export const Metadata = Type.String({ pattern: '^[\\x00-\\uFFFF]*$' })

export type Metadata = Static<typeof Metadata>
