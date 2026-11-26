---
'oas-truth': minor
---

An inline schema (a media type, a parameter or header given by `schema`, or the content of a request body, response, callback or path item) now pins a discriminator's unmapped members to their own `const` / `enum` values, as `components.schemas` declarations already do. `makeSchemaReplacements` takes the document's `components.schemas` as a new `schemas` option for this.
