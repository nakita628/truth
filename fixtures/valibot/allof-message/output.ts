import * as v from 'valibot'

export const Merged = v.pipe(
  v.unknown(),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return
    const result = v.safeParse(
      v.intersect([
        v.object({ name: v.pipe(v.string(), v.minCodePoints(3)) }),
        v.object({ age: v.pipe(v.number(), v.integer(), v.minValue(0, 'age must be >= 0')) }),
      ]),
      dataset.value,
    )
    if (!result.success) {
      for (const issue of result.issues) {
        addIssue({ message: 'merged validation failed', path: issue.path })
      }
    }
  }),
  v.intersect([
    v.object({ name: v.pipe(v.string(), v.minCodePoints(3)) }),
    v.object({ age: v.pipe(v.number(), v.integer(), v.minValue(0, 'age must be >= 0')) }),
  ]),
)

export type MergedOutput = v.InferOutput<typeof Merged>
