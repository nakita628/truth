import { scope, type } from 'arktype'

const $ = scope({
  Base: { meta: 'string' },
  NeedsKind: { kind: 'string' },
  Doc: [
    [
      [
        [
          {
            'a?': 'string',
            'list?': type({})
              .array()
              .narrow(
                (data: unknown[], ctx): boolean =>
                  data.filter((item) => $.type('Base').allows(item)).length >= 1 ||
                  ctx.mustBe('must contain at least 1 matching items'),
              ),
            'kind?': 'string',
          },
          ':',
          (data): boolean =>
            Object.entries(data).every(
              ([key, value]) => !new RegExp('^p-').test(key) || $.type('Base').allows(value),
            ),
        ],
        ':',
        (data): boolean => !('a' in data) || $.type('NeedsKind').allows(data),
      ],
      ':',
      (data): boolean =>
        Object.entries(data).every(
          ([key, value]) =>
            ['a', 'list', 'kind'].includes(key) ||
            new RegExp('^p-').test(key) ||
            $.type('Base').allows(value),
        ),
    ],
    '@',
    'bad doc',
  ],
})

const types = $.export()

export const Doc = types.Doc

export type Doc = typeof Doc.infer
