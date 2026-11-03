import { describe, expect, it } from 'vite-plus/test'

import { runGenerator, runGeneratorError } from '../testing/index.js'
import { fmt } from './index.js'

describe('fmt', () => {
  it('formats TypeScript code', async () => {
    expect(await runGenerator(fmt('const x=1'))).toBe('const x = 1\n')
  })

  it('formats with default options (no semi, single quote)', async () => {
    expect(await runGenerator(fmt('const x = "hello";'))).toBe("const x = 'hello'\n")
  })

  it('formats multi-line code', async () => {
    expect(await runGenerator(fmt('const a=1\nconst b=2'))).toBe('const a = 1\nconst b = 2\n')
  })

  it('fails in the error channel for invalid code', async () => {
    const error = await runGeneratorError(fmt('const x = {'))
    expect(error.message.length).toBeGreaterThan(0)
  })

  it('formats with default printWidth (no wrap at 100)', async () => {
    expect(await runGenerator(fmt('const obj = { aaaa: 1, bbbb: 2, cccc: 3 }'))).toBe(
      'const obj = { aaaa: 1, bbbb: 2, cccc: 3 }\n',
    )
  })
})
