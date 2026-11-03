import * as v from 'valibot'

type _Bucket = _Base & { doc_count: number }

type _Base = { meta?: string }

const Base: v.GenericSchema<unknown, _Base> = v.partial(v.object({ meta: v.string() }))

export const Bucket: v.GenericSchema<unknown, _Bucket> = v.pipe(
  v.unknown(),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return
    const o = dataset.value
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return
    for (const [k, val] of Object.entries(o)) {
      if (!['meta', 'doc_count'].includes(k)) {
        const result = v.safeParse(
          v.lazy(() => Base),
          val,
        )
        if (!result.success) {
          for (const issue of result.issues) {
            addIssue({ message: issue.message })
          }
        }
      }
    }
  }),
  v.intersect([v.lazy(() => Base), v.object({ doc_count: v.pipe(v.number(), v.integer()) })]),
)

export type BucketOutput = v.InferOutput<typeof Bucket>
