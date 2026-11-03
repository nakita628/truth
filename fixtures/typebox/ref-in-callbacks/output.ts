import { Type, type Static } from 'typebox'

const Base = Type.Object({ meta: Type.String() })

const NeedsKind = Type.Object({ kind: Type.String() })

export const Doc = Type.Object(
  {
    a: Type.Optional(Type.String()),
    list: Type.Optional(Type.Array(Type.Object({}))),
    kind: Type.Optional(Type.String()),
  },
  {
    patternProperties: { '^p-': Base },
    unevaluatedProperties: Base,
    errorMessage: { properties: 'bad doc' },
  },
)

export type Doc = Static<typeof Doc>
