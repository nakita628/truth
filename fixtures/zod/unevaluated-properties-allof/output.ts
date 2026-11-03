import * as z from 'zod'

type _Bucket = _Base & { doc_count: number }

type _Base = { meta?: string }

const Base: z.ZodType<_Base> = z.object({ meta: z.string().exactOptional() })

export const Bucket: z.ZodType<_Bucket> = (() => {
  const Schema = z.intersection(
    z.lazy(() => Base),
    z.object({ doc_count: z.int() }),
  )
  return z
    .unknown()
    .check((ctx) => {
      const o = ctx.value
      if (typeof o !== 'object' || o === null || Array.isArray(o)) return
      for (const [k, v] of Object.entries(o)) {
        if (!['meta', 'doc_count'].includes(k)) {
          const result = z.lazy(() => Base).safeParse(v)
          if (!result.success) {
            for (const issue of result.error.issues) {
              ctx.issues.push({
                code: 'custom',
                input: v,
                path: [k, ...issue.path],
                message: issue.message,
              })
            }
          }
        }
      }
    })
    .pipe(Schema)
})()

export type Bucket = z.infer<typeof Bucket>
