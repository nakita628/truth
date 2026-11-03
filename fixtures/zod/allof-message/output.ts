import * as z from 'zod'

export const Merged = (() => {
  const Schema = z.intersection(
    z.object({ name: z.string().min(3) }),
    z.object({ age: z.int().min(0, { error: 'age must be >= 0' }) }),
  )
  return z
    .unknown()
    .check((ctx) => {
      const result = Schema.safeParse(ctx.value)
      if (!result.success) {
        for (const issue of result.error.issues) {
          if (issue.code === 'invalid_type') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'too_big') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'too_small') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'invalid_format') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'not_multiple_of') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'unrecognized_keys') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'invalid_union') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'invalid_key') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'invalid_element') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'invalid_value') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          } else if (issue.code === 'custom') {
            ctx.issues.push({ ...issue, input: issue.input, message: 'merged validation failed' })
          }
        }
      }
    })
    .pipe(Schema)
})()

export type Merged = z.infer<typeof Merged>
