import * as z from 'zod'

export const Extended = (() => {
  const Schema = z.object({ a: z.string().exactOptional() })
  return z
    .unknown()
    .check((ctx) => {
      const o = ctx.value
      if (typeof o !== 'object' || o === null || Array.isArray(o)) return
      for (const [k, v] of Object.entries(o)) {
        if (new RegExp('^x-').test(k)) {
          const result = z.string().safeParse(v)
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
        if (!(['a'].includes(k) || new RegExp('^x-').test(k))) {
          ctx.issues.push({
            code: 'custom',
            input: o,
            path: [k],
            message: `Unrecognized key: "${k}"`,
          })
        }
      }
    })
    .pipe(Schema)
})()

export type Extended = z.infer<typeof Extended>
