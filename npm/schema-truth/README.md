# Schema Truth

**[schema-truth](https://www.npmjs.com/package/schema-truth)** generates type-safe validation schemas from a [JSON Schema](https://json-schema.org/) or [OpenAPI](https://www.openapis.org/) document — one CLI per target library, each written in that library's own idiom.

## Installation

```bash
npm install -D schema-truth
```

## Usage

One binary per target library, each taking the same arguments:

```bash
npx schema-truth-zod path/to/input.{json,yaml} -o path/to/output.ts
npx schema-truth-valibot path/to/input.{json,yaml} -o path/to/output.ts
npx schema-truth-effect path/to/input.{json,yaml} -o path/to/output.ts
npx schema-truth-typebox path/to/input.{json,yaml} -o path/to/output.ts
npx schema-truth-arktype path/to/input.{json,yaml} -o path/to/output.ts
npx schema-truth-ajv path/to/input.{json,yaml} -o path/to/output.ts
npx schema-truth-yup path/to/input.{json,yaml} -o path/to/output.ts
```

| Flag             | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `--output`, `-o` | TypeScript file the generated schema is written to      |
| `--export-type`  | Also export the type inferred from the generated schema |
| `--readonly`     | Generate readonly types                                 |

Run a command with `--help` for the full list.

## Example

input:

```json
{
  "title": "User",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name", "email"]
}
```

output:

### [Zod](https://zod.dev/)

```ts
import * as z from 'zod'

export const User = z.object({
  name: z.string(),
  email: z.email(),
  age: z.int().min(0).exactOptional(),
})
```

### [Valibot](https://valibot.dev/)

```ts
import * as v from 'valibot'

export const User = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})
```

### [Effect Schema](https://effect.website/docs/v4/schema/introduction)

```ts
import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  email: Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  age: Schema.optionalKey(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
})
```

### [TypeBox](https://github.com/sinclairzx81/typebox)

```ts
import { Type, type Static } from 'typebox'

export const User = Type.Object({
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0 })),
})
```

### [ArkType](https://arktype.io/)

```ts
import { type } from 'arktype'

export const User = type({ name: 'string', email: 'string.email', 'age?': 'number.integer >= 0' })
```

### [Ajv](https://ajv.js.org/)

```ts
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)

export const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 0 },
  },
  required: ['name', 'email'],
}

export const validate = ajv.compile(schema)
```

### [Yup](https://github.com/jquense/yup)

```ts
import * as yup from 'yup'

export const User = yup.object({
  name: yup.string().required(),
  email: yup.string().email().required(),
  age: yup.number().integer().min(0),
})
```

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/truth/blob/main/LICENSE) for more information.
