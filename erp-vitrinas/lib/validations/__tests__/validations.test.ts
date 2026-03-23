import { describe, it, expect } from 'vitest'
import { productoSchema } from '../productos'
import { categoriaSchema } from '../categorias'
import { puntoDeVentaSchema } from '../puntos-de-venta'
import { usuarioCreateSchema } from '../usuarios'
import { entradaInventarioSchema } from '../inventario'
import { rutaSchema } from '../rutas'

const UUID = '00000000-0000-0000-0000-000000000001'

describe('productoSchema', () => {
  const base = {
    codigo: 'AUD-001',
    nombre: 'Audífono Bluetooth X1',
    categoria_id: UUID,
    costo_compra: 15000,
    precio_venta_comercio: 25000,
    unidad_medida: 'unidad',
    estado: 'activo' as const,
  }

  it('valida un producto correcto', () => {
    expect(productoSchema.safeParse(base).success).toBe(true)
  })

  it('falla cuando precio_venta < costo_compra', () => {
    const result = productoSchema.safeParse({ ...base, precio_venta_comercio: 10000 })
    expect(result.success).toBe(false)
    const err = result as { success: false; error: { issues: { path: string[] }[] } }
    expect(err.error.issues[0].path).toContain('precio_venta_comercio')
  })

  it('falla con codigo vacío', () => {
    expect(productoSchema.safeParse({ ...base, codigo: '' }).success).toBe(false)
  })

  it('falla con categoria_id inválido', () => {
    expect(productoSchema.safeParse({ ...base, categoria_id: 'no-uuid' }).success).toBe(false)
  })

  it('acepta descripcion opcional ausente', () => {
    const { descripcion: _, ...sinDesc } = { ...base, descripcion: undefined }
    expect(productoSchema.safeParse(sinDesc).success).toBe(true)
  })
})

describe('categoriaSchema', () => {
  it('valida categoría correcta', () => {
    expect(categoriaSchema.safeParse({ nombre: 'Audífonos' }).success).toBe(true)
  })
  it('falla con nombre vacío', () => {
    expect(categoriaSchema.safeParse({ nombre: '' }).success).toBe(false)
  })
})

describe('puntoDeVentaSchema', () => {
  const base = {
    codigo: 'PDV-001',
    nombre_comercial: 'Tienda El Centro',
    zona_id: UUID,
  }
  it('valida PDV mínimo válido', () => {
    expect(puntoDeVentaSchema.safeParse(base).success).toBe(true)
  })
  it('falla con forma_pago_preferida inválida', () => {
    expect(puntoDeVentaSchema.safeParse({ ...base, forma_pago_preferida: 'bitcoin' }).success).toBe(false)
  })
  it('acepta forma_pago_preferida válida', () => {
    expect(puntoDeVentaSchema.safeParse({ ...base, forma_pago_preferida: 'nequi' }).success).toBe(true)
  })
})

describe('usuarioCreateSchema', () => {
  it('valida usuario correcto', () => {
    expect(usuarioCreateSchema.safeParse({
      nombre: 'María García',
      email: 'maria@ejemplo.com',
      password: 'secreto123',
      rol: 'colaboradora',
    }).success).toBe(true)
  })
  it('falla con rol inválido', () => {
    expect(usuarioCreateSchema.safeParse({
      nombre: 'María',
      email: 'maria@ejemplo.com',
      password: 'secreto123',
      rol: 'superadmin',
    }).success).toBe(false)
  })
  it('falla con email inválido', () => {
    expect(usuarioCreateSchema.safeParse({
      nombre: 'María',
      email: 'no-es-email',
      password: 'secreto123',
      rol: 'colaboradora',
    }).success).toBe(false)
  })
})

describe('entradaInventarioSchema', () => {
  it('convierte costo_unitario vacio a undefined', () => {
    const result = entradaInventarioSchema.parse({
      producto_id: UUID,
      cantidad: '3',
      costo_unitario: '',
    })

    expect(result.costo_unitario).toBeUndefined()
  })
})

describe('rutaSchema', () => {
  it('acepta dias_visita completos compatibles con el scheduler', () => {
    expect(rutaSchema.safeParse({
      codigo: 'RUT-001',
      nombre: 'Ruta Norte',
      colaboradora_id: UUID,
      dias_visita: ['lunes', 'miercoles'],
    }).success).toBe(true)
  })

  it('rechaza abreviaturas invalidas en dias_visita', () => {
    expect(rutaSchema.safeParse({
      codigo: 'RUT-001',
      nombre: 'Ruta Norte',
      colaboradora_id: UUID,
      dias_visita: ['lun'],
    }).success).toBe(false)
  })
})
