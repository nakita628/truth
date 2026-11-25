import * as z from 'zod'

type _Filter = _Comparison | _Compound

type _Comparison = { type: 'eq' | 'ne'; key: string }

type _Compound = { type: 'and' | 'or' }

const Comparison: z.ZodType<_Comparison> = z.object({ type: z.enum(['eq', 'ne']), key: z.string() })

const Compound: z.ZodType<_Compound> = z.object({ type: z.enum(['and', 'or']) })

export const Filter: z.ZodType<_Filter> = z.xor([
  z.intersection(
    z.lazy(() => Comparison),
    z.object({ type: z.enum(['eq', 'ne']) }),
  ),
  z.intersection(
    z.lazy(() => Compound),
    z.object({ type: z.enum(['and', 'or']) }),
  ),
])

export type Filter = z.infer<typeof Filter>
