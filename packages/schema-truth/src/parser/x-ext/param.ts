import type { PARAM_LOCATIONS, PARAM_STYLES } from '../../constants/index.js'

/**
 * OpenAPI parameter location, or `formData` for a field of a form body
 * (`application/x-www-form-urlencoded`, `multipart/form-data`).
 *
 * Every location is string-wire — when a primitive schema is emitted under one of
 * them, generators read a number from the JSON number grammar and an integer from
 * digits with no leading zero before converting the text, read a literal, an `enum`
 * and the text `null` from the text, wrap a value sent once into an array of one,
 * and copy an object with an `Object.prototype`-named property onto a null-prototype
 * object before the check. Boolean text is the same set for every target.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#parameter-object
 */
export type ParamIn = (typeof PARAM_LOCATIONS)[number]

/**
 * Per-property OpenAPI serialization, for one property of an object schema emitted
 * with `paramIn`. The root `style` / `explode` / `allowEmptyValue` options read the
 * object itself; these keywords read that property's own text (`x-ids: 1,2,3` splits
 * on commas before the elements are coerced). They survive inside `$defs`, unlike a
 * generator option keyed by property name.
 *
 * Honoured by Zod, Valibot, Effect Schema and ArkType when the object is emitted with
 * `paramIn`. A no-op for TypeBox, Ajv and Yup, and when `paramIn` is unset.
 */
export type XExtParam = {
  /** The property's `style`. Defaults to the location's style when unset. */
  readonly 'x-style'?: ParamStyle
  /** The property's `explode`. Defaults to `true` for `style: form`, otherwise `false`. */
  readonly 'x-explode'?: boolean
  /** The property's `allowEmptyValue`: an empty value reads as an absent one. */
  readonly 'x-allowEmptyValue'?: boolean
}

/**
 * The `style` of an OpenAPI Parameter Object: how its text is serialised. Defaults to
 * `form` for `query` / `cookie` / `formData` and `simple` for `path` / `header`.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#style-values
 */
export type ParamStyle = (typeof PARAM_STYLES)[number]
