import * as z from 'zod'

export const Closed = z.object({
  box: z
    .intersection(
      z.intersection(
        z.object({ a: z.string().exactOptional() }),
        z.object({ b: z.string().exactOptional() }),
      ),
      z.union([
        z.any().refine((val) => typeof val !== 'object' || val === null || Array.isArray(val)),
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
      ]),
    )
    .exactOptional(),
  either: z
    .intersection(
      z.union([z.string(), z.object({ a: z.number().exactOptional() })]),
      z.union([
        z.any().refine((val) => typeof val !== 'object' || val === null || Array.isArray(val)),
        (() => {
          const Schema = z.object({})
          return z
            .unknown()
            .check((ctx) => {
              const o = ctx.value
              if (typeof o !== 'object' || o === null || Array.isArray(o)) return
              for (const [k, v] of Object.entries(o)) {
                if (!['a'].includes(k)) {
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
      ]),
    )
    .exactOptional(),
  filled: z
    .intersection(
      z.object({}),
      z.union([
        z.any().refine((val) => typeof val !== 'object' || val === null || Array.isArray(val)),
        (() => {
          const Schema = z.object({})
          return z
            .unknown()
            .check((ctx) => {
              const o = ctx.value
              if (typeof o !== 'object' || o === null || Array.isArray(o)) return
              for (const [k, v] of Object.entries(o)) {
                ctx.issues.push({
                  code: 'custom',
                  input: o,
                  path: [k],
                  message: `Unrecognized key: "${k}"`,
                })
              }
            })
            .pipe(Schema)
        })(),
      ]),
    )
    .default({}),
})

export type Closed = z.infer<typeof Closed>
