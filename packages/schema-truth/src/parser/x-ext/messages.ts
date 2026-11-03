// Vendor extensions for custom validation messages (OpenAPI Generator compatible).
// Per-slot precedence: x-<keyword>-message > x-error-message > validator default.
export type XExtMessages = {
  readonly 'x-error-message'?: string
  readonly 'x-length-message'?: string
  readonly 'x-pattern-message'?: string // string `pattern` only
  readonly 'x-minimum-message'?: string // numeric `minimum` (inclusive) only
  readonly 'x-maximum-message'?: string // numeric `maximum` (inclusive) only
  readonly 'x-exclusiveMinimum-message'?: string // numeric `exclusiveMinimum` (>)
  readonly 'x-exclusiveMaximum-message'?: string // numeric `exclusiveMaximum` (<)
  readonly 'x-multipleOf-message'?: string
  readonly 'x-dependentRequired-message'?: string
  /**
   * Overrides the validation message for `dependentSchemas` violations
   * (JSON Schema 2020-12 §10.2.2.4). The inner sub-schema's `code` / `path`
   * / `expected` are preserved; only `message` is replaced. Falls back to
   * `x-error-message`.
   */
  readonly 'x-dependentSchemas-message'?: string
  readonly 'x-propertyNames-message'?: string
  readonly 'x-allOf-message'?: string
  readonly 'x-anyOf-message'?: string
  readonly 'x-oneOf-message'?: string
  readonly 'x-not-message'?: string
  /**
   * Semantic alias for the implication pattern (`A → B`) encoded as
   * `anyOf:[{not:A},{required:B}]`. Takes precedence over `x-anyOf-message`
   * in the anyOf code path, then falls back to `x-error-message`. Acts as a
   * documentation aid — explicitly marking the schema author's intent — and
   * is silently ignored on schemas without `anyOf`.
   */
  readonly 'x-implication-message'?: string
  readonly 'x-required-message'?: string
  readonly 'x-additionalProperties-message'?: string
  readonly 'x-uniqueItems-message'?: string
  readonly 'x-const-message'?: string
  readonly 'x-enum-message'?: string
  readonly 'x-minLength-message'?: string // string minLength
  readonly 'x-maxLength-message'?: string // string maxLength
  readonly 'x-minItems-message'?: string // array minItems
  readonly 'x-maxItems-message'?: string // array maxItems
  readonly 'x-minProperties-message'?: string // object minProperties
  readonly 'x-maxProperties-message'?: string // object maxProperties
  readonly 'x-patternProperties-message'?: string // object patternProperties
  readonly 'x-contains-message'?: string // array contains (type-match presence)
  readonly 'x-minContains-message'?: string // array minContains (count lower bound)
  readonly 'x-maxContains-message'?: string // array maxContains (count upper bound)
  readonly 'x-properties-message'?: string // failed per-property validation in a typeless object
  readonly 'x-prefixItems-message'?: string // failed tuple position validation
  readonly 'x-items-message'?: string // failed trailing items validation (incl. `items: false`)
  readonly 'x-unevaluatedProperties-message'?: string // unevaluatedProperties violation
  readonly 'x-unevaluatedItems-message'?: string // unevaluatedItems violation
  readonly 'x-if-message'?: string // failed `then`/`else` branch under `if` (shared fallback)
  readonly 'x-then-message'?: string // failed `then` branch (overrides x-if-message for then)
  readonly 'x-else-message'?: string // failed `else` branch (overrides x-if-message for else)
}
