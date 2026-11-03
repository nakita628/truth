import { Schema } from 'effect'

type _Api = {
  readonly name: string
  readonly spec?: { readonly tags?: readonly _Tag[]; readonly root?: _Node }
}

type _Node = { readonly children?: readonly _Node[] }

type _Tag = { readonly label?: string }

const Node: Schema.Schema<_Node> = Schema.Struct({
  children: Schema.optionalKey(Schema.Array(Schema.suspend(() => Node))),
})

const Tag: Schema.Schema<_Tag> = Schema.Struct({ label: Schema.optionalKey(Schema.String) })

export const Api: Schema.Schema<_Api> = Schema.Struct({
  name: Schema.String,
  spec: Schema.optionalKey(
    Schema.Struct({
      tags: Schema.optionalKey(Schema.Array(Schema.suspend(() => Tag))),
      root: Schema.optionalKey(Schema.suspend(() => Node)),
    }),
  ),
})

export type Api = typeof Api.Type
