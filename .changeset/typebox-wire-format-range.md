---
'schema-truth': patch
---

Check the range of an `int32`, `uint32`, `float` or `float32` format on the TypeBox wire of a text-slot parameter, so `?n=3000000000` no longer passes an `int32` parameter. As with `z.float32()`, the `float32` bound is the double nearest its largest value, so text such as `3.4028235E38` is rejected. An empty `x-error-message` no longer empties the wire's range messages.
