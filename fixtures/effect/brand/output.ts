import { Schema } from 'effect'

export const BrandedTypes = Schema.Struct({
  userId: Schema.String.check(Schema.isUUID()).pipe(Schema.brand('UserId')),
  email: Schema.String.check(
    Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  ).pipe(Schema.brand('Email')),
  price: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Schema.brand('Price')),
  quantity: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)).pipe(
    Schema.brand('Quantity'),
  ),
  tags: Schema.Array(Schema.String)
    .check(Schema.isMinLength(1), Schema.isMaxLength(10))
    .pipe(Schema.brand('Tags')),
  name: Schema.String,
})

export type BrandedTypes = typeof BrandedTypes.Type
