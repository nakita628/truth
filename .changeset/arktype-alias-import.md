---
'oas-truth': minor
---

ArkType: a non-cyclic split file now imports `type` only when its code calls it. A file that calls neither `type` nor `scope`, such as a `$ref` alias (`export const FooSchema=BarSchema`), gets no `arktype` import. It used to always import `type`, which failed `noUnusedLocals` (TS6133). Breaking for hosts: `SchemaDeclaration.importLine`, `schemaImportLine` and the ArkType adapter's `renderImport` can now return `''`. A host that writes split files should leave the line and its blank-line separator out when it is empty, and should not reuse one declaration's line for others.
