import { describe, expect, it } from 'vitest'
import { addDaysToDateString, getBusinessDate, getBusinessDayUtcRange } from '@/lib/dates'

describe('dates helpers', () => {
  it('calcula la fecha de negocio en Bogota', () => {
    const date = new Date('2026-03-24T01:30:00.000Z')
    expect(getBusinessDate(date)).toBe('2026-03-23')
  })

  it('arma ventanas UTC correctas para un dia de negocio', () => {
    expect(getBusinessDayUtcRange('2026-03-23')).toEqual({
      businessDate: '2026-03-23',
      start: '2026-03-23T05:00:00.000Z',
      end: '2026-03-24T05:00:00.000Z',
    })
  })

  it('suma dias sin depender de la zona horaria local', () => {
    expect(addDaysToDateString('2026-03-31', 1)).toBe('2026-04-01')
  })
})
