import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'z.string()'],
    [{ type: 'string', minLength: 1, maxLength: 10 }, 'z.string().min(1).max(10)'],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'z.string().length(5)'],
    [{ type: 'string', pattern: '^\\w+$' }, 'z.string().regex(/^\\w+$/)'],
    [{ type: 'string', pattern: '^\\p{L}+$' }, 'z.string().regex(/^\\p{L}+$/u)'],
    [{ type: 'string', pattern: '\\P{N}' }, 'z.string().regex(/\\P{N}/u)'],
    [{ type: 'string', pattern: '\\u{1F600}' }, 'z.string().regex(/\\u{1F600}/u)'],
    [{ type: 'string', format: 'email' }, 'z.email()'],
    [{ type: 'string', format: 'uuid' }, 'z.uuid()'],
    [{ type: 'string', format: 'uuidv4' }, 'z.uuidv4()'],
    [{ type: 'string', format: 'uuidv7' }, 'z.uuidv7()'],
    [{ type: 'string', format: 'uri' }, 'z.url()'],
    [{ type: 'string', format: 'emoji' }, 'z.emoji()'],
    [{ type: 'string', format: 'base64' }, 'z.base64()'],
    [{ type: 'string', format: 'nanoid' }, 'z.nanoid()'],
    [{ type: 'string', format: 'cuid' }, 'z.cuid()'],
    [{ type: 'string', format: 'cuid2' }, 'z.cuid2()'],
    [{ type: 'string', format: 'ulid' }, 'z.ulid()'],
    [{ type: 'string', format: 'ipv4' }, 'z.ipv4()'],
    [{ type: 'string', format: 'ipv6' }, 'z.ipv6()'],
    [{ type: 'string', format: 'mac' }, 'z.mac()'],
    [{ type: 'string', format: 'cidrv4' }, 'z.cidrv4()'],
    [{ type: 'string', format: 'cidrv6' }, 'z.cidrv6()'],
    [{ type: 'string', format: 'date' }, 'z.iso.date()'],
    [
      { type: 'string', format: 'time' },
      String.raw`z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)`,
    ],
    [
      { type: 'string', format: 'time', 'x-isoPrecision': 0 },
      String.raw`z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)`,
    ],
    [
      { type: 'string', format: 'time', 'x-isoPrecision': -1 },
      String.raw`z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)`,
    ],
    [
      { type: 'string', format: 'time', 'x-isoPrecision': 3 },
      String.raw`z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)`,
    ],
    [{ type: 'string', format: 'time', 'x-isoOffset': false }, 'z.iso.time()'],
    [
      { type: 'string', format: 'time', 'x-isoOffset': false, 'x-isoPrecision': 0 },
      'z.iso.time({precision:0})',
    ],
    [{ type: 'string', format: 'date-time' }, 'z.iso.datetime({offset:true})'],
    [{ type: 'string', format: 'date-time', 'x-isoOffset': false }, 'z.iso.datetime()'],
    [{ type: 'string', format: 'guid' }, 'z.guid()'],
    [{ type: 'string', format: 'url' }, 'z.url()'],
    [{ type: 'string', format: 'httpUrl' }, 'z.httpUrl()'],
    [{ type: 'string', format: 'httpurl' }, 'z.httpUrl()'],
    [{ type: 'string', format: 'hostname' }, 'z.hostname()'],
    [{ type: 'string', format: 'hex' }, 'z.hex()'],
    [{ type: 'string', format: 'e164' }, 'z.e164()'],
    [{ type: 'string', format: 'ksuid' }, 'z.ksuid()'],
    [{ type: 'string', format: 'xid' }, 'z.xid()'],
    [
      { type: 'string', format: 'creditCard' },
      String.raw`z.string().regex(/^\d{12,19}$/).refine((val)=>{let sum=0;for(let i=0;i<val.length;i++){let digit=Number(val[val.length-1-i]);if(i%2===1){digit*=2;if(digit>9)digit-=9}sum+=digit}return sum%10===0})`,
    ],
    [
      { type: 'string', format: 'creditcard', 'x-error-message': 'bad card' },
      String.raw`z.string({error:"bad card"}).regex(/^\d{12,19}$/,{error:"bad card"}).refine((val)=>{let sum=0;for(let i=0;i<val.length;i++){let digit=Number(val[val.length-1-i]);if(i%2===1){digit*=2;if(digit>9)digit-=9}sum+=digit}return sum%10===0},{error:"bad card"})`,
    ],
    [
      { type: 'string', format: 'iban' },
      String.raw`z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/).refine((val)=>{let rest=0;for(const char of val.slice(4)+val.slice(0,4)){const n=Number.parseInt(char,36);rest=(n>9?rest*100+n:rest*10+n)%97}return rest===1})`,
    ],
    [{ type: 'string', format: 'duration' }, 'z.iso.duration()'],
    [{ type: 'string', format: 'binary' }, 'z.file()'],
    [{ type: 'string', format: 'toLowerCase' }, 'z.string().toLowerCase()'],
    [{ type: 'string', format: 'toUpperCase' }, 'z.string().toUpperCase()'],
    [{ type: 'string', format: 'trim' }, 'z.string().trim()'],
    [{ type: 'string', format: 'trim', 'x-trim': true }, 'z.string().trim()'],
    [{ type: 'string', format: 'trim', maxLength: 3 }, 'z.string().trim().max(3)'],
    [{ type: 'string', format: 'jwt' }, 'z.jwt()'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'z.string({error:"Name is required"})',
      ],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'z.email({error:"Invalid email"})',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'z.string().regex(/^[a-z]+$/,{error:"Only lowercase letters"})',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minLength-message': 'Min 3 chars',
          'x-maxLength-message': 'Max 20 chars',
        },
        'z.string().min(3,{error:"Min 3 chars"}).max(20,{error:"Max 20 chars"})',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-minLength-message': 'Must be exactly 10 characters',
          'x-maxLength-message': 'Must be exactly 10 characters',
        },
        'z.string().length(10,{error:"Must be exactly 10 characters"})',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('format-specific options', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', format: 'email', 'x-emailPattern': 'html5' },
        'z.email({pattern:z.regexes.html5Email})',
      ],
      [
        { type: 'string', format: 'email', 'x-emailPattern': 'browser' },
        'z.email({pattern:z.regexes.browserEmail})',
      ],
      [
        { type: 'string', format: 'email', 'x-emailPattern': 'unicode' },
        'z.email({pattern:z.regexes.unicodeEmail})',
      ],
      [
        { type: 'string', format: 'email', 'x-emailRegex': '^[a-z]+@example\\.com$' },
        'z.email({pattern:/^[a-z]+@example\\.com$/})',
      ],
      // Unicode property escapes require the `u` flag (TS1530); a bare `/` stays escaped.
      [
        { type: 'string', format: 'email', 'x-emailRegex': '^\\p{L}+@\\p{L}+$' },
        'z.email({pattern:/^\\p{L}+@\\p{L}+$/u})',
      ],
      [
        { type: 'string', format: 'email', 'x-emailRegex': '\\p{L}/\\p{L}' },
        'z.email({pattern:/\\p{L}\\/\\p{L}/u})',
      ],
      [
        {
          type: 'string',
          format: 'email',
          'x-emailPattern': 'html5',
          'x-error-message': 'Invalid email',
        },
        'z.email({pattern:z.regexes.html5Email,error:"Invalid email"})',
      ],
      [{ type: 'string', format: 'uuid', 'x-uuidVersion': 'v7' }, 'z.uuid({version:"v7"})'],
      [{ type: 'string', format: 'uuid', 'x-uuidVersion': 'v4' }, 'z.uuid({version:"v4"})'],
      [
        { type: 'string', format: 'uri', 'x-urlProtocol': '^https$' },
        'z.url({protocol:/^https$/})',
      ],
      [
        { type: 'string', format: 'uri', 'x-urlHostname': '^[a-z.]+$' },
        'z.url({hostname:/^[a-z.]+$/})',
      ],
      [
        { type: 'string', format: 'uri', 'x-urlProtocol': '^\\p{L}+$' },
        'z.url({protocol:/^\\p{L}+$/u})',
      ],
      [
        { type: 'string', format: 'uri', 'x-urlHostname': '\\p{L}+\\.\\p{L}+' },
        'z.url({hostname:/\\p{L}+\\.\\p{L}+/u})',
      ],
      [{ type: 'string', format: 'uri', 'x-urlNormalize': true }, 'z.url({normalize:true})'],
      [{ type: 'string', format: 'uri', 'x-urlNormalize': false }, 'z.url({normalize:false})'],
      [
        {
          type: 'string',
          format: 'uri',
          'x-urlProtocol': '^https$',
          'x-urlNormalize': true,
        },
        'z.url({protocol:/^https$/,normalize:true})',
      ],
      [
        { type: 'string', format: 'date-time', 'x-isoPrecision': 3 },
        'z.iso.datetime({precision:3,offset:true})',
      ],
      [
        { type: 'string', format: 'date-time', 'x-isoOffset': true },
        'z.iso.datetime({offset:true})',
      ],
      [
        { type: 'string', format: 'date-time', 'x-isoLocal': true },
        'z.iso.datetime({offset:true,local:true})',
      ],
      [
        {
          type: 'string',
          format: 'date-time',
          'x-isoPrecision': 3,
          'x-isoOffset': true,
          'x-isoLocal': false,
        },
        'z.iso.datetime({precision:3,offset:true,local:false})',
      ],
      [{ type: 'string', format: 'jwt', 'x-jwtAlg': 'HS256' }, 'z.jwt({alg:"HS256"})'],
      [
        {
          type: 'string',
          format: 'jwt',
          'x-jwtAlg': 'HS256',
          'x-error-message': 'Invalid token',
        },
        'z.jwt({alg:"HS256",error:"Invalid token"})',
      ],
      [{ type: 'string', format: 'mac', 'x-macDelimiter': ':' }, 'z.mac({delimiter:":"})'],
      [{ type: 'string', format: 'mac', 'x-macDelimiter': '-' }, 'z.mac({delimiter:"-"})'],
      [
        {
          type: 'string',
          format: 'mac',
          'x-macDelimiter': ':',
          'x-error-message': 'Invalid MAC',
        },
        'z.mac({delimiter:":",error:"Invalid MAC"})',
      ],
      [{ type: 'string', format: 'hash', 'x-hashAlg': 'sha256' }, 'z.hash("sha256")'],
      [{ type: 'string', format: 'hash', 'x-hashAlg': 'md5' }, 'z.hash("md5")'],
      [
        { type: 'string', format: 'hash', 'x-hashAlg': 'sha256', 'x-hashEnc': 'hex' },
        'z.hash("sha256",{enc:"hex"})',
      ],
      [
        { type: 'string', format: 'hash', 'x-hashAlg': 'sha512', 'x-hashEnc': 'base64url' },
        'z.hash("sha512",{enc:"base64url"})',
      ],
      [
        {
          type: 'string',
          format: 'hash',
          'x-hashAlg': 'sha256',
          'x-hashEnc': 'hex',
          'x-error-message': 'Invalid digest',
        },
        'z.hash("sha256",{enc:"hex",error:"Invalid digest"})',
      ],
      [{ type: 'string', format: 'hash' }, 'z.string()'],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('declarative behavior extensions', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string', 'x-trim': true }, 'z.string().trim()'],
      [{ type: 'string', 'x-toLowerCase': true }, 'z.string().toLowerCase()'],
      [{ type: 'string', 'x-toUpperCase': true }, 'z.string().toUpperCase()'],
      [{ type: 'string', 'x-normalize': 'NFC' }, 'z.string().normalize("NFC")'],
      [{ type: 'string', 'x-normalize': 'NFKC' }, 'z.string().normalize("NFKC")'],
      [{ type: 'string', 'x-startsWith': 'https://' }, 'z.string().startsWith("https://")'],
      [{ type: 'string', 'x-endsWith': '.com' }, 'z.string().endsWith(".com")'],
      [{ type: 'string', 'x-includes': '/api/' }, 'z.string().includes("/api/")'],
      [
        { type: 'string', 'x-trim': true, 'x-toLowerCase': true },
        'z.string().trim().toLowerCase()',
      ],
      [
        { type: 'string', format: 'email', 'x-toLowerCase': true },
        'z.string().toLowerCase().pipe(z.email())',
      ],
      [{ type: 'string', format: 'email', 'x-trim': true }, 'z.string().trim().pipe(z.email())'],
      [
        { type: 'string', format: 'email', 'x-trim': true, maxLength: 64 },
        'z.string().trim().pipe(z.email().max(64))',
      ],
      [
        { type: 'string', format: 'uuid', 'x-trim': true, 'x-error-message': 'bad id' },
        'z.string({error:"bad id"}).trim().pipe(z.uuid({error:"bad id"}))',
      ],
      [
        { type: 'string', format: 'time', 'x-trim': true },
        String.raw`z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)`,
      ],
      [
        { type: 'string', 'x-startsWith': 'https://', 'x-endsWith': '.com' },
        'z.string().startsWith("https://").endsWith(".com")',
      ],
      [{ type: 'string', 'x-lowercase': true }, 'z.string().lowercase()'],
      [{ type: 'string', 'x-uppercase': true }, 'z.string().uppercase()'],
      [
        { type: 'string', 'x-toLowerCase': true, 'x-lowercase': true },
        'z.string().toLowerCase().lowercase()',
      ],
      [
        { type: 'string', 'x-toUpperCase': true, 'x-uppercase': true },
        'z.string().toUpperCase().uppercase()',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('x-stringbool', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string', 'x-stringbool': true }, 'z.stringbool()'],
      [{ type: 'string', 'x-stringbool': {} }, 'z.stringbool()'],
      [
        { type: 'string', 'x-stringbool': true, 'x-error-message': 'Must be "true" or "false"' },
        'z.stringbool({error:"Must be \\"true\\" or \\"false\\""})',
      ],
      [
        { type: 'string', 'x-stringbool': { truthy: ['yes'], falsy: ['no'] } },
        'z.stringbool({truthy:["yes"],falsy:["no"]})',
      ],
      [
        { type: 'string', 'x-stringbool': { case: 'sensitive' } },
        'z.stringbool({case:"sensitive"})',
      ],
      [
        { type: 'string', 'x-stringbool': { case: 'insensitive' } },
        'z.stringbool({case:"insensitive"})',
      ],
      [
        {
          type: 'string',
          'x-stringbool': {
            truthy: ['yes', 'y'],
            falsy: ['no', 'n'],
            case: 'sensitive',
            error: 'bad flag',
          },
        },
        'z.stringbool({truthy:["yes","y"],falsy:["no","n"],case:"sensitive",error:"bad flag"})',
      ],
      [
        {
          type: 'string',
          'x-stringbool': { error: 'inner wins' },
          'x-error-message': 'outer loses',
        },
        'z.stringbool({error:"inner wins"})',
      ],
      [
        { type: 'string', 'x-stringbool': true, 'x-coerce': true, format: 'email' },
        'z.stringbool()',
      ],
      [
        { type: 'string', 'x-stringbool': true, minLength: 1, maxLength: 10, pattern: '^a$' },
        'z.stringbool()',
      ],
      [{ type: 'string', 'x-stringbool': false }, 'z.string()'],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })
})
