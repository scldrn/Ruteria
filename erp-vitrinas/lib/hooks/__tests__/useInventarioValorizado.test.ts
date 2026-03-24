import { describe, expect, it } from 'vitest'
import { calcularResumenInventarioValorizado } from '../useInventarioValorizado'

describe('calcularResumenInventarioValorizado', () => {
  it('suma unidades, costo, venta y margen de multiples ubicaciones', () => {
    const resumen = calcularResumenInventarioValorizado([
      {
        ubicacion_tipo: 'central',
        ubicacion_id: null,
        ubicacion_nombre: 'Bodega central',
        producto_id: 'p1',
        producto_codigo: 'PRD-001',
        producto_nombre: 'Producto 1',
        cantidad_actual: 10,
        costo_unitario_ref: 1000,
        precio_venta_ref: 1500,
        valor_costo_total: 10000,
        valor_venta_total: 15000,
        updated_at: null,
      },
      {
        ubicacion_tipo: 'vitrina',
        ubicacion_id: 'v1',
        ubicacion_nombre: 'VIT-001 · PDV 1',
        producto_id: 'p2',
        producto_codigo: 'PRD-002',
        producto_nombre: 'Producto 2',
        cantidad_actual: 4,
        costo_unitario_ref: 500,
        precio_venta_ref: 900,
        valor_costo_total: 2000,
        valor_venta_total: 3600,
        updated_at: null,
      },
    ])

    expect(resumen).toEqual({
      totalUnidades: 14,
      totalCosto: 12000,
      totalVenta: 18600,
      margenPotencial: 6600,
    })
  })

  it('devuelve ceros con arreglo vacio', () => {
    expect(calcularResumenInventarioValorizado([])).toEqual({
      totalUnidades: 0,
      totalCosto: 0,
      totalVenta: 0,
      margenPotencial: 0,
    })
  })
})
