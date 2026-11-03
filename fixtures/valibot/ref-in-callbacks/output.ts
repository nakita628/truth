import * as v from 'valibot'

type _Doc = { a?: string; list?: { [key: string]: unknown }[]; kind?: string }

type _Base = { meta: string }

type _NeedsKind = { kind: string }

const Base: v.GenericSchema<unknown, _Base> = v.object({ meta: v.string() })

const NeedsKind: v.GenericSchema<unknown, _NeedsKind> = v.object({ kind: v.string() })

export const Doc: v.GenericSchema<unknown, _Doc> = v.pipe(
  v.pipe(
    v.unknown(),
    v.rawCheck(({ dataset, addIssue }) => {
      if (!dataset.typed) return
      const result = v.safeParse(
        v.partial(
          v.looseObject({
            a: v.string(),
            list: v.pipe(
              v.array(v.object({})),
              v.check(
                (input) =>
                  input.filter(
                    (item) =>
                      v.safeParse(
                        v.lazy(() => Base),
                        item,
                      ).success,
                  ).length >= 1,
              ),
            ),
            kind: v.string(),
          }),
        ),
        dataset.value,
      )
      if (!result.success) {
        for (const issue of result.issues) {
          if (issue.path && issue.path.length > 0) {
            addIssue({ message: 'bad doc', path: issue.path })
          } else {
            addIssue({ message: issue.message })
          }
        }
      }
    }),
    v.partial(
      v.looseObject({
        a: v.string(),
        list: v.pipe(
          v.array(v.object({})),
          v.check(
            (input) =>
              input.filter(
                (item) =>
                  v.safeParse(
                    v.lazy(() => Base),
                    item,
                  ).success,
              ).length >= 1,
          ),
        ),
        kind: v.string(),
      }),
    ),
  ),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        !new RegExp('^p-').test(key) ||
        v.safeParse(
          v.lazy(() => Base),
          value,
        ).success,
    ),
  ),
  v.check((input) =>
    Object.entries(input).every(
      ([key, value]) =>
        ['a', 'list', 'kind'].includes(key) ||
        new RegExp('^p-').test(key) ||
        v.safeParse(
          v.lazy(() => Base),
          value,
        ).success,
    ),
  ),
  v.check(
    (input) =>
      !('a' in input) ||
      v.safeParse(
        v.lazy(() => NeedsKind),
        input,
      ).success,
  ),
)

export type DocOutput = v.InferOutput<typeof Doc>
