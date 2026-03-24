import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type InventarioValorizadoRow = Database['public']['Views']['inventario_valorizado']['Row']

export type InventarioValorizadoItem = {
  ubicacion_tipo: string
  ubicacion_id: string | null
  ubicacion_nombre: string
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  cantidad_actual: number
  costo_unitario_ref: number
  precio_venta_ref: number
  valor_costo_total: number
  valor_venta_total: number
  updated_at: string | null
}

export type ResumenInventarioValorizado = {
  totalUnidades: number
  totalCosto: number
  totalVenta: number
  margenPotencial: number
}

const QUERY_KEY = ['inventario_valorizado'] as const

function mapItem(row: InventarioValorizadoRow): InventarioValorizadoItem {
  return {
    ubicacion_tipo: row.ubicacion_tipo ?? '—',
    ubicacion_id: row.ubicacion_id ?? null,
    ubicacion_nombre: row.ubicacion_nombre ?? '—',
    producto_id: row.producto_id ?? '',
    producto_codigo: row.producto_codigo ?? '—',
    producto_nombre: row.producto_nombre ?? '—',
    cantidad_actual: row.cantidad_actual ?? 0,
    costo_unitario_ref: row.costo_unitario_ref ?? 0,
    precio_venta_ref: row.precio_venta_ref ?? 0,
    valor_costo_total: row.valor_costo_total ?? 0,
    valor_venta_total: row.valor_venta_total ?? 0,
    updated_at: row.updated_at ?? null,
  }
}

export function calcularResumenInventarioValorizado(
  rows: InventarioValorizadoItem[]
): ResumenInventarioValorizado {
  return rows.reduce<ResumenInventarioValorizado>(
    (acc, row) => ({
      totalUnidades: acc.totalUnidades + row.cantidad_actual,
      totalCosto: acc.totalCosto + row.valor_costo_total,
      totalVenta: acc.totalVenta + row.valor_venta_total,
      margenPotencial: acc.margenPotencial + (row.valor_venta_total - row.valor_costo_total),
    }),
    {
      totalUnidades: 0,
      totalCosto: 0,
      totalVenta: 0,
      margenPotencial: 0,
    }
  )
}

export function useInventarioValorizado() {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_valorizado')
        .select('*')
        .order('ubicacion_tipo')
        .order('ubicacion_nombre')
        .order('producto_nombre')

      if (error) throw new Error(error.message)

      return (data ?? []).map(mapItem)
    },
  })
}
