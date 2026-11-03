import * as z from 'zod'

export const MaybeString = z.string().nullable().default('unknown')

export type MaybeString = z.infer<typeof MaybeString>
