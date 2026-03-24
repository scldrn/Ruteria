import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { BajaInventarioInput } from '@/lib/validations/inventario'
import { getBusinessDayUtcRange } from '@/lib/dates'

type MovimientoDetalleRow = Database['public']['Views']['movimientos_inventario_detalle']['Row']

export type FiltrosMovimientosInventario = {
  fechaDesde?: string
  fechaHasta?: string
  productoId?: string
  vitrinaId?: string
  tipo?: string
}

export type MovimientoInventarioDetalle = {
  id: string
  created_at: string
  tipo: string
  direccion: string
  origen_tipo: string | null
  origen_id: string | null
  origen_label: string
  destino_tipo: string | null
  destino_id: string | null
  destino_label: string
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  cantidad: number
  costo_unitario: number | null
  motivo_baja: string | null
  referencia_tipo: string | null
  referencia_id: string | null
  usuario_id: string | null
  usuario_nombre: string
  notas: string | null
}

const QUERY_KEY = ['movimientos_inventario'] as const

function mapMovimiento(row: MovimientoDetalleRow): MovimientoInventarioDetalle {
  return {
    id: row.id ?? crypto.randomUUID(),
    created_at: row.created_at ?? new Date(0).toISOString(),
    tipo: row.tipo ?? '—',
    direccion: row.direccion ?? '—',
    origen_tipo: row.origen_tipo,
    origen_id: row.origen_id,
    origen_label: row.origen_label ?? '—',
    destino_tipo: row.destino_tipo,
    destino_id: row.destino_id,
    destino_label: row.destino_label ?? '—',
    producto_id: row.producto_id ?? '',
    producto_codigo: row.producto_codigo ?? '—',
    producto_nombre: row.producto_nombre ?? '—',
    cantidad: row.cantidad ?? 0,
    costo_unitario: row.costo_unitario ?? null,
    motivo_baja: row.motivo_baja ?? null,
    referencia_tipo: row.referencia_tipo ?? null,
    referencia_id: row.referencia_id ?? null,
    usuario_id: row.usuario_id ?? null,
    usuario_nombre: row.usuario_nombre ?? '—',
    notas: row.notas ?? null,
  }
}

export function useMovimientosInventario(filtros: FiltrosMovimientosInventario = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...QUERY_KEY, filtros],
    queryFn: async () => {
      let query = supabase
        .from('movimientos_inventario_detalle')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (filtros.productoId) {
        query = query.eq('producto_id', filtros.productoId)
      }

      if (filtros.tipo) {
        query = query.eq('tipo', filtros.tipo)
      }

      if (filtros.fechaDesde) {
        const { start } = getBusinessDayUtcRange(filtros.fechaDesde)
        query = query.gte('created_at', start)
      }

      if (filtros.fechaHasta) {
        const { end } = getBusinessDayUtcRange(filtros.fechaHasta)
        query = query.lt('created_at', end)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      const movimientos = (data ?? []).map(mapMovimiento)

      if (!filtros.vitrinaId) {
        return movimientos
      }

      return movimientos.filter((item) =>
        (item.origen_tipo === 'vitrina' && item.origen_id === filtros.vitrinaId)
        || (item.destino_tipo === 'vitrina' && item.destino_id === filtros.vitrinaId)
      )
    },
  })
}

export function useRegistrarBajaInventario() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: BajaInventarioInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from('movimientos_inventario').insert({
        tipo: 'baja',
        direccion: 'salida',
        origen_tipo: values.origen_tipo,
        origen_id: values.origen_tipo === 'central' ? null : values.origen_id ?? null,
        producto_id: values.producto_id,
        cantidad: values.cantidad,
        motivo_baja: values.motivo_baja,
        notas: values.notas ?? null,
        referencia_tipo: 'baja_manual',
        usuario_id: user?.id ?? null,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario_central'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_colaboradora'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_vitrina'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['inventario_valorizado'] })
      queryClient.invalidateQueries({ queryKey: ['visita'] })
    },
  })
}
