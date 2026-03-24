import { describe, expect, it } from 'vitest'
import {
  applyVisitDraftToRoute,
  applyVisitDraftToVisita,
  buildOfflineVisitDraft,
} from '@/lib/offline/drafts'
import type { VisitaDetalle } from '@/lib/hooks/useVisita'
import type { VisitaDelDia } from '@/lib/hooks/useRutaDelDia'

function buildVisitaDetalle(): VisitaDetalle {
  return {
    id: 'visita-1',
    estado: 'planificada',
    fecha_hora_inicio: null,
    colaboradoraId: 'user-1',
    pdvId: 'pdv-1',
    vitrinaId: 'vitrina-1',
    monto_calculado: 0,
    pdvNombre: 'Tienda Demo Norte',
    vitrinaCodigo: 'VIT-001',
    fotos: [],
    items: [
      {
        productoId: 'prod-1',
        nombre: 'Audifono',
        precioUnitario: 15000,
        invAnterior: 10,
        invActual: null,
        unidadesVendidas: 0,
        subtotal: 0,
        cantidadObjetivo: 12,
        stockColaboradora: 5,
      },
    ],
  }
}

function buildVisitaDelDia(): VisitaDelDia {
  return {
    id: 'visita-1',
    estado: 'planificada',
    fecha_hora_inicio: null,
    fecha_hora_fin: null,
    monto_calculado: 0,
    motivo_no_realizada: null,
    pdv: { nombre_comercial: 'Tienda Demo Norte', direccion: 'Cra 1 # 2-3' },
    ruta: { nombre: 'Ruta Norte' },
    orden_visita: 1,
  }
}

describe('offline drafts', () => {
  it('aplica un draft de conteo sobre la visita', () => {
    const visita = buildVisitaDetalle()
    const draft = buildOfflineVisitDraft(visita, {
      estado: 'en_ejecucion',
      fechaHoraInicio: '2026-03-23T10:00:00.000Z',
      items: [{ productoId: 'prod-1', invActual: 7 }],
    })

    const merged = applyVisitDraftToVisita(visita, draft)

    expect(merged.estado).toBe('en_ejecucion')
    expect(merged.fecha_hora_inicio).toBe('2026-03-23T10:00:00.000Z')
    expect(merged.items[0].invActual).toBe(7)
    expect(merged.items[0].unidadesVendidas).toBe(3)
    expect(merged.items[0].subtotal).toBe(45000)
  })

  it('aplica el estado pendiente sobre la ruta del dia', () => {
    const visita = buildVisitaDetalle()
    const draft = buildOfflineVisitDraft(visita, {
      estado: 'no_realizada',
      motivoNoRealizada: 'Local cerrado',
    })

    const merged = applyVisitDraftToRoute(buildVisitaDelDia(), draft)

    expect(merged.estado).toBe('no_realizada')
    expect(merged.motivo_no_realizada).toBe('Local cerrado')
    expect(merged.syncStatus).toBe('pending')
  })
})
