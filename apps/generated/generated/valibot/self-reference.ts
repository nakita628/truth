import * as v from 'valibot'

type _Schema = _Node

type _Node = { name: string; children?: _Node[] }

const Node: v.GenericSchema<unknown, _Node> = v.strictObject({
  name: v.string(),
  children: v.optional(v.array(v.lazy(() => Node))),
})

export const Schema: v.GenericSchema<unknown, _Schema> = v.lazy(() => Node)
