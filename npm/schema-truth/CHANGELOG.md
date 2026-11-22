# schema-truth

## 0.8.6

### Patch Changes

- [#34](https://github.com/nakita628/truth/pull/34) [`64fba0e`](https://github.com/nakita628/truth/commit/64fba0e31ae49d00afaeaeb9c7fe93fcad0d28ba) Thanks [@nakita628](https://github.com/nakita628)! - Zod: read an `integer` / `number` parameter from wire text with `z.preprocess` instead of a `z.string().regex(...)` pipe, so a JSON Schema converter that documents the input side (hono-openapi's `validator`) describes it as the spec's `integer` / `number` with its bounds again, not as a `string` with a `pattern`. The strict text check is unchanged.
