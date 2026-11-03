import { Type, type Static } from 'typebox'

export const Filters = Type.Optional(
  Type.Object(
    {
      active: Type.Optional(Type.Boolean()),
      fetch_connection_secrets: Type.Optional(Type.Boolean()),
    },
    { default: { fetch_connection_secrets: false } },
  ),
)

export type Filters = Static<typeof Filters>
