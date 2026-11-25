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
export function regexLiteral(pattern: string) {
  const rewritten = rewriteBracedHex(pattern)
  const body = rewritten.pattern.replaceAll(/(?<!\\)\//gu, '\\/')
  const unicodeFlag = rewritten.unicode || UNICODE_ESCAPE_PATTERN.test(rewritten.pattern) ? 'u' : ''
  return `/${body}/${unicodeFlag}`
}

/**
 * A `new RegExp(...)` expression for a JSON Schema `pattern`, for a check built inside a
 * callback: the pattern is a JSON string, so a `/`, an escaped backslash or a line
 * terminator needs no rewriting, and a pattern the engine rejects throws when the check
 * runs instead of when the generated module loads. Braced hex escapes are rewritten as in
 * {@link regexLiteral}. The `u` flag is set for an unescaped `\p{` / `\u{` (or a code
 * point above U+FFFF), unless the pattern compiles only without it: `u` refuses identity
 * escapes such as `\_` that the pattern may also use.
 *
 * @example
 * ```ts
 * regexConstructor('^[a-z]+$')  // 'new RegExp("^[a-z]+$")'
 * regexConstructor('^\\p{L}+$')  // 'new RegExp("^\\\\p{L}+$","u")'
 * ```
 */
export function regexConstructor(pattern: string) {
  const rewritten = rewriteBracedHex(pattern)
  const wantsUnicode = rewritten.unicode || hasUnicodeEscape(rewritten.pattern)
  const unicode =
    wantsUnicode && (compiles(rewritten.pattern, 'u') || !compiles(rewritten.pattern, ''))
  return `new RegExp(${JSON.stringify(rewritten.pattern)}${unicode ? ',"u"' : ''})`
}

/** Whether `pattern` has a `\p{`, `\P{` or `\u{` whose backslash is not itself escaped. */
function hasUnicodeEscape(pattern: string) {
  for (let index = 0; index < pattern.length; index++) {
    if (pattern.charAt(index) !== '\\') continue
    const next = pattern.charAt(index + 1)
    if ('pPu'.includes(next) && next !== '' && pattern.charAt(index + 2) === '{') return true
    index += 1
  }
  return false
}

function compiles(pattern: string, flags: string) {
  try {
    return new RegExp(pattern, flags).flags === flags
  } catch {
    return false
  }
}

/**
 * The pattern with braced hex escapes (`\x{hex}`) rewritten to JavaScript unicode
 * escapes. A code point above U+FFFF needs the `u` flag (`unicode`). An
 * already-escaped backslash (`\\x{FFFF}`) is left as text.
 */
export function patternSource(pattern: string) {
  return rewriteBracedHex(pattern).pattern
}

function rewriteBracedHex(pattern: string) {
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
      // Not hex digits: NaN, which no comparison below admits.
      const codePoint = /^[0-9A-Fa-f]+$/u.test(hex) ? Number.parseInt(hex, 16) : Number.NaN
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
    out += char
  }
  return { pattern: out, unicode }
}
