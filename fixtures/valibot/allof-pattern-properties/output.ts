import * as v from 'valibot'

export const Extended = v.pipe(
  v.unknown(),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return
    const o = dataset.value
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return
    for (const [k, val] of Object.entries(o)) {
      if (new RegExp('^x-').test(k)) {
        const result = v.safeParse(v.string(), val)
        if (!result.success) {
          for (const issue of result.issues) {
            addIssue({ message: issue.message })
          }
        }
      }
      if (!(['a'].includes(k) || new RegExp('^x-').test(k))) {
        addIssue({ message: 'Unevaluated property: ' + k })
      }
    }
  }),
  v.partial(v.object({ a: v.string() })),
)

export type ExtendedOutput = v.InferOutput<typeof Extended>
