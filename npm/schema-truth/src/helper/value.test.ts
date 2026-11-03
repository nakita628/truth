import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vite-plus/test'

import { deepEqualExpression } from './value.js'

/** The expression as a predicate, to run it. */
function predicate(value: unknown): (input: unknown) => boolean {
  const run: unknown = runInNewContext(`(input) => ${deepEqualExpression(value, 'input')}`)
  return (input) => typeof run === 'function' && Reflect.apply(run, undefined, [input]) === true
}

describe('deepEqualExpression', () => {
  it('matches an object regardless of key order, and nothing more or less', () => {
    const equal = predicate({ a: [1, null], b: { c: 'x' } })
    expect(equal({ b: { c: 'x' }, a: [1, null] })).toBe(true)
    expect(equal({ a: [1, null], b: { c: 'x' }, d: 1 })).toBe(false)
    expect(equal({ a: [1], b: { c: 'x' } })).toBe(false)
    expect(equal({ a: [1, null], b: { c: 'y' } })).toBe(false)
    expect(equal([1, null])).toBe(false)
    expect(equal(null)).toBe(false)
  })

  it('matches an array item by item', () => {
    const equal = predicate([1, [2], { a: true }])
    expect(equal([1, [2], { a: true }])).toBe(true)
    expect(equal([1, [2], { a: true }, 4])).toBe(false)
    expect(equal([[2], 1, { a: true }])).toBe(false)
    expect(equal({ 0: 1, 1: [2], 2: { a: true }, length: 3 })).toBe(false)
  })

  it('compares a primitive with ===, and reads an inherited key as absent', () => {
    expect(predicate('a')('a')).toBe(true)
    expect(predicate(null)(undefined)).toBe(false)
    expect(predicate({ toString: 1 })({})).toBe(false)
  })
})
