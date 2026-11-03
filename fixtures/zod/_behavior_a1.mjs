import { zod } from '../../packages/schema-truth/src/generator/zod/zod.js'
import { valibot } from '../../packages/schema-truth/src/generator/valibot/valibot.js'
import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as z from 'zod'
import * as v from 'valibot'

const tmp = mkdtempSync(join(tmpdir(), 'a1-'))

const zodCode = zod({
  type: 'object',
  properties: { a: { type: 'string' } },
  required: ['a'],
  'x-properties-message': 'BAD_PROPS',
})
const zodFile = join(tmp, 'z.mjs')
writeFileSync(zodFile, `import * as z from 'zod'\nexport const S = ${zodCode}\n`)
const zMod = await import(zodFile)
const okZ = zMod.S.safeParse({ a: 'x' })
const badZ = zMod.S.safeParse({ a: 1 })
console.log('Zod x-properties-message:')
console.log('  valid({a:"x"}) success?', okZ.success)
console.log('  invalid({a:1}) success?', badZ.success, '— msg:', badZ.error?.issues?.[0]?.message)
console.log('  uses BAD_PROPS:', badZ.error?.issues?.some(i => i.message === 'BAD_PROPS'))

const zodItemsCode = zod({
  type: 'array',
  items: { type: 'string' },
  'x-items-message': 'BAD_ITEM',
})
const zArrFile = join(tmp, 'za.mjs')
writeFileSync(zArrFile, `import * as z from 'zod'\nexport const S = ${zodItemsCode}\n`)
const zArrMod = await import(zArrFile)
const badArr = zArrMod.S.safeParse(['x', 1, 'y'])
console.log('\nZod x-items-message:')
console.log('  invalid msg:', badArr.error?.issues?.[0]?.message)
console.log('  uses BAD_ITEM:', badArr.error?.issues?.some(i => i.message === 'BAD_ITEM'))

const zodPrefixCode = zod({
  type: 'array',
  prefixItems: [{ type: 'string' }, { type: 'number' }],
  'x-prefixItems-message': 'BAD_TUPLE',
})
const zPrefixFile = join(tmp, 'zp.mjs')
writeFileSync(zPrefixFile, `import * as z from 'zod'\nexport const S = ${zodPrefixCode}\n`)
const zPrefixMod = await import(zPrefixFile)
const badTuple = zPrefixMod.S.safeParse(['x', 'not-a-number'])
console.log('\nZod x-prefixItems-message:')
console.log('  invalid msg:', badTuple.error?.issues?.[0]?.message)
console.log('  uses BAD_TUPLE:', badTuple.error?.issues?.some(i => i.message === 'BAD_TUPLE'))

const valCode = valibot({
  type: 'object',
  properties: { a: { type: 'string' } },
  required: ['a'],
  'x-properties-message': 'BAD_PROPS',
})
const valFile = join(tmp, 'v.mjs')
writeFileSync(valFile, `import * as v from 'valibot'\nexport const S = ${valCode}\n`)
const vMod = await import(valFile)
const okV = v.safeParse(vMod.S, { a: 'x' })
const badV = v.safeParse(vMod.S, { a: 1 })
console.log('\nValibot x-properties-message:')
console.log('  valid({a:"x"}) success?', okV.success)
console.log('  invalid({a:1}) success?', badV.success, '— msg:', badV.issues?.[0]?.message)
console.log('  uses BAD_PROPS:', badV.issues?.some(i => i.message === 'BAD_PROPS'))
