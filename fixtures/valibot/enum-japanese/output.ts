import * as v from 'valibot'

export const Color = v.picklist(['赤', '緑', '青'], '色は赤・緑・青のいずれかです')

export type ColorOutput = v.InferOutput<typeof Color>
