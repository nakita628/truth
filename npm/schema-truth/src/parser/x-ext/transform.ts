import type { JSONValue } from '../json.js'

/**
 * B 層: 振る舞い・transform 系 vendor extensions.
 *
 * Declarative knobs that adjust the generated validator's runtime behavior
 * (coercion, normalization, branding) or constrain format APIs without
 * embedding code. Most are validator-portable; format-option fields are
 * tagged Zod-only and become no-ops on validators without an equivalent API.
 */
export type XExtTransform = {
  // ── Declarative transforms (string-only unless noted) ────────────
  /** Apply `.trim()` / `v.trim()` etc. before validation */
  readonly 'x-trim'?: boolean
  /** Apply `.toLowerCase()` before validation */
  readonly 'x-toLowerCase'?: boolean
  /** Apply `.toUpperCase()` before validation */
  readonly 'x-toUpperCase'?: boolean
  /** Apply Unicode normalization */
  readonly 'x-normalize'?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'
  /** Mark schema as readonly (array / object) */
  readonly 'x-readonly'?: boolean
  /** Require value to start with a literal prefix */
  readonly 'x-startsWith'?: string
  /** Require value to end with a literal suffix */
  readonly 'x-endsWith'?: string
  /** Require value to contain a literal substring */
  readonly 'x-includes'?: string

  // ── Coercion / fallback (Zod-only) ───────────────────────────────
  /** Zod-only: enable `z.coerce.<type>` for number / integer / boolean / date */
  readonly 'x-coerce'?: boolean
  /**
   * Zod-only: emit `z.stringbool()` — string-typed input parsed as boolean
   * via a fixed (or custom) truthy/falsy whitelist. Trigger is `type: "string"`;
   * when set, supersedes `format` / `pattern` / `x-coerce` / other string options.
   * `true` enables defaults; an object configures truthy/falsy/case/error.
   * @see https://zod.dev/api?id=stringbools
   */
  readonly 'x-stringbool'?:
    | boolean
    | {
        readonly truthy?: readonly string[]
        readonly falsy?: readonly string[]
        readonly case?: 'sensitive' | 'insensitive'
        readonly error?: string
      }
  /** Zod-only: `.prefault(value)` — apply default to input before parse */
  readonly 'x-prefault'?: JSONValue
  /** Zod-only: `.catch(value)` — fall back to value on parse failure */
  readonly 'x-catch'?: JSONValue

  // ── Fallback (Valibot-only) ──────────────────────────────────────
  /** Valibot-only: `v.fallback(schema, value)` — fall back to value on parse failure */
  readonly 'x-fallback'?: JSONValue

  // ── Format-option (Zod-only unless the comment says otherwise) ──────
  // No-op on validators without an equivalent format API.
  /** Zod-only: select the email regex preset for `format: email` */
  readonly 'x-emailPattern'?: 'html5' | 'rfc5322' | 'browser' | 'unicode'
  /** Zod-only: custom email regex source for `format: email` */
  readonly 'x-emailRegex'?: string
  /** Restrict UUID version on `format: uuid` (Zod, Valibot, Effect Schema, ArkType) */
  readonly 'x-uuidVersion'?: 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8'
  /** Zod-only: restrict URL hostname on `format: uri` / `format: url` */
  readonly 'x-urlHostname'?: string
  /** Zod-only: restrict URL protocol on `format: uri` / `format: url` */
  readonly 'x-urlProtocol'?: string
  /** Zod-only: enable / disable URL normalization */
  readonly 'x-urlNormalize'?: boolean
  /**
   * ISO `date-time` / `time` sub-second precision: `-1` minutes only, `0` whole seconds, `n`
   * exactly `n` fraction digits (Zod, Valibot, Effect Schema, ArkType)
   */
  readonly 'x-isoPrecision'?: number
  /**
   * Whether an ISO `date-time` / `time` accepts a numeric UTC offset; RFC 3339 carries one,
   * so `false` is what rules it out (Zod, Valibot, Effect Schema, ArkType)
   */
  readonly 'x-isoOffset'?: boolean
  /** Allow a local (offset-less) ISO `date-time` (Zod, Valibot, Effect Schema, ArkType) */
  readonly 'x-isoLocal'?: boolean
  /** Zod-only: allowed algorithm(s) for `format: jwt` */
  readonly 'x-jwtAlg'?: string
  /** Zod-only: hash algorithm for `format: hash` (required positional arg of `z.hash`) */
  readonly 'x-hashAlg'?: 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5'
  /** Zod-only: hash encoding for `format: hash` */
  readonly 'x-hashEnc'?: 'hex' | 'base64' | 'base64url'
  /** Zod-only: delimiter for `format: mac` */
  readonly 'x-macDelimiter'?: string

  // ── Case validation (Zod-only) ───────────────────────────────────
  // NOTE: validation, not transform — input must already be lower/uppercase.
  // Pair with `x-toLowerCase` / `x-toUpperCase` to normalize first, then check.
  /** Zod-only: enforce lowercase via `.lowercase()` validation */
  readonly 'x-lowercase'?: boolean
  /** Zod-only: enforce uppercase via `.uppercase()` validation */
  readonly 'x-uppercase'?: boolean

  // ── Branded types ────────────────────────────────────────────────
  /** Branded type tag — emitted as Zod `.brand<"Tag">()` etc. */
  readonly 'x-brand'?: string
}
