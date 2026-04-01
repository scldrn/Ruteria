import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import type { Database } from '@/lib/supabase/database.types'
import type { CrearCompraInput, RecibirCompraInput } from '@/lib/validations/compras'

export type Compra = Database['public']['Tables']['compras']['Row'] & {
  proveedor_nombre: string
  lineas: Array<
    Database['public']['Tables']['detalle_compra']['Row'] & {
      producto_nombre: string
      producto_codigo: string | null
      subtotal_estimado: number
      subtotal_real: number
    }
  >
}

const QUERY_KEY = ['compras'] as const

type MaybeArray<T> = T | T[] | null

function firstOrNull<T>(value: MaybeArray<T>): T | null {
  if (value === null || value === undefined) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function useCompras() {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Compra[]> => {
      const { data, error } = await supabase
        .from('compras')
        .select(`
          *,
          proveedores(nombre),
          detalle_compra(*, productos(nombre, codigo))
        `)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      return (data ?? []).map((compra) => {
        const proveedor = firstOrNull(
          (compra as typeof compra & { proveedores?: MaybeArray<{ nombre: string }> }).proveedores ?? null
        )

        const lineas = (
          (compra as typeof compra & {
            detalle_compra?: Array<
              Database['public']['Tables']['detalle_compra']['Row'] & {
                productos?: MaybeArray<{ nombre: string; codigo: string }>
              }
            >
          }).detalle_compra ?? []
        ).map((linea) => {
          const producto = firstOrNull(linea.productos ?? null)

          return {
            ...linea,
            producto_nombre: producto?.nombre ?? '—',
            producto_codigo: producto?.codigo ?? null,
            subtotal_estimado: linea.cantidad_pedida * Number(linea.costo_unitario ?? 0),
            subtotal_real: linea.cantidad_recibida * Number(linea.costo_unitario ?? 0),
          }
        })

        return {
          ...compra,
          proveedor_nombre: proveedor?.nombre ?? '—',
          lineas,
        }
      }) as Compra[]
    },
  })
}

export function useCrearCompra() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CrearCompraInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const totalEstimado = input.lineas.reduce(
        (sum, linea) => sum + linea.cantidad_pedida * Number(linea.costo_unitario ?? 0),
        0
      )

      const lineasJson = input.lineas.map((linea) => ({
        producto_id: linea.producto_id,
        cantidad_pedida: linea.cantidad_pedida,
        costo_unitario: linea.costo_unitario ?? null,
      }))

      // RPC atómica: cabecera + líneas en una sola transacción (M-02)
      // Usar `as never` porque crear_compra no está aún en database.types.ts
      const { data, error } = await supabase.rpc('crear_compra' as never, {
        p_proveedor_id: input.proveedor_id,
        p_fecha: input.fecha,
        p_notas: input.notas ?? null,
        p_total_estimado: totalEstimado,
        p_created_by: user?.id ?? null,
        p_lineas: lineasJson,
      } as never)

      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useConfirmarCompra() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (compraId: string) => {
      const { error } = await supabase
        .from('compras')
        .update({ estado: 'confirmada', updated_at: new Date().toISOString() })
        .eq('id', compraId)
        .eq('estado', 'pendiente')

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useCancelarCompra() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (compraId: string) => {
      const { error } = await supabase
        .from('compras')
        .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
        .eq('id', compraId)
        .in('estado', ['pendiente', 'confirmada'])

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useRecibirCompra() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      compraId,
      input,
    }: {
      compraId: string
      input: RecibirCompraInput
    }) => {
      const { error } = await supabase.rpc('recibir_compra', {
        p_compra_id: compraId,
        p_items: input.items as Json,
      })

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
