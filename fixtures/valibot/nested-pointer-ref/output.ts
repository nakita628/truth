import * as v from 'valibot'

type _Api = { name: string; spec?: { tags?: _Tag[]; root?: _Node } }

type _Node = { children?: _Node[] }

type _Tag = { label?: string }

const Node: v.GenericSchema<unknown, _Node> = v.partial(
  v.object({ children: v.array(v.lazy(() => Node)) }),
)

const Tag: v.GenericSchema<unknown, _Tag> = v.partial(v.object({ label: v.string() }))

export const Api: v.GenericSchema<unknown, _Api> = v.object({
  name: v.string(),
  spec: v.optional(
    v.partial(v.object({ tags: v.array(v.lazy(() => Tag)), root: v.lazy(() => Node) })),
  ),
})

export type ApiOutput = v.InferOutput<typeof Api>
