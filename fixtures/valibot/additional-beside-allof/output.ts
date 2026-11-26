import * as v from 'valibot'

export const Closed = v.object({
  box: v.optional(
    v.intersect([
      v.intersect([v.partial(v.object({ a: v.string() })), v.partial(v.object({ b: v.string() }))]),
      v.union([
        v.custom<unknown>(
          (input) => typeof input !== 'object' || input === null || Array.isArray(input),
        ),
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
    ]),
  ),
  either: v.optional(
    v.intersect([
      v.union([v.string(), v.partial(v.object({ a: v.number() }))]),
      v.union([
        v.custom<unknown>(
          (input) => typeof input !== 'object' || input === null || Array.isArray(input),
        ),
        v.pipe(
          v.unknown(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const o = dataset.value
            if (typeof o !== 'object' || o === null || Array.isArray(o)) return
            for (const [k, val] of Object.entries(o)) {
              if (!['a'].includes(k)) {
                addIssue({ message: 'Unevaluated property: ' + k })
              }
            }
          }),
          v.object({}),
        ),
      ]),
    ]),
  ),
  filled: v.optional(
    v.intersect([
      v.object({}),
      v.union([
        v.custom<unknown>(
          (input) => typeof input !== 'object' || input === null || Array.isArray(input),
        ),
        v.pipe(
          v.unknown(),
          v.rawCheck(({ dataset, addIssue }) => {
            if (!dataset.typed) return
            const o = dataset.value
            if (typeof o !== 'object' || o === null || Array.isArray(o)) return
            for (const [k, val] of Object.entries(o)) {
              addIssue({ message: 'Unevaluated property: ' + k })
            }
          }),
          v.object({}),
        ),
      ]),
    ]),
    {},
  ),
})

export type ClosedOutput = v.InferOutput<typeof Closed>
