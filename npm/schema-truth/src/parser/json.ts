/**
 * A JSON value, as `enum`, `const`, `default` and `examples` carry one. A document read
 * from disk holds nothing else, so an `undefined` or a function never reaches a generator.
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | readonly JSONValue[]
  | { readonly [k: string]: JSONValue }
