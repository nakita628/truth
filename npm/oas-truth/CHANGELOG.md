# oas-truth

## 0.7.1

### Patch Changes

- [#32](https://github.com/nakita628/truth/pull/32) [`e1ec0c8`](https://github.com/nakita628/truth/commit/e1ec0c8ca6c53d2ae178eddcf0710f11e3065227) Thanks [@nakita628](https://github.com/nakita628)! - Annotate an Effect recursive declaration as `Schema.Codec<T, unknown>` instead of `Schema.Schema<T>`, so it decodes and passes to `Schema.toStandardSchemaV1` again, while a member that encodes differently (a property with a `default`) still type-checks.
