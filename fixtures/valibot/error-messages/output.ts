import * as v from 'valibot'

export const User = v.object({
  name: v.pipe(
    v.string('Invalid name'),
    v.regex(/^[a-zA-Z]+$/, 'Only alphabetic characters'),
    v.minCodePoints(3, 'Name too short'),
    v.maxCodePoints(20, 'Name too long'),
  ),
  age: v.pipe(
    v.number('Invalid age'),
    v.integer('Invalid age'),
    v.minValue(0, 'Age must be positive'),
    v.maxValue(120, 'Age too large'),
    v.multipleOf(1, 'Age must be integer'),
  ),
  tags: v.pipe(
    v.array(v.string()),
    v.minLength(1, 'Need at least one tag'),
    v.maxLength(5, 'Too many tags'),
  ),
})

export type UserOutput = v.InferOutput<typeof User>
