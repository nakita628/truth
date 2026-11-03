import * as z from 'zod'

export const Formats = z.object({
  id: z
    .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
    .transform((val) => BigInt(val))
    .pipe(z.int64().min(0n))
    .exactOptional(),
  size: z
    .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
    .transform((val) => BigInt(val))
    .pipe(z.uint64())
    .exactOptional(),
  kind: z
    .union([z.bigint(), z.number().int(), z.string().regex(/^-?\d+$/)])
    .transform((val) => BigInt(val))
    .pipe(z.union([z.literal(1n), z.literal(2n)]))
    .exactOptional(),
  at: z.iso.datetime({ offset: true }).exactOptional(),
  time: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/)
    .exactOptional(),
  guid: z.guid().exactOptional(),
  site: z.httpUrl().exactOptional(),
  card: z
    .string()
    .regex(/^\d{12,19}$/)
    .refine((val) => {
      let sum = 0
      for (let i = 0; i < val.length; i++) {
        let digit = Number(val[val.length - 1 - i])
        if (i % 2 === 1) {
          digit *= 2
          if (digit > 9) digit -= 9
        }
        sum += digit
      }
      return sum % 10 === 0
    })
    .exactOptional(),
  iban: z
    .string()
    .regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/)
    .refine((val) => {
      let rest = 0
      for (const char of val.slice(4) + val.slice(0, 4)) {
        const n = Number.parseInt(char, 36)
        rest = (n > 9 ? rest * 100 + n : rest * 10 + n) % 97
      }
      return rest === 1
    })
    .exactOptional(),
  currency: z
    .string()
    .regex(
      /^(?:AED|AFN|ALL|AMD|ANG|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BGN|BHD|BIF|BMD|BND|BOB|BOV|BRL|BSD|BTN|BWP|BYN|BZD|CAD|CDF|CHE|CHF|CHW|CLF|CLP|CNY|COP|COU|CRC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MXV|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLE|SOS|SRD|SSP|STN|SVC|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|USN|UYI|UYU|UYW|UZS|VED|VES|VND|VUV|WST|XAF|XAG|XAU|XBA|XBB|XBC|XBD|XCD|XCG|XDR|XOF|XPD|XPF|XPT|XSU|XTS|XUA|XXX|YER|ZAR|ZMW|ZWG)$/,
    )
    .exactOptional(),
  slug: z.string().trim().exactOptional(),
  email: z.string().trim().pipe(z.email()).exactOptional(),
})

export type Formats = z.infer<typeof Formats>
