import { Type, type Static } from 'typebox'

export const FizzBuzzString = Type.Object({
  value: Type.Union([
    Type.Literal('1'),
    Type.Literal('2'),
    Type.Literal('Fizz'),
    Type.Literal('4'),
    Type.Literal('Buzz'),
    Type.Literal('Fizz'),
    Type.Literal('7'),
    Type.Literal('8'),
    Type.Literal('Fizz'),
    Type.Literal('Buzz'),
    Type.Literal('11'),
    Type.Literal('Fizz'),
    Type.Literal('13'),
    Type.Literal('14'),
    Type.Literal('FizzBuzz'),
    Type.Literal('16'),
    Type.Literal('17'),
    Type.Literal('Fizz'),
    Type.Literal('19'),
    Type.Literal('Buzz'),
  ]),
})
