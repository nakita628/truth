import { type } from 'arktype'

export const Extended = type(type(type({ 'a?': 'string' })).and({ '[/^x-/]': 'string' })).and({
  '[/^(?!(?:a)$)(?![\\s\\S]*?(?:^x-))/]': 'never',
})

export type Extended = typeof Extended.infer
