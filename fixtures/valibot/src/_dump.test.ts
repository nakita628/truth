import * as v from 'valibot'
import { describe, it } from 'vite-plus/test'
import { Pet } from '../discriminated-union/output.ts'
import { Row } from '../prefix-items-unevaluated/output.ts'
import { IntList } from '../contains-min-max/output.ts'
import { PatternMap } from '../pattern-properties/output.ts'
import { Photo } from '../content-encoding-base64/output.ts'
import { Style } from '../content-schema-json/output.ts'
import { Toggle } from '../dependent-schemas/output.ts'
import { Address } from '../if-then-else/output.ts'
import { Status } from '../nullable-default/output.ts'
import { Color } from '../enum-japanese/output.ts'
import { User as DeepUser } from '../deep-nested-validation/output.ts'
import { Account } from '../write-only-password/output.ts'

describe('dump', () => {
  it('dump all', () => {
    const dump = (label: string, r: v.SafeParseResult<v.GenericSchema>) => {
      console.log(`=== ${label} ===`)
      console.log(JSON.stringify(r, null, 2))
    }
    dump('Pet ok', v.safeParse(Pet, { kind: 'cat', indoor: true }))
    dump('Pet bad kind', v.safeParse(Pet, { kind: 'fish' }))
    dump('Pet missing indoor', v.safeParse(Pet, { kind: 'cat' }))

    dump('Row ok', v.safeParse(Row, ['x', true, 1, 2]))
    dump('Row bad rest', v.safeParse(Row, ['x', true, 'nope']))
    dump('Row short', v.safeParse(Row, ['x']))

    dump('IntList ok', v.safeParse(IntList, [1, 2, 'x']))
    dump('IntList too few', v.safeParse(IntList, [1, 'x']))
    dump('IntList too many', v.safeParse(IntList, [1, 2, 3, 4]))
    dump('IntList not array', v.safeParse(IntList, 'x'))

    dump('PatternMap ok', v.safeParse(PatternMap, { Sname: 'foo', Iage: 42 }))
    dump('PatternMap bad Iage', v.safeParse(PatternMap, { Iage: 'nope' }))

    dump('Photo ok', v.safeParse(Photo, { image: 'aGVsbG8=' }))
    dump('Photo bad', v.safeParse(Photo, { image: 'not-base64!!' }))

    const okJson = Buffer.from(JSON.stringify({ name: 'taro' })).toString('base64')
    const badJson = Buffer.from(JSON.stringify({ other: 1 })).toString('base64')
    dump('Style ok', v.safeParse(Style, { style: okJson }))
    dump('Style bad', v.safeParse(Style, { style: badJson }))

    dump('Toggle ok with feature', v.safeParse(Toggle, { kind: 'a', feature: 'b' }))
    dump('Toggle missing feature', v.safeParse(Toggle, { kind: 'a' }))

    dump('Address ok JP', v.safeParse(Address, { country: 'JP', postalCode: '100-0001' }))
    dump('Address ok US', v.safeParse(Address, { country: 'US' }))
    dump('Address bad JP', v.safeParse(Address, { country: 'JP' }))
    dump('Address bad postalCode', v.safeParse(Address, { country: 'JP', postalCode: 'x' }))

    dump('Status ok null', v.safeParse(Status, { label: null }))
    dump('Status ok absent', v.safeParse(Status, {}))
    dump('Status ok string', v.safeParse(Status, { label: 'hi' }))
    dump('Status bad number', v.safeParse(Status, { label: 1 }))

    dump('Color ok', v.safeParse(Color, '赤'))
    dump('Color bad', v.safeParse(Color, 'orange'))

    dump('DeepUser ok', v.safeParse(DeepUser, {
      name: 'taro', email: 'a@b.com', address: { city: 'tokyo', zip: '100-0001' },
    }))
    dump('DeepUser bad', v.safeParse(DeepUser, {
      name: '', email: 'x', address: { city: 'tokyo', zip: 'bad' },
    }))

    dump('Account ok', v.safeParse(Account, { name: 'taro', password: 'secret' }))
    dump('Account bad', v.safeParse(Account, { name: 1 }))
  })
})
