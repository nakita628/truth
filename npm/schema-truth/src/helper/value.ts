/**
 * A JSON value as the TypeScript literal that reproduces it.
 *
 * `JSON.stringify` already answers for strings, arrays and objects; booleans and numbers
 * go through template interpolation so `-0`, `1e21` and friends keep the spelling the
 * source had rather than picking up quotes.
 */
export function jsLiteral(value: unknown): string {
  if (typeof value === 'boolean') return `${value}`
  if (typeof value === 'number') return `${value}`
  return JSON.stringify(value)
}

/**
 * A JS expression that is true when `subject` is deep-equal to the JSON `value`, as JSON
 * Schema's `const` and `enum` compare: an object regardless of its key order, an array
 * item by item. Written out for the value, so the generated code needs no helper; an
 * object's members are read with `Reflect.get`, which takes an `object` as it narrows.
 */
export function deepEqualExpression(value: unknown, subject: string): string {
  if (Array.isArray(value)) {
    return [
      `Array.isArray(${subject})`,
      `${subject}.length===${value.length}`,
      ...value.map((item, i) => deepEqualExpression(item, `${subject}[${i}]`)),
    ].join('&&')
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    return [
      `typeof ${subject}==='object'`,
      `${subject}!==null`,
      `!Array.isArray(${subject})`,
      `Object.keys(${subject}).length===${entries.length}`,
      ...entries.flatMap(([key, member]) => {
        const k = JSON.stringify(key)
        return [
          `Object.hasOwn(${subject},${k})`,
          deepEqualExpression(member, `Reflect.get(${subject},${k})`),
        ]
      }),
    ].join('&&')
  }
  return `${subject}===${value === null ? 'null' : jsLiteral(value)}`
}
