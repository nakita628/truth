import * as z from 'zod'

export const Closed = z.object({
  box: z
    .intersection(
      z.intersection(
        z.object({ a: z.string().exactOptional() }),
        z.object({ b: z.string().exactOptional() }),
      ),
      (() => {
        const Schema = z.object({})
        return z
          .unknown()
          .check((ctx) => {
            const o = ctx.value
            if (typeof o !== 'object' || o === null || Array.isArray(o)) return
            for (const [k, v] of Object.entries(o)) {
              if (!['a', 'b'].includes(k)) {
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
      })(),
    )
    .exactOptional(),
})

export type Closed = z.infer<typeof Closed>
