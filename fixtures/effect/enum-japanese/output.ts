import { Schema } from 'effect'

export const Season = Schema.Literals(['春', '夏', '秋', '冬'])

export type Season = typeof Season.Type
