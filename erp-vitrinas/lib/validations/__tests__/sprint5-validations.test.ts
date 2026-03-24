import { describe, expect, it } from 'vitest'
import { bajaInventarioSchema } from '../inventario'
import { actualizarIncidenciaSchema, crearIncidenciaSchema } from '../incidencias'

const UUID = '00000000-0000-0000-0000-000000000001'

describe('bajaInventarioSchema', () => {
  it('acepta baja desde central sin origen_id', () => {
    const result = bajaInventarioSchema.safeParse({
      origen_tipo: 'central',
      producto_id: UUID,
      cantidad: '2',
      motivo_baja: 'perdida',
      notas: 'Conteo de ajuste',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza baja desde vitrina sin origen_id', () => {
    const result = bajaInventarioSchema.safeParse({
      origen_tipo: 'vitrina',
      origen_id: '',
      producto_id: UUID,
      cantidad: '2',
      motivo_baja: 'robo',
    })

    expect(result.success).toBe(false)
  })

  it('convierte origen_id vacio a undefined para luego validarlo', () => {
    const result = bajaInventarioSchema.safeParse({
      origen_tipo: 'central',
      origen_id: '',
      producto_id: UUID,
      cantidad: '1',
      motivo_baja: 'dano',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.origen_id).toBeUndefined()
    }
  })

  it('rechaza cantidades no positivas', () => {
    const result = bajaInventarioSchema.safeParse({
      origen_tipo: 'central',
      producto_id: UUID,
      cantidad: '0',
      motivo_baja: 'perdida',
    })

    expect(result.success).toBe(false)
  })
})

describe('crearIncidenciaSchema', () => {
  it('acepta una incidencia valida', () => {
    const result = crearIncidenciaSchema.safeParse({
      tipo: 'robo',
      descripcion: 'Se detectaron faltantes al abrir la vitrina.',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza descripciones demasiado cortas', () => {
    const result = crearIncidenciaSchema.safeParse({
      tipo: 'otro',
      descripcion: 'mal',
    })

    expect(result.success).toBe(false)
  })
})

describe('actualizarIncidenciaSchema', () => {
  it('exige resolucion al pasar a resuelta', () => {
    const result = actualizarIncidenciaSchema.safeParse({
      estado: 'resuelta',
      responsable_id: UUID,
      resolucion: '',
    })

    expect(result.success).toBe(false)
  })

  it('exige resolucion al pasar a cerrada', () => {
    const result = actualizarIncidenciaSchema.safeParse({
      estado: 'cerrada',
      resolucion: '   ',
    })

    expect(result.success).toBe(false)
  })

  it('acepta transicion con resolucion y responsable opcional vacio', () => {
    const result = actualizarIncidenciaSchema.safeParse({
      estado: 'resuelta',
      responsable_id: '',
      resolucion: 'Se contacto al comercio y se cerro el caso.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.responsable_id).toBeUndefined()
    }
  })
})
