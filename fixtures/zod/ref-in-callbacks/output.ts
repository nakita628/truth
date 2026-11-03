import * as z from 'zod'

type _Doc = { a?: string; list?: { [key: string]: unknown }[]; kind?: string }

type _Base = { meta: string }

type _NeedsKind = { kind: string }

const Base: z.ZodType<_Base> = z.object({ meta: z.string() })

const NeedsKind: z.ZodType<_NeedsKind> = z.object({ kind: z.string() })

export const Doc: z.ZodType<_Doc> = (() => {
  const Schema = z.looseObject({
    a: z.string().exactOptional(),
    list: z
      .array(z.object({}))
      .refine((val) => {
        const Schema = z.lazy(() => Base)
        return val.filter((item) => Schema.safeParse(item).success).length >= 1
      })
      .exactOptional(),
    kind: z.string().exactOptional(),
  })
  return z
    .unknown()
    .check((ctx) => {
      const result = Schema.safeParse(ctx.value)
      if (!result.success) {
        for (const issue of result.error.issues) {
          if (issue.code === 'invalid_type') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'too_big') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'too_small') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'invalid_format') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'not_multiple_of') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'unrecognized_keys') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'invalid_union') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'invalid_key') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'invalid_element') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'invalid_value') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          } else if (issue.code === 'custom') {
            ctx.issues.push({
              ...issue,
              input: issue.input,
              message: issue.path.length > 0 ? 'bad doc' : issue.message,
            })
          }
        }
      }
    })
    .pipe(Schema)
})()
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) => !new RegExp('^p-').test(key) || z.lazy(() => Base).safeParse(value).success,
    ),
  )
  .refine((val) =>
    Object.entries(val).every(
      ([key, value]) =>
        ['a', 'list', 'kind'].includes(key) ||
        new RegExp('^p-').test(key) ||
        z.lazy(() => Base).safeParse(value).success,
    ),
  )
  .refine((val) => !('a' in val) || z.lazy(() => NeedsKind).safeParse(val).success)

export type Doc = z.infer<typeof Doc>
