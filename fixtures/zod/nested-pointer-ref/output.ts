import * as z from 'zod'

type _Api = { name: string; spec?: { tags?: _Tag[]; root?: _Node } }

type _Node = { children?: _Node[] }

type _Tag = { label?: string }

const Node: z.ZodType<_Node> = z.object({ children: z.array(z.lazy(() => Node)).exactOptional() })

const Tag: z.ZodType<_Tag> = z.object({ label: z.string().exactOptional() })

export const Api: z.ZodType<_Api> = z.object({
  name: z.string(),
  spec: z
    .object({
      tags: z.array(z.lazy(() => Tag)).exactOptional(),
      root: z.lazy(() => Node).exactOptional(),
    })
    .exactOptional(),
})

export type Api = z.infer<typeof Api>
