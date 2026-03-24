import { describe, expect, it } from 'vitest'
import { isProbablyOfflineError } from '@/lib/offline/network'

describe('isProbablyOfflineError', () => {
  it('detecta errores tipicos de fetch sin conexion', () => {
    expect(isProbablyOfflineError(new Error('Failed to fetch'))).toBe(true)
    expect(isProbablyOfflineError(new Error('Network request failed'))).toBe(true)
    expect(isProbablyOfflineError(new Error('Load failed'))).toBe(true)
  })

  it('no trata errores de negocio como offline', () => {
    expect(isProbablyOfflineError(new Error('JWT expired'))).toBe(false)
    expect(isProbablyOfflineError(new Error('Permiso denegado'))).toBe(false)
  })
})
