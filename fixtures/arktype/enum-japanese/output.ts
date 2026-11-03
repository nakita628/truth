import { type } from 'arktype'

export const Color = type("'赤' | '緑' | '青'").describe(
  '色は赤・緑・青のいずれかで指定してください',
)

export type Color = typeof Color.infer
