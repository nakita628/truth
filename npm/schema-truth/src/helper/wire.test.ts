import { describe, expect, it } from 'vite-plus/test'

import { STRINGBOOL_PATTERN } from '../constants/index.js'
import { stringboolPatternText } from './wire.js'

describe('stringboolPatternText', () => {
  it('folds a source made only of literal words, digits and plain groups', () => {
    // The fold rewrites every lowercase letter, so an escape (`\s`) or a class (`[a-z]`)
    // in STRINGBOOL_PATTERN would break it; this guard fails before that can ship.
    expect(STRINGBOOL_PATTERN.source).toMatch(/^\^\(\?:[a-z0-9|]+\)\$$/)
    expect(STRINGBOOL_PATTERN.flags).toBe('i')
  })

  it.each([
    'true',
    'TRUE',
    'tRuE',
    '1',
    'Yes',
    'on',
    'Y',
    'ENABLED',
    'false',
    'False',
    '0',
    'nO',
    'OFF',
    'n',
    'Disabled',
    '',
    'maybe',
    'true1',
    ' true',
    'yes\n',
  ])('matches %j exactly when the case-insensitive pattern does', (text) => {
    expect(new RegExp(stringboolPatternText()).test(text)).toBe(STRINGBOOL_PATTERN.test(text))
  })
})
