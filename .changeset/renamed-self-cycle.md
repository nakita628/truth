---
'oas-truth': patch
---

Zod, Valibot and Effect: a self-recursive component renamed by an identifier collision (`FooBar` beside `foo-bar` becomes `FooBar2`) now gets a cyclic type that refers to itself (`type FooBar2Type={child?:FooBar2Type}`). It used to read its own renamed `$ref` as another schema, which gave `z.infer<typeof FooBar2Schema>` (TS2502), or the wrong schema when a `FooBar2` key also existed.
