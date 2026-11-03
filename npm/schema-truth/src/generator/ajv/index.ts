import { sanitizeSchema } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { ajv } from './ajv.js'

/**
 * Convert a JSON Schema document to Ajv TypeScript: a reconstructed draft-07
 * schema object and `ajv.compile(...)`.
 *
 * First slice: `object` / `string` / `number` / `integer`, `format: email`
 * and `minimum`. Unsupported keywords, combinators, `$ref`, `$defs`, cycles,
 * JTD and `x-*` extensions are silent no-ops. `--export-type` /
 * `JSONSchemaType<T>` is out of scope and ignored.
 *
 * `addFormats(ajv)` is emitted only when a `format` this slice understands
 * appears — Ajv's default class throws on unknown formats unless `strict` is
 * off.
 *
 * @param schema - JSON Schema object to convert
 * @param options - Accepted for CLI compatibility; `exportType` and `readonly` are ignored
 * @returns Generated TypeScript/Ajv code string
 */
export function schemaToAjv(
  schema: JSONSchema,
  options?: { exportType?: boolean; readonly?: boolean },
): string {
  void options
  const expression = ajv(sanitizeSchema(schema))
  const withFormats = expression.includes("format:'email'")
  const importBlock = withFormats
    ? `import Ajv from 'ajv'\nimport addFormats from 'ajv-formats'`
    : `import Ajv from 'ajv'`
  const setupBlock = withFormats
    ? `const ajv = new Ajv()\naddFormats(ajv)`
    : `const ajv = new Ajv()`
  return [
    importBlock,
    setupBlock,
    `export const schema = ${expression}`,
    `export const validate = ajv.compile(schema)`,
  ].join('\n\n')
}
