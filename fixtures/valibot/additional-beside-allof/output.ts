import * as v from 'valibot'

export const Closed = v.partial(
  v.object({
    box: v.intersect([
      v.intersect([v.partial(v.object({ a: v.string() })), v.partial(v.object({ b: v.string() }))]),
      v.pipe(
        v.unknown(),
        v.rawCheck(({ dataset, addIssue }) => {
          if (!dataset.typed) return
          const o = dataset.value
          if (typeof o !== 'object' || o === null || Array.isArray(o)) return
          for (const [k, val] of Object.entries(o)) {
            if (!['a', 'b'].includes(k)) {
              addIssue({ message: 'Unevaluated property: ' + k })
            }
          }
        }),
        v.object({}),
      ),
    ]),
  }),
)

export type ClosedOutput = v.InferOutput<typeof Closed>
