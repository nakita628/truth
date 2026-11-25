import { type } from 'arktype'

export const Schema = type({ 'a?': 'number', 'kind?': 'string' })
  .narrow((data) => !Object.hasOwn(data, 'a') || type({ 'b?': 'number' }).allows(data))
  .narrow((data) => !Object.hasOwn(data, 'constructor') || type({ 'c2?': 'number' }).allows(data))
  .narrow((data) =>
    ((__ifPassed) =>
      Object.keys(data).every(
        (key) =>
          ['a', 'kind'].includes(key) ||
          (__ifPassed && ['flag', 'x'].includes(key)) ||
          (!__ifPassed && ['y'].includes(key)) ||
          (Object.hasOwn(data, 'a') && ['b'].includes(key)) ||
          (Object.hasOwn(data, 'constructor') && ['c2'].includes(key)),
      ))(type({ kind: "'x'", 'flag?': 'true' }).allows(data)),
  )
  .narrow(
    (data) =>
      !type({ kind: "'x'", 'flag?': 'true' }).allows(data) || type({ 'x?': 'number' }).allows(data),
  )
  .narrow(
    (data) =>
      type({ kind: "'x'", 'flag?': 'true' }).allows(data) || type({ 'y?': 'number' }).allows(data),
  )

export type Schema = typeof Schema.infer
