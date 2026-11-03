import * as z from 'zod'

type _A = { id: string; type: 'B' | 'C'; payload: _B | _C }

type _E = { label?: string; reference?: _E; flags?: string[]; meta?: { [key: string]: string } }

type _D = { score: number; extra?: null | _E }

type _B = { type: 'B'; name: string; detail: _D & { comment?: string } }

type _C = { type: 'C'; entries: _E[] }

const E: z.ZodType<_E> = z.object({
  label: z.string().exactOptional(),
  reference: z.lazy(() => E).exactOptional(),
  flags: z
    .array(z.string())
    .refine((val) => new Set(val).size === val.length)
    .exactOptional(),
  meta: z.record(z.string(), z.string()).exactOptional(),
})

const D: z.ZodType<_D> = z.object({
  score: z.int().min(0).max(100).default(50),
  extra: z.union([z.null().nullable(), z.lazy(() => E)]).exactOptional(),
})

const B: z.ZodType<_B> = z.object({
  type: z.literal('B'),
  name: z.string(),
  detail: z.intersection(
    z.lazy(() => D),
    z.object({ comment: z.string().default('N/A').exactOptional() }),
  ),
})

const C: z.ZodType<_C> = z.object({
  type: z.literal('C'),
  entries: z.array(z.lazy(() => E)).min(1),
})

export const A: z.ZodType<_A> = z.object({
  id: z.uuid(),
  type: z.enum(['B', 'C']),
  payload: z.xor([z.lazy(() => B), z.lazy(() => C)]),
})
