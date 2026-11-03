import * as z from 'zod'

type _A = { b?: _B }

type _C = string

type _B = { c?: _C }

const C: z.ZodType<_C> = z.string()

const B: z.ZodType<_B> = z.object({ c: z.lazy(() => C).exactOptional() })

export const A: z.ZodType<_A> = z.object({ b: z.lazy(() => B).exactOptional() })

export type A = z.infer<typeof A>
