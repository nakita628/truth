import { type } from 'arktype'

export const Vehicle = type({ type: "'car' | 'truck'" })
  .narrow(
    (data) =>
      !type({ 'type?': "'truck'" }).allows(data) ||
      type({ cargoCapacity: 'number >= 0' }).allows(data),
  )
  .narrow(
    (data) =>
      type({ 'type?': "'truck'" }).allows(data) ||
      type({ passengerCount: 'number.integer >= 1' }).allows(data),
  )
