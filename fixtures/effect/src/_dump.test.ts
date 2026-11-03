import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vite-plus/test'

import { Bag } from '../contains-min-max/output.ts'
import { Image } from '../content-encoding-base64/output.ts'
import { Payload } from '../content-schema-json/output.ts'
import { User as DeepUser } from '../deep-nested-validation/output.ts'
import { Card } from '../dependent-schemas/output.ts'
import { Event } from '../discriminated-union/output.ts'
import { Season } from '../enum-japanese/output.ts'
import { Address } from '../if-then-else/output.ts'
import { Profile } from '../nullable-default/output.ts'
import { Mixed } from '../pattern-properties/output.ts'
import { Pair } from '../prefix-items-unevaluated/output.ts'
import { Login } from '../write-only-password/output.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const decode = (schema: Schema.Codec<any, any>, value: unknown) =>
  Schema.decodeUnknownResult(schema)(value)

const dump = (schema: Schema.Codec<unknown>, label: string, value: unknown) => {
  const v = decode(schema, value)
  if (Result.isFailure(v)) {
    // eslint-disable-next-line no-console
    console.log(`>>> ${label} <<<\n${v.failure.message}\n>>> END ${label} <<<`)
  }
}

describe('_dump', () => {
  it('dump all', () => {
    dump(Event as Schema.Codec<unknown>, 'discriminated-union/unknown type', { type: 'scroll' })
    dump(Pair as Schema.Codec<unknown>, 'prefix-items-unevaluated/extra item', ['a', 1, 'extra'])
    dump(Pair as Schema.Codec<unknown>, 'prefix-items-unevaluated/wrong type', [1, 1])
    dump(Bag as Schema.Codec<unknown>, 'contains-min-max/no element >=10', [1, 2, 3])
    dump(Bag as Schema.Codec<unknown>, 'contains-min-max/too many', [10, 20, 30, 40])
    dump(Mixed as Schema.Codec<unknown>, 'pattern-properties/wrong S type', { 'S:a': 1 })
    dump(Mixed as Schema.Codec<unknown>, 'pattern-properties/wrong I type', { 'I:a': 'x' })
    dump(Image as Schema.Codec<unknown>, 'content-encoding-base64/non-string', 1)
    dump(Payload as Schema.Codec<unknown>, 'content-schema-json/non-string', 1)
    dump(Card as Schema.Codec<unknown>, 'dependent-schemas/missing billing', {
      name: 'a',
      creditCard: 1234,
    })
    dump(Address as Schema.Codec<unknown>, 'if-then-else/missing postalCode', { country: 'JP' })
    dump(Profile as Schema.Codec<unknown>, 'nullable-default/wrong type', { nickname: 1 })
    dump(Season as Schema.Codec<unknown>, 'enum-japanese/wrong', 'spring')
    dump(DeepUser as Schema.Codec<unknown>, 'deep-nested-validation/missing geo', {
      name: 'a',
      address: { street: 's', city: 'c' },
    })
    dump(DeepUser as Schema.Codec<unknown>, 'deep-nested-validation/bad lat', {
      name: 'a',
      address: { street: 's', city: 'c', geo: { lat: 100, lng: 0 } },
    })
    dump(Login as Schema.Codec<unknown>, 'write-only-password/short pw', {
      email: 'a@b.com',
      password: 'short',
    })
    expect(true).toBe(true)
  })
})
