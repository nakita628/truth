import { Type, type Static } from 'typebox'

const Base = Type.Object({ meta: Type.Optional(Type.String()) })

export const Bucket = Type.Intersect([Base, Type.Object({ doc_count: Type.Integer() })], {
  unevaluatedProperties: Base,
})

export type Bucket = Static<typeof Bucket>
