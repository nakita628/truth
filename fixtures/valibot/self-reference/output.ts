import * as v from 'valibot'

type _Schema = { children?: v.InferOutput<typeof Schema>[] }

export const Schema: v.GenericSchema<unknown, _Schema> = v.partial(
  v.object({ children: v.array(v.lazy(() => Schema)) }),
)

export type SchemaOutput = v.InferOutput<typeof Schema>
