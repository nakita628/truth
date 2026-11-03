import * as z from 'zod'

type _A = { b?: _B }

type _B = { a?: _A }

const B: z.ZodType<_B> = z.object({ a: z.lazy(() => A).exactOptional() })

export const A: z.ZodType<_A> = z.object({ b: z.lazy(() => B).exactOptional() })

export type A = z.infer<typeof A>
