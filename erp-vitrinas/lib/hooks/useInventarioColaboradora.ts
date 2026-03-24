import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TransferenciaInventarioInput } from '@/lib/validations/inventario'

export type InventarioColaboradoraItem = {
  colaboradora_id: string
  producto_id: string
  cantidad_actual: number
  updated_at: string
  colaboradora_nombre: string
  producto_nombre: string
  producto_codigo: string
}

const QUERY_KEY = ['inventario_colaboradora'] as const

export function useInventarioColaboradora() {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_colaboradora')
        .select(`
          colaboradora_id,
          producto_id,
          cantidad_actual,
          updated_at,
          usuarios!inventario_colaboradora_colaboradora_id_fkey(nombre),
          productos(nombre, codigo)
        `)
        .order('updated_at', { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => {
        const colaboradora = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios
        const producto = Array.isArray(row.productos) ? row.productos[0] : row.productos

        return {
          colaboradora_id: row.colaboradora_id,
          producto_id: row.producto_id,
          cantidad_actual: row.cantidad_actual,
          updated_at: row.updated_at,
          colaboradora_nombre: colaboradora?.nombre ?? '—',
          producto_nombre: producto?.nombre ?? '—',
          producto_codigo: producto?.codigo ?? '—',
        } as InventarioColaboradoraItem
      })
    },
  })
}

export function useTransferirInventarioColaboradora() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TransferenciaInventarioInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const rows = values.items.map((item) => ({
        tipo: 'carga_colaboradora' as const,
        direccion: 'salida' as const,
        origen_tipo: 'central' as const,
        destino_tipo: 'colaboradora' as const,
        destino_id: values.colaboradora_id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        referencia_tipo: 'transferencia_colaboradora',
        usuario_id: user?.id ?? null,
      }))

      const { error } = await supabase.from('movimientos_inventario').insert(rows)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['inventario_central'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos_inventario'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_valorizado'] })
    },
  })
}
