import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type InventarioVitrinaRow = {
  producto_id: string
  nombre: string
  codigo: string
  cantidad_objetivo: number | null
  cantidad_actual: number
  diferencia: number
  estado: 'ok' | 'bajo' | 'vacio'
}

export function useInventarioVitrina(vitrinaId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['inventario_vitrina', vitrinaId] as const,
    queryFn: async () => {
      // Dos queries independientes: posible inconsistencia si hay movimiento entre ambas.
      // Aceptable para Sprint 2; en fases futuras considerar vista SQL o RPC.
      const { data: surtido, error: eSurtido } = await supabase
        .from('surtido_estandar')
        .select('producto_id, cantidad_objetivo, productos(nombre, codigo)')
        .eq('vitrina_id', vitrinaId)
      if (eSurtido) throw new Error(eSurtido.message)

      const { data: stock, error: eStock } = await supabase
        .from('inventario_vitrina')
        .select('producto_id, cantidad_actual')
        .eq('vitrina_id', vitrinaId)
      if (eStock) throw new Error(eStock.message)

      const stockMap = new Map(stock?.map((s) => [s.producto_id, s.cantidad_actual]) ?? [])

      return (surtido ?? []).map((s): InventarioVitrinaRow => {
        const actual = stockMap.get(s.producto_id) ?? 0
        const objetivo = s.cantidad_objetivo
        const diferencia = (objetivo ?? 0) - actual
        const estado: InventarioVitrinaRow['estado'] =
          actual === 0 ? 'vacio' : actual < (objetivo ?? 0) ? 'bajo' : 'ok'
        return {
          producto_id: s.producto_id,
          nombre: (s.productos as { nombre: string; codigo: string } | null)?.nombre ?? '—',
          codigo: (s.productos as { nombre: string; codigo: string } | null)?.codigo ?? '—',
          cantidad_objetivo: objetivo,
          cantidad_actual: actual,
          diferencia,
          estado,
        }
      })
    },
    enabled: !!vitrinaId,
  })
}
