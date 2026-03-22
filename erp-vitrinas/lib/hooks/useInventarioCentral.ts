import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { EntradaInventarioInput } from '@/lib/validations/inventario'

// Tipo completo con producto y categoría anidados
export type InventarioCentralItem = {
  id: string
  producto_id: string
  cantidad_actual: number
  costo_promedio: number | null
  fecha_actualizacion: string
  productos: {
    nombre: string
    codigo: string
    costo_compra: number | null
    categorias: { nombre: string } | null
  } | null
  // Campo calculado: valor total en inventario
  valor_total: number
}

const QUERY_KEY = ['inventario_central'] as const

export function useInventarioCentral() {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_central')
        .select('*, productos(nombre, codigo, costo_compra, categorias(nombre))')
        .order('fecha_actualizacion', { ascending: false })

      if (error) throw new Error(error.message)

      // Calcular valor_total por cada ítem usando costo_promedio del inventario o costo_compra del producto
      return (data ?? []).map((item) => {
        const costo = item.costo_promedio ?? item.productos?.costo_compra ?? 0
        return {
          ...item,
          valor_total: item.cantidad_actual * Number(costo),
        } as InventarioCentralItem
      })
    },
  })
}

export function useRegistrarEntrada() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: EntradaInventarioInput) => {
      const { error } = await supabase.from('movimientos_inventario').insert({
        tipo: 'compra',
        direccion: 'entrada',
        destino_tipo: 'central',
        producto_id: values.producto_id,
        cantidad: values.cantidad,
        costo_unitario: values.costo_unitario ?? null,
        notas: values.notas ?? null,
      })
      if (error) throw new Error(error.message)
    },
    // Invalidar caché de inventario central al registrar una entrada
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
