import * as z from 'zod'

type _Schema = _Node

type _Node = { name: string; children?: _Node[] }

const Node: z.ZodType<_Node> = z.strictObject({
  name: z.string(),
  children: z.array(z.lazy(() => Node)).exactOptional(),
})

export const Schema: z.ZodType<_Schema> = z.lazy(() => Node)
