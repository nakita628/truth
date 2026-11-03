import { describe, expect, it } from 'vite-plus/test'

import { regexLiteral } from './regex.js'

describe('regexLiteral', () => {
  it.concurrent.each<[string, string]>([
    ['^[a-z]+$', '/^[a-z]+$/'],
    ['^\\p{L}+$', '/^\\p{L}+$/u'],
    ['^\\P{N}$', '/^\\P{N}$/u'],
    ['\\u{1F600}', '/\\u{1F600}/u'],
    ['a/b', '/a\\/b/'],
    ['a\\/b', '/a\\/b/'],
    ['^\\d{4}-\\d{2}-\\d{2}$', '/^\\d{4}-\\d{2}-\\d{2}$/'],
    ['^[\\x00-\\x{FFFF}]*$', '/^[\\x00-\\uFFFF]*$/'],
    ['\\x{41}', '/\\u0041/'],
    ['\\x{1F600}', '/\\u{1F600}/u'],
    ['\\\\x{FFFF}', '/\\\\x{FFFF}/'],
  ])('regexLiteral(%j) → %j', (pattern, expected) => {
    expect(regexLiteral(pattern)).toBe(expected)
  })
})
