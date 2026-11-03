import * as v from 'valibot'

type _A = { id: string; type: 'B' | 'C'; payload: _B | _C }

type _E = { label?: string; reference?: _E; flags?: string[]; meta?: { [key: string]: string } }

type _D = { score: number; extra?: null | _E }

type _B = { type: 'B'; name: string; detail: _D & { comment?: string } }

type _C = { type: 'C'; entries: _E[] }

const E: v.GenericSchema<unknown, _E> = v.partial(
  v.object({
    label: v.string(),
    reference: v.lazy(() => E),
    flags: v.pipe(
      v.array(v.string()),
      v.check((input) => new Set(input).size === input.length),
    ),
    meta: v.record(v.string(), v.string()),
  }),
)

const D: v.GenericSchema<unknown, _D> = v.object({
  score: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)), 50),
  extra: v.optional(v.union([v.nullable(v.null()), v.lazy(() => E)])),
})

const B: v.GenericSchema<unknown, _B> = v.object({
  type: v.literal('B'),
  name: v.string(),
  detail: v.intersect([v.lazy(() => D), v.object({ comment: v.optional(v.string(), 'N/A') })]),
})

const C: v.GenericSchema<unknown, _C> = v.object({
  type: v.literal('C'),
  entries: v.pipe(v.array(v.lazy(() => E)), v.minLength(1)),
})

export const A: v.GenericSchema<unknown, _A> = v.object({
  id: v.pipe(
    v.string(),
    v.regex(
      /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
    ),
  ),
  type: v.picklist(['B', 'C']),
  payload: v.union([v.lazy(() => B), v.lazy(() => C)]),
})
