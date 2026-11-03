import * as v from 'valibot'

export const Vehicle = v.pipe(
  v.looseObject({ type: v.picklist(['car', 'truck']) }),
  v.check(
    (input) =>
      !v.safeParse(v.partial(v.object({ type: v.literal('truck') })), input).success ||
      v.safeParse(v.object({ cargoCapacity: v.pipe(v.number(), v.minValue(0)) }), input).success,
  ),
  v.check(
    (input) =>
      v.safeParse(v.partial(v.object({ type: v.literal('truck') })), input).success ||
      v.safeParse(
        v.object({ passengerCount: v.pipe(v.number(), v.integer(), v.minValue(1)) }),
        input,
      ).success,
  ),
)
