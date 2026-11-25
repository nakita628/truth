---
'schema-truth': minor
'oas-truth': minor
---

A `discriminator` member that no `mapping` entry names now takes the values its own discriminator property is held to (`const` or `enum` strings) instead of its schema name, in every generator, and falls back to the schema name only when it has neither. This departs from the OpenAPI specification's implicit mapping on purpose: a document such as OpenAI's `CompoundFilter`, whose member declares `type: { enum: [eq, ne] }`, now validates as intended, and ArkType no longer throws at load.
