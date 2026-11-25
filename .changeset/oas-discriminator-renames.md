---
'oas-truth': patch
---

Keep a discriminator right across component identifier collisions: an unmapped member renamed by a collision (`FooBar2`) takes its schema key as its implicit value, and `mapping` targets follow the rename. A `$ref` beside a discriminated `oneOf` inside a `$ref` cycle is localized like any other node, and an ArkType cyclic file imports `type` only when its code calls it.
