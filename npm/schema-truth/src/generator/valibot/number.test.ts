import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { number, wireNumberMetadata } from './number.js'

describe('valibot number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'v.number()'],
    [{ type: 'number', minimum: 0 }, 'v.pipe(v.number(),v.minValue(0))'],
    [{ type: 'number', maximum: 100 }, 'v.pipe(v.number(),v.maxValue(100))'],
    [
      { type: 'number', minimum: 0, maximum: 100 },
      'v.pipe(v.number(),v.minValue(0),v.maxValue(100))',
    ],
    [{ type: 'number', multipleOf: 0.5 }, 'v.pipe(v.number(),v.multipleOf(0.5))'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number', 'x-error-message': 'Must be a number' }, 'v.number("Must be a number")'],
      [
        {
          type: 'number',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'v.pipe(v.number(),v.minValue(0,"Must be non-negative"))',
      ],
      [
        {
          type: 'number',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'v.pipe(v.number(),v.maxValue(100,"Must be at most 100"))',
      ],
      [
        {
          type: 'number',
          multipleOf: 0.5,
          'x-multipleOf-message': 'Must be a multiple of 0.5',
        },
        'v.pipe(v.number(),v.multipleOf(0.5,"Must be a multiple of 0.5"))',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Invalid number',
          'x-minimum-message': 'Too small',
          'x-maximum-message': 'Too large',
        },
        'v.pipe(v.number("Invalid number"),v.minValue(0,"Too small"),v.maxValue(100,"Too large"))',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})

describe('valibot number with both an inclusive and a numeric exclusive bound', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'number', minimum: 1, exclusiveMinimum: 5 },
      'v.pipe(v.number(),v.minValue(1),v.gtValue(5))',
    ],
    [
      { type: 'number', maximum: 10, exclusiveMaximum: 8 },
      'v.pipe(v.number(),v.maxValue(10),v.ltValue(8))',
    ],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })
})

describe('valibot wireNumberMetadata', () => {
  it.concurrent.each<[Parameters<typeof wireNumberMetadata>, string]>([
    [['integer', { type: 'integer' }], "v.metadata({type:'integer'})"],
    [
      ['integer', { type: 'integer', minimum: 1, maximum: 100 }],
      "v.metadata({type:'integer',minimum:1,maximum:100})",
    ],
    // An OpenAPI 3.0 boolean exclusive bound is written as the number draft-07 and 2020-12 use.
    [
      ['number', { type: 'number', minimum: 0, exclusiveMinimum: true, maximum: 1 }],
      "v.metadata({type:'number',exclusiveMinimum:0,maximum:1})",
    ],
    [
      ['number', { type: 'number', maximum: 1, exclusiveMaximum: true }],
      "v.metadata({type:'number',exclusiveMaximum:1})",
    ],
    [
      ['number', { type: 'number', minimum: 1, exclusiveMinimum: 5, exclusiveMaximum: 8 }],
      "v.metadata({type:'number',minimum:1,exclusiveMinimum:5,exclusiveMaximum:8})",
    ],
    [['number', { type: 'number', multipleOf: 0.5 }], "v.metadata({type:'number',multipleOf:0.5})"],
    // The range of a fixed-width format is documented, narrowed by the spec's own bound.
    [
      ['integer', { type: 'integer', format: 'int32', minimum: 0 }],
      "v.metadata({type:'integer',minimum:0,maximum:2147483647})",
    ],
    [
      ['number', { type: 'number', format: 'float' }],
      "v.metadata({type:'number',minimum:-3.4028234663852886e+38,maximum:3.4028234663852886e+38})",
    ],
    [['integer', {}, [1, -1]], "v.metadata({type:'integer',enum:[1,-1]})"],
  ])('wireNumberMetadata(%o) → %s', (args, expected) => {
    expect(wireNumberMetadata(...args)).toBe(expected)
  })

  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'number', minimum: 0 },
      "v.pipe(v.string(),v.regex(/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/),v.metadata({type:'number',minimum:0}),v.transform((input)=>Number(input)),v.number(),v.finite(),v.minValue(0))",
    ],
  ])('number(%o, { wire: true }) → %s', (input, expected) => {
    expect(number(input, { wire: true })).toBe(expected)
  })
})
