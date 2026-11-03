import { hasFixedLength } from '../../guard/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts, typeboxRefOpt } from '../../helper/meta.js'
import { patternSource } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'

const FORMAT_MAP: { readonly [k: string]: string } = {
  email: 'email',
  uuid: 'uuid',
  uri: 'uri',
  ipv4: 'ipv4',
  ipv6: 'ipv6',
  'date-time': 'date-time',
  date: 'date',
  time: 'time',
}

function escapeRegex(s: string) {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function string(schema: JSONSchema, ref?: string) {
  // ajv-errors `errorMessage` accepts two shapes:
  //   - string  → used as a single message for any validation failure
  //   - object  → per-keyword messages keyed by JSON Schema keyword
  // When only `x-error-message` is set we emit the string form (the
  // common case). Per-keyword messages flip us into object form, with
  // `x-error-message` joining as the catch-all under the ajv-errors `_`
  // convention.
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const patternMessage = schema['x-pattern-message']
  const minLengthMessage = schema['x-minLength-message']
  const maxLengthMessage = schema['x-maxLength-message']
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (patternMessage) perKeywordEntries.push(`pattern:${JSON.stringify(patternMessage)}`)
  if (minLengthMessage) perKeywordEntries.push(`minLength:${JSON.stringify(minLengthMessage)}`)
  if (maxLengthMessage) perKeywordEntries.push(`maxLength:${JSON.stringify(maxLengthMessage)}`)
  const errorMessageField =
    perKeywordEntries.length === 0
      ? errorMessage
        ? `errorMessage:${JSON.stringify(errorMessage)}`
        : undefined
      : `errorMessage:{${perKeywordEntries.join(',')}${
          errorMessage ? `,_:${JSON.stringify(errorMessage)}` : ''
        }}`

  const isFixedLength = hasFixedLength(schema)

  // Content-check extensions emit as `pattern` annotation (ajv runtime check).
  // When the schema's own `pattern` is set, that wins (existing behavior);
  // x-startsWith/x-endsWith/x-includes are ignored to avoid silent regex
  // override.
  const contentPattern = (() => {
    if (schema.pattern) return undefined
    const parts: string[] = []
    if (typeof schema['x-startsWith'] === 'string') {
      parts.push(`^${escapeRegex(schema['x-startsWith'])}`)
    }
    if (typeof schema['x-endsWith'] === 'string') {
      parts.push(`${escapeRegex(schema['x-endsWith'])}$`)
    }
    if (typeof schema['x-includes'] === 'string') {
      parts.push(escapeRegex(schema['x-includes']))
    }
    return parts.length > 0 ? parts.join('|') : undefined
  })()

  const opts = [
    ...typeboxRefOpt(ref),
    schema.format && FORMAT_MAP[schema.format]
      ? `format:${JSON.stringify(FORMAT_MAP[schema.format])}`
      : undefined,
    schema.pattern
      ? `pattern:${JSON.stringify(patternSource(schema.pattern))}`
      : contentPattern
        ? `pattern:${JSON.stringify(contentPattern)}`
        : undefined,
    isFixedLength ? `minLength:${schema.minLength}` : undefined,
    isFixedLength ? `maxLength:${schema.maxLength}` : undefined,
    !isFixedLength && schema.minLength !== undefined ? `minLength:${schema.minLength}` : undefined,
    !isFixedLength && schema.maxLength !== undefined ? `maxLength:${schema.maxLength}` : undefined,
    errorMessageField,
    ...typeboxMetaOpts(schema),
    ...typeboxDefaultOpt(schema),
  ].filter((v) => v !== undefined)

  const stringExpr = opts.length > 0 ? `Type.String({${opts.join(',')}})` : 'Type.String()'

  // String pre-validation transforms via Codec.Decode.Encode.
  const transforms: string[] = []
  if (schema['x-trim'] === true) transforms.push('.trim()')
  if (schema['x-toLowerCase'] === true) transforms.push('.toLowerCase()')
  if (schema['x-toUpperCase'] === true) transforms.push('.toUpperCase()')
  if (typeof schema['x-normalize'] === 'string') {
    transforms.push(`.normalize(${JSON.stringify(schema['x-normalize'])})`)
  }
  if (transforms.length > 0) {
    return `Codec(${stringExpr}).Decode((value: string) => value${transforms.join('')}).Encode((value: string) => value)`
  }
  return stringExpr
}
