import { Schema } from 'effect'

export const Metadata = Schema.String.check(Schema.isPattern(/^[\x00-\uFFFF]*$/))

export type Metadata = typeof Metadata.Type
