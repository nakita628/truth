import { describe, expect, it } from 'vite-plus/test'

import { resolveSchemaDependenciesFromSchema } from './index.js'

describe('barrel', () => {
  it('should export resolveSchemaDependenciesFromSchema', () => {
    expect(typeof resolveSchemaDependenciesFromSchema).toBe('function')
  })
})
