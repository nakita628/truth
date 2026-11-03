import { describe, expect, it } from 'vite-plus/test'

import { runGenerator, runGeneratorError } from '../testing/index.js'
import { parseJson } from './index.js'

describe('parseJson', () => {
  it('parses an object', async () => {
    expect(await runGenerator(parseJson('{"a":1}'))).toStrictEqual({ a: 1 })
  })

  it('fails on invalid JSON', async () => {
    const error = await runGeneratorError(parseJson('{'))
    expect(error.message.length).toBeGreaterThan(0)
  })
})
