import { describe, expect, it } from 'vite-plus/test'

import { valueListLiteral } from './not.js'

describe('valueListLiteral', () => {
  it.concurrent.each<[readonly unknown[], boolean, string]>([
    [[1, 2], false, '[1,2]'],
    [[1, 2], true, '[1n,2n]'],
    [[1e21, 1.5, 'a'], true, '[1000000000000000000000n,1.5,"a"]'],
  ])('valueListLiteral(%o, %o) -> %s', (values, bigint, expected) => {
    expect(valueListLiteral(values, bigint)).toBe(expected)
  })
})
