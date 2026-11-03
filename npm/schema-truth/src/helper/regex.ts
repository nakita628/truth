import { UNICODE_ESCAPE_PATTERN } from '../constants/index.js'

/**
 * Build a JavaScript regular-expression literal from a JSON Schema `pattern`.
 *
 * Escapes unescaped `/` so the literal stays delimited, and adds the `u` flag
 * when the pattern uses Unicode property escapes (`\p{...}`, `\P{...}`,
 * `\u{...}`), which TypeScript requires for those constructs (TS1530). A Perl
 * hex escape `\x{HHHH}` is rewritten to `\uHHHH` (or `\u{HHHHH}` above
 * U+FFFF, which also sets `u`): TypeScript rejects `\x{` (TS1125) and, without
 * `u`, V8 treats it as an identity escape. Returns the literal only (`/.../`
 * or `/.../u`); callers append any validator-specific error argument.
 *
 * @example
 * ```ts
 * regexLiteral('^[a-z]+$')      // '/^[a-z]+$/'
 * regexLiteral('^\\p{L}+$')     // '/^\\p{L}+$/u'
 * regexLiteral('a/b')           // '/a\\/b/'
 * regexLiteral('\\x{FFFF}')     // '/\\uFFFF/'
 * ```
 */
export function regexLiteral(pattern: string): string {
  const rewritten = rewriteBracedHex(pattern)
  const body = rewritten.pattern.replaceAll(/(?<!\\)\//gu, '\\/')
  const unicodeFlag = rewritten.unicode || UNICODE_ESCAPE_PATTERN.test(rewritten.pattern) ? 'u' : ''
  return `/${body}/${unicodeFlag}`
}

/**
 * The pattern with braced hex escapes (`\x{hex}`) rewritten to JavaScript unicode
 * escapes. A code point above U+FFFF needs the `u` flag (`unicode`). An
 * already-escaped backslash (`\\x{FFFF}`) is left as text.
 */
export function patternSource(pattern: string): string {
  return rewriteBracedHex(pattern).pattern
}

function rewriteBracedHex(pattern: string): {
  readonly pattern: string
  readonly unicode: boolean
} {
  let unicode = false
  let out = ''
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern.charAt(index)
    if (char === '\\' && pattern.charAt(index + 1) === '\\') {
      out += '\\\\'
      index += 1
      continue
    }
    if (char === '\\' && pattern.startsWith('x{', index + 1)) {
      const close = pattern.indexOf('}', index + 3)
      const hex = close > index + 3 ? pattern.slice(index + 3, close) : ''
      if (/^[0-9A-Fa-f]+$/u.test(hex)) {
        const codePoint = Number.parseInt(hex, 16)
        if (codePoint <= 1_114_111) {
          if (codePoint > 65_535) {
            unicode = true
            out += `\\u{${hex}}`
          } else {
            out += `\\u${hex.padStart(4, '0')}`
          }
          index = close
          continue
        }
      }
    }
    out += char
  }
  return { pattern: out, unicode }
}
