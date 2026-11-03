import * as z from 'zod'

export const Color = z.enum(['赤', '緑', '青'], {
  error: '色は赤・緑・青のいずれかで指定してください',
})

export type Color = z.infer<typeof Color>
